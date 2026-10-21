
import re
from collections import defaultdict


VALID_SENTIMENTS = {
    "positive",
    "negative",
    "neutral",
    "mixed",
    "uncertain",
}


def normalize_text(value: str) -> str:
    """Normalize text for simple duplicate detection."""
    value = value.lower().strip()
    value = re.sub(r"[^\w\s]", " ", value)
    return re.sub(r"\s+", " ", value)


def process_sources(sources: list[dict]) -> dict:
    """
    Flatten evidence from sources, remove exact duplicate claims,
    group evidence by aspect, and calculate sentiment statistics.
    """

    unique_evidence = []
    seen_claims = set()
    duplicate_count = 0

    # 1. Flatten evidence and remove duplicates.
    for source in sources:
        source_title = source.get("title", "Unknown source")
        source_url = source.get("url", "")

        for item in source.get("evidence", []):
            if not isinstance(item, dict):
                continue

            # Exclude evidence the model marked as irrelevant.
            if not item.get("is_product_relevant", False):
                continue

            claim = str(item.get("claim", "")).strip()
            aspect = str(item.get("aspect", "")).strip()
            sentiment = str(item.get("sentiment", "uncertain")).lower()

            if not claim or not aspect:
                continue

            if sentiment not in VALID_SENTIMENTS:
                sentiment = "uncertain"

            # Keep opposite opinions as separate evidence.
            dedup_key = (
                normalize_text(claim),
                normalize_text(aspect),
                sentiment,
            )

            if dedup_key in seen_claims:
                duplicate_count += 1
                continue

            seen_claims.add(dedup_key)

            unique_evidence.append({
                **item,
                "aspect": aspect,
                "sentiment": sentiment,
                "source_title": source_title,
                "source_url": source_url,
            })

    # 2. Group evidence by product aspect.
    grouped = defaultdict(list)

    for item in unique_evidence:
        aspect_key = normalize_text(item["aspect"])
        grouped[aspect_key].append(item)

    aspect_summaries = []

    # 3. Calculate sentiment statistics for each aspect.
    for items in grouped.values():
        sentiment_counts = {
            sentiment: 0
            for sentiment in VALID_SENTIMENTS
        }

        for item in items:
            sentiment_counts[item["sentiment"]] += 1

        total = len(items)
        scored_count = (
            sentiment_counts["positive"]
            + sentiment_counts["negative"]
            + sentiment_counts["neutral"]
            + sentiment_counts["mixed"]
        )

        positive_share = (
            round(sentiment_counts["positive"] / scored_count * 100, 1)
            if scored_count
            else None
        )

        negative_share = (
            round(sentiment_counts["negative"] / scored_count * 100, 1)
            if scored_count
            else None
        )

        source_urls = {
            item["source_url"]
            for item in items
            if item["source_url"]
        }

        aspect_summaries.append({
            "aspect": items[0]["aspect"],
            "evidence_count": total,
            "independent_source_count": len(source_urls),
            "sentiment_counts": sentiment_counts,
            "positive_share_percent": positive_share,
            "negative_share_percent": negative_share,
            "evidence": items,
        })

    aspect_summaries.sort(
        key=lambda item: item["evidence_count"],
        reverse=True,
    )

    # 4. Calculate overall sentiment counts.
    overall_counts = {
        sentiment: 0
        for sentiment in VALID_SENTIMENTS
    }

    for item in unique_evidence:
        overall_counts[item["sentiment"]] += 1

    return {
        "unique_evidence_count": len(unique_evidence),
        "duplicate_evidence_count": duplicate_count,
        "aspect_count": len(aspect_summaries),
        "overall_sentiment_counts": overall_counts,
        "aspect_summaries": aspect_summaries,
        "evidence": unique_evidence,
    }
