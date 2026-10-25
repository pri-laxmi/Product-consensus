
from functools import lru_cache

from sentence_transformers import SentenceTransformer


MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"


@lru_cache(maxsize=1)
def get_model() -> SentenceTransformer:
    """Load the embedding model once per backend process."""
    return SentenceTransformer(MODEL_NAME)


def generate_embedding(text: str) -> list[float]:
    """Convert text into a normalized 384-dimensional vector."""
    if not text or not text.strip():
        raise ValueError("Text cannot be empty.")

    vector = get_model().encode(
        text.strip(),
        normalize_embeddings=True,
        convert_to_numpy=True,
    )

    return vector.tolist()


def generate_embeddings(texts: list[str]) -> list[list[float]]:
    """Generate embeddings in a batch."""
    cleaned = [text.strip() for text in texts]

    if any(not text for text in cleaned):
        raise ValueError("Texts cannot contain empty values.")

    vectors = get_model().encode(
        cleaned,
        normalize_embeddings=True,
        convert_to_numpy=True,
        batch_size=32,
    )

    return vectors.tolist()
