import unittest

from token_dashboard.pricing import PricingTable


class PricingTests(unittest.TestCase):
    def setUp(self):
        self.table = PricingTable(
            {
                "models": {
                    "test-model": {
                        "input": 2.0,
                        "cached_input": 0.5,
                        "cache_write": 3.0,
                        "output": 8.0,
                    }
                }
            }
        )

    def test_estimate_uses_disjoint_input_cache_write_and_output(self):
        result = self.table.estimate(
            "test-model",
            {
                "input_tokens": 1_000_000,
                "cached_input_tokens": 200_000,
                "cache_write_input_tokens": 100_000,
                "output_tokens": 100_000,
                "reasoning_output_tokens": 80_000,
            },
        )
        self.assertAlmostEqual(result.value, 2.6)
        self.assertEqual(result.reason, "estimated_standard_api_rate")

    def test_unknown_model_is_not_guessed(self):
        result = self.table.estimate("private-model", {"input_tokens": 100})
        self.assertIsNone(result.value)
        self.assertEqual(result.reason, "model_price_unknown")


if __name__ == "__main__":
    unittest.main()

