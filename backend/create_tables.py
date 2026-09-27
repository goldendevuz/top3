import asyncio
from app.database import engine, Base
from app import models  # noqa: import all models so they register

async def create_all():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tables created successfully!")
    await engine.dispose()

asyncio.run(create_all())
