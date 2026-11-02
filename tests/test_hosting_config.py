import tempfile
import unittest
from pathlib import Path

from flask import Flask
from sqlalchemy.pool import NullPool

from hosting_config import configure


class HostingConfigTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.env = {
            "VERCEL": "1",
            "SECRET_KEY": "s" * 48,
            "ADMIN_PASSWORD": "unique-password-for-tests",
            "DATABASE_URL": "postgres://postgres.project:test@pooler.example:6543/postgres",
        }

    def config(self, env):
        app = Flask(__name__)
        configure(app, env, self.root)
        return app.config

    def test_local_sqlite_still_works(self):
        config = self.config({})
        self.assertTrue((self.root / "instance").is_dir())
        self.assertTrue(config["SQLALCHEMY_DATABASE_URI"].startswith("sqlite:///"))
        self.assertFalse(config["SESSION_COOKIE_SECURE"])

    def test_hosted_requires_database(self):
        self.env.pop("DATABASE_URL")
        with self.assertRaisesRegex(RuntimeError, "DATABASE_URL is required"):
            self.config(self.env)
        self.assertFalse((self.root / "instance").exists())

    def test_hosted_rejects_sqlite(self):
        self.env["DATABASE_URL"] = "sqlite:///:memory:"
        with self.assertRaisesRegex(RuntimeError, "require PostgreSQL"):
            self.config(self.env)

    def test_hosted_rejects_default_secrets(self):
        for key in ("SECRET_KEY", "ADMIN_PASSWORD"):
            with self.subTest(key=key):
                env = self.env.copy()
                env.pop(key)
                with self.assertRaisesRegex(RuntimeError, key):
                    self.config(env)

    def test_transaction_pool_configuration(self):
        config = self.config(self.env)
        url = config["SQLALCHEMY_DATABASE_URI"]
        self.assertEqual(url.drivername, "postgresql+psycopg")
        self.assertEqual(url.port, 6543)
        self.assertEqual(url.query["sslmode"], "require")
        options = config["SQLALCHEMY_ENGINE_OPTIONS"]
        self.assertIs(options["poolclass"], NullPool)
        self.assertIsNone(options["connect_args"]["prepare_threshold"])
        self.assertTrue(config["SESSION_COOKIE_SECURE"])

    def test_stronger_ssl_mode_is_preserved(self):
        self.env["DATABASE_URL"] += "?sslmode=verify-full"
        config = self.config(self.env)
        self.assertEqual(config["SQLALCHEMY_DATABASE_URI"].query["sslmode"], "verify-full")

    def test_production_outside_vercel_uses_same_guards(self):
        with self.assertRaisesRegex(RuntimeError, "SECRET_KEY"):
            self.config({"APP_ENV": "production"})


if __name__ == "__main__":
    unittest.main()
