
from consensus import process_sources


sample_sources = [
    {
        "title": "Review A",
        "url": "https://example.com/review-a",
        "evidence": [
            {
                "source_type": "professional_review",
                "is_product_relevant": True,
                "aspect": "Noise cancellation",
                "sentiment": "positive",
                "claim": "The noise cancellation is excellent.",
                "evidence_excerpt": "Excellent noise cancellation.",
                "confidence": 0.95,
            },
            {
                "source_type": "professional_review",
                "is_product_relevant": True,
                "aspect": "Price",
                "sentiment": "negative",
                "claim": "The headphones are expensive.",
                "evidence_excerpt": "They are expensive.",
                "confidence": 0.90,
            },
        ],
    },
    {
        "title": "Review B",
        "url": "https://example.com/review-b",
        "evidence": [
            {
                "source_type": "customer_review",
                "is_product_relevant": True,
                "aspect": "Noise cancellation",
                "sentiment": "positive",
                "claim": "The noise cancellation is excellent.",
                "evidence_excerpt": "Excellent noise cancellation.",
                "confidence": 0.88,
            },
        ],
    },
]


result = process_sources(sample_sources)

print("Unique evidence:", result["unique_evidence_count"])
print("Duplicates removed:", result["duplicate_evidence_count"])
print("Aspect count:", result["aspect_count"])

for aspect in result["aspect_summaries"]:
    print(
        aspect["aspect"],
        aspect["sentiment_counts"],
        "Sources:",
        aspect["independent_source_count"],
    )
