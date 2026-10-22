
from sqlalchemy import text
from database import engine

try:
    with engine.connect() as connection:
        result = connection.execute(
            text("SELECT current_database(), version()")
        )
        database_name, version = result.fetchone()

        vector_version = connection.execute(
            text("""
                SELECT extversion
                FROM pg_extension
                WHERE extname = 'vector'
            """)
        ).scalar_one_or_none()

        print("Database connected:", database_name)
        print("PostgreSQL:", version.split(",")[0])
        print("pgvector version:", vector_version)

except Exception as exc:
    print("Database connection failed:", exc)
    raise
finally:
    engine.dispose()
