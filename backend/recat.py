import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import AsyncSessionLocal
from sqlalchemy.future import select
from app.models import Domain
from app.routers.seo import determine_category

async def recategorize():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(Domain))
        domains = res.scalars().all()
        for d in domains:
            if d.description:
                cat_text = d.name + " " + d.description
                new_cat = determine_category(cat_text)
                if new_cat != d.category:
                    print(f"Updating {d.name} from {d.category} to {new_cat}")
                    d.category = new_cat
        await db.commit()
        print("Done!")

if __name__ == "__main__":
    asyncio.run(recategorize())
