import unittest

from token_dashboard.__main__ import parser


class CliParserTests(unittest.TestCase):
    def test_serve_defaults_to_lan_listener(self):
        args = parser().parse_args(["serve"])
        self.assertEqual(args.host, "0.0.0.0")
        self.assertEqual(args.port, 8888)

    def test_serve_help_describes_unauthenticated_network_access(self):
        serve = parser()._subparsers._group_actions[0].choices["serve"]
        help_text = serve.format_help()
        self.assertIn("default: 0.0.0.0", help_text)
        self.assertIn("default: 8888", help_text)
        self.assertIn("unauthenticated", help_text)


if __name__ == "__main__":
    unittest.main()
