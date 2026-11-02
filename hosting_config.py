"""Configuration shared by local Flask and Vercel deployments."""

from sqlalchemy.engine import make_url
from sqlalchemy.pool import NullPool


def configure(app, env, base_dir):
    hosted = env.get("VERCEL") == "1" or env.get("APP_ENV") == "production"
    secret = env.get("SECRET_KEY", "dev-secret-change-me")
    password = env.get("ADMIN_PASSWORD", "italkofe-admin")
    if hosted:
        if len(secret) < 32 or secret.startswith("change-me"):
            raise RuntimeError("Set a random SECRET_KEY of at least 32 characters")
        if len(password) < 12 or password == "italkofe-admin" or password.startswith("change-me"):
            raise RuntimeError("Set a unique ADMIN_PASSWORD of at least 12 characters")

    raw_url = env.get("DATABASE_URL")
    if hosted and not raw_url:
        raise RuntimeError("DATABASE_URL is required for hosted deployments")
    if raw_url:
        try:
            url = make_url(raw_url)
        except Exception:
            raise RuntimeError("DATABASE_URL is invalid") from None
        if url.drivername in {"postgres", "postgresql"}:
            url = url.set(drivername="postgresql+psycopg")
        if hosted and url.drivername != "postgresql+psycopg":
            raise RuntimeError("Hosted deployments require PostgreSQL with psycopg")
        if hosted and url.query.get("sslmode") not in {"require", "verify-ca", "verify-full"}:
            url = url.update_query_dict({"sslmode": "require"})
        app.config["SQLALCHEMY_DATABASE_URI"] = url
        if url.drivername == "postgresql+psycopg":
            app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
                "poolclass": NullPool,
                "connect_args": {"prepare_threshold": None, "connect_timeout": 10},
            }
    else:
        (base_dir / "instance").mkdir(exist_ok=True)
        app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{base_dir / 'instance' / 'italkofe.db'}"

    app.config.update(
        SECRET_KEY=secret,
        ADMIN_PASSWORD=password,
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE="Lax",
        SESSION_COOKIE_SECURE=hosted,
        HOSTED=hosted,
    )
