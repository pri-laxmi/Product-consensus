
from database import SessionLocal
from retrieval import retrieve_evidence


with SessionLocal() as db:
    results = retrieve_evidence(
        db=db,
        product_name="Sony WH-1000XM5",
        question="Are these headphones comfortable for long listening sessions?",
        limit=5,
    )

    print(f"Retrieved {len(results)} evidence items")

    for index, item in enumerate(results, start=1):
        print(f"\n--- Result {index} ---")
        print("Aspect:", item["aspect"])
        print("Sentiment:", item["sentiment"])
        print("Claim:", item["claim"])
        print("Source:", item["source_url"])
