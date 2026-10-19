
import asyncio
import os

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from evidence import analyze_source

load_dotenv()

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
    # Limit Gemini calls in this first version to control cost.
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

            except Exception as exc:
                # Preserve the search result if analysis fails.
                print(
                    f"Evidence analysis failed for "
                    f"{source.get('url', 'unknown source')}: "
                    f"{type(exc).__name__}"
                )

                return {
                    **source,
                    "evidence": [],
                    "analysis_error": "Evidence analysis unavailable",
                }

    return await asyncio.gather(
        *(process_source(source) for source in sources)
    )

@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "product-consensus-api"}


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

        sources = sources[:10]  
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
        return{
            "product_name": product,
            "sources": analyzed_sources,
            "evidence_count": len(all_evidence),
            "evidence": all_evidence,
            "source_count": len(analyzed_sources),
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
