
import asyncio
import logging
import os

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ValidationError
from evidence import analyze_source
from consensus import process_sources
import re
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from database import SessionLocal
from model import Product, ResearchSession, Source, Evidence

load_dotenv()

logger = logging.getLogger(__name__)

app = FastAPI(title="Product Consensus AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
TAVILY_URL = "https://api.tavily.com/search"


class ResearchRequest(BaseModel):
    product_name: str = Field(min_length=2, max_length=200)


async def search_web(client: httpx.AsyncClient, query: str):
    response = await client.post(
        TAVILY_URL,
        json={
            "api_key": TAVILY_API_KEY,
            "query": query,
            "topic": "general",
            "search_depth": "basic",
            "max_results": 5,
        },
    )
    response.raise_for_status()
    data = response.json()

    return [
        {
            "title": item.get("title", ""),
            "url": item.get("url", ""),
            "content": item.get("content", ""),
            "score": item.get("score"),
        }
        for item in data.get("results", [])
    ]


async def analyze_results(product: str, sources: list[dict]):
    # Limit concurrent model calls to control provider usage.
    semaphore = asyncio.Semaphore(3)

    async def process_source(source: dict):
        async with semaphore:
            try:
                analysis = await analyze_source(
                    product_name=product,
                    title=source.get("title", ""),
                    url=source.get("url", ""),
                    content=source.get("content", ""),
                )

                return {
                    **source,
                    "evidence": [
                        item.model_dump()
                        for item in analysis.items
                    ],
                    "analysis_error": None,
                }

            except (
                httpx.HTTPStatusError,
                httpx.RequestError,
                RuntimeError,
                ValueError,
            ) as exc:
                analysis_error = "Evidence analysis unavailable."
                if isinstance(exc, httpx.HTTPStatusError):
                    status_code = exc.response.status_code
                    if status_code == 429:
                        analysis_error = (
                            "Groq API rate limit or quota reached. "
                            "Check your Groq account limits and try again."
                        )
                    elif status_code in (401, 403):
                        analysis_error = (
                            "Groq rejected the API key or model access. "
                            "Check GROQ_API_KEY and GROQ_MODEL in the backend environment."
                        )
                    elif status_code == 404:
                        analysis_error = (
                            "Groq could not find the configured model. "
                            "Set GROQ_MODEL to an active model, such as "
                            "openai/gpt-oss-120b, then restart the backend."
                        )
                    else:
                        analysis_error = (
                            f"Groq analysis request failed (HTTP {status_code})."
                        )
                    logger.warning(
                        "Groq evidence analysis failed for %s: HTTP %s",
                        source.get("url", "unknown source"),
                        status_code,
                    )
                elif isinstance(exc, httpx.RequestError):
                    analysis_error = "Could not connect to Groq for evidence analysis."
                    logger.warning(
                        "Groq evidence analysis failed for %s: %s",
                        source.get("url", "unknown source"),
                        type(exc).__name__,
                    )
                elif isinstance(exc, ValidationError):
                    issues = ", ".join(
                        f"{'.'.join(map(str, issue['loc']))}: {issue['type']}"
                        for issue in exc.errors(include_input=False)
                    )
                    logger.warning(
                        "Groq evidence response validation failed for %s: %s",
                        source.get("url", "unknown source"),
                        issues or "invalid response",
                    )
                    analysis_error = (
                        "Groq returned evidence in an invalid format. "
                        "Check the backend log for the failed field."
                    )
                else:
                    logger.warning(
                        "Evidence analysis failed for %s: %s",
                        source.get("url", "unknown source"),
                        type(exc).__name__,
                    )

                return {
                    **source,
                    "evidence": [],
                    "analysis_error": analysis_error,
                }

    return await asyncio.gather(
        *(process_source(source) for source in sources)
    )

@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "product-consensus-api"}


def save_research(
    product_name: str,
    analyzed_sources: list[dict],
) -> int:
    normalized_name = re.sub(
        r"\s+", " ", product_name.strip().lower()
    )

    with SessionLocal() as db:
        try:
            # Reuse an existing product or create one.
            product = db.scalar(
                select(Product).where(
                    Product.normalized_name == normalized_name
                )
            )

            if product is None:
                product = Product(
                    name=product_name.strip(),
                    normalized_name=normalized_name,
                )
                db.add(product)
                db.flush()

            # Each search gets a separate research session.
            research_session = ResearchSession(
                product_id=product.id,
                status="processing",
            )
            db.add(research_session)
            db.flush()

            # Persist every source, even when extraction failed.
            for source_data in analyzed_sources:
                url = source_data.get("url", "").strip()
                if not url:
                    continue

                source_items = source_data.get("evidence", [])

                source_type = (
                    source_items[0].get("source_type", "other")
                    if source_items
                    else "other"
                )

                source = Source(
                    research_session_id=research_session.id,
                    url=url,
                    title=(
                        source_data.get("title") or "Untitled source"
                    )[:500],
                    source_type=source_type,
                    content=source_data.get("content", ""),
                )
                db.add(source)
                db.flush()

                # Save extracted evidence linked to its source.
                for item in source_items:
                    db.add(
                        Evidence(
                            source_id=source.id,
                            aspect=item.get("aspect") or "general",
                            sentiment=item.get("sentiment", "uncertain"),
                            claim=item.get("claim", ""),
                            evidence_excerpt=item.get(
                                "evidence_excerpt", ""
                            ),
                            confidence=item.get("confidence", 0.0),
                            is_product_relevant=item.get(
                                "is_product_relevant", False
                            ),
                        )
                    )

            research_session.status = "completed"
            research_session.completed_at = datetime.now(timezone.utc)

            db.commit()
            return research_session.id

        except Exception:
            db.rollback()
            raise



@app.post("/api/research")
async def research(request: ResearchRequest):
    if not TAVILY_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="TAVILY_API_KEY is not configured.",
        )

    product = request.product_name.strip()

    if not product:
        raise HTTPException(
            status_code=422,
            detail="Product name cannot be empty.",
        )

    queries = [
        f"{product} customer reviews pros cons",
        f'site:reddit.com "{product}" review experience',
    ]

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            results = await asyncio.gather(
                *(search_web(client, query) for query in queries)
            )

        # Merge results and remove duplicate URLs.
        sources = []
        seen_urls = set()

        for group in results:
            for source in group:
                url = source["url"]

                if url and url not in seen_urls:
                    seen_urls.add(url)
                    sources.append(source)

        sources = sources[:3]
        analyzed_sources = await analyze_results(product, sources)
        all_evidence = [
            {
                **item,
                "source_title": source["title"],
                "source_url": source["url"],
            }
            for source in analyzed_sources
            for item in source["evidence"]
            if item["is_product_relevant"]
        ]
        consensus = process_sources(analyzed_sources)

        try:
            research_session_id = save_research(
                product_name=product,
                analyzed_sources=analyzed_sources,
            )
        except OperationalError as exc:
            logger.warning(
                "PostgreSQL is unavailable while saving research: %s",
                type(exc).__name__,
            )
            raise HTTPException(
                status_code=503,
                detail=(
                    "PostgreSQL is unavailable. Start the database with "
                    "`docker compose up -d db` and verify localhost:5433 is reachable."
                ),
            ) from exc
        except Exception:
            logger.exception("Failed to save research to PostgreSQL")
            raise HTTPException(
                status_code=500,
                detail="Research completed, but saving the results failed.",
            )

        return {
            "product_name": product,
            "research_session_id": research_session_id,
            "sources": analyzed_sources,
            "evidence_count": len(all_evidence),
            "evidence": all_evidence,
            "source_count": len(analyzed_sources),
            "consensus": consensus,
        }
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=502,
            detail="The web search provider returned an error.",
        ) from exc
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=502,
            detail="Could not connect to the web search provider.",
        ) from exc
