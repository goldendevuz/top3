import asyncio
from app.database import engine
from sqlalchemy import text

async def main():
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE domains ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE"))
            print("Added is_deleted to domains")
        except Exception as e:
            print("is_deleted may already exist:", e)
        
        try:
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS domain_clicks (
                    id SERIAL PRIMARY KEY,
                    domain_id INTEGER NOT NULL REFERENCES domains(id),
                    device_id VARCHAR NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            """))
            print("Created domain_clicks table")
        except Exception as e:
            print("Failed to create domain_clicks:", e)

if __name__ == "__main__":
    asyncio.run(main())
