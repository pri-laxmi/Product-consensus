
from sqlalchemy import select

from database import SessionLocal
from embeddings import generate_embeddings

# Change this import if your file is named models.py.
from model import Evidence


BATCH_SIZE = 32


def backfill_embeddings():
    total_updated = 0

    while True:
        with SessionLocal() as db:
            records = db.scalars(
                select(Evidence)
                .where(Evidence.embedding.is_(None))
                .order_by(Evidence.id)
                .limit(BATCH_SIZE)
            ).all()

            if not records:
                break

            texts = [
                (
                    f"Aspect: {item.aspect}\n"
                    f"Claim: {item.claim}\n"
                    f"Evidence: {item.evidence_excerpt}"
                )
                for item in records
            ]

            vectors = generate_embeddings(texts)

            for item, vector in zip(records, vectors):
                item.embedding = vector

            db.commit()
            total_updated += len(records)

            print(
                f"Updated {total_updated} evidence records..."
            )

    print(f"Backfill complete. Updated {total_updated} records.")


if __name__ == "__main__":
    backfill_embeddings()
