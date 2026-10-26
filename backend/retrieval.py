from sqlalchemy import select
from sqlalchemy.orm import Session
from sympy import product

from embeddings import generate_embedding
from model import Evidence, Source, ResearchSession, Product

def retrieve_evidence(
        db:Session,
        product_name:str,
        question:str,
        limit:int=5,

)->list[dict]:
    query_vector = generate_embedding(question)
    # Match evidence through its source and research session
    # so results belong to the requested product.
    statement = (select(Evidence,Source,Product)
    .join(Source,Evidence.source_id == Source.id)
    .join(ResearchSession,Source.research_session_id == ResearchSession.id)
    .join(Product,ResearchSession.product_id == Product.id)
    .where(
            Product.normalized_name == " ".join(
                product_name.strip().lower().split()
            ),
            Evidence.embedding.is_not(None),
        )
        .order_by(Evidence.embedding.cosine_distance(query_vector))
        .limit(max(1, min(limit, 20)))
    )
    rows = db.execute(statement).all()

    return [
        {
            "claim": evidence.claim,
            "aspect": evidence.aspect,
            "sentiment": evidence.sentiment,
            "evidence_excerpt": evidence.evidence_excerpt,
            "confidence": evidence.confidence,
            "source_title": source.title,
            "source_url": source.url,
            "product_name": product.name,
        }
        for evidence, source, product in rows
    ]
    