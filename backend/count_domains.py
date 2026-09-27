import asyncio
from app.database import engine
from sqlalchemy import text

async def main():
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT count(*) FROM domains"))
        print("DOMAINS COUNT:", res.scalar())

if __name__ == "__main__":
    asyncio.run(main())
