import json
import os
import unittest
from unittest.mock import Mock, patch

from evidence import analyze_source_sync


class AnalyzeSourceTests(unittest.TestCase):
    def test_sends_groq_request_and_parses_evidence(self):
        expected_item = {
            "source_type": "customer_review",
            "is_product_relevant": True,
            "aspect": "battery life",
            "sentiment": "positive",
            "claim": "The battery lasts all day.",
            "evidence_excerpt": "lasts all day",
            "confidence": 0.9,
        }
        response = Mock()
        response.json.return_value = {
            "choices": [
                {"message": {"content": json.dumps({"items": [expected_item]})}}
            ]
        }

        with (
            patch.dict(os.environ, {"GROQ_API_KEY": "test-key"}, clear=True),
            patch("evidence.MODEL_NAME", "test-model"),
            patch("evidence.httpx.post", return_value=response) as post,
        ):
            result = analyze_source_sync(
                product_name="Test headphones",
                title="A review",
                url="https://example.com/review",
                content="The battery lasts all day.",
            )

        self.assertEqual(result.items[0].claim, expected_item["claim"])
        self.assertEqual(
            post.call_args.kwargs["headers"]["Authorization"],
            "Bearer test-key",
        )
        self.assertEqual(post.call_args.kwargs["json"]["model"], "test-model")
        response_format = post.call_args.kwargs["json"]["response_format"]
        self.assertEqual(response_format["type"], "json_schema")
        self.assertTrue(response_format["json_schema"]["strict"])
        response.raise_for_status.assert_called_once_with()

    def test_requires_groq_api_key(self):
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaisesRegex(RuntimeError, "GROQ_API_KEY"):
                analyze_source_sync("Test product", "", "", "")


if __name__ == "__main__":
    unittest.main()
