
from evidence import analyze_source_sync


if __name__ == "__main__":
    analysis = analyze_source_sync(
        product_name="Test headphones",
        title="Smoke test source",
        url="https://example.com/review",
        content="The headphones are comfortable and have long battery life.",
    )
    print(f"Groq evidence extraction succeeded ({len(analysis.items)} item(s)).")
