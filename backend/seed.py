"""
seed.py — Seed the database with sample customers and sources for development.
Run: python seed.py
"""
import asyncio
from database import init_db, AsyncSessionLocal, Customer, Source, Change


SAMPLE_CUSTOMERS = [
    {
        "id": "cust_1",
        "name": "Acme Corp",
        "country": "UK",
        "visa_type": "Skilled Worker",
        "stage": "Pre-Approval",
        "contact": "hr@acme.com",
        "language": "en",
    },
    {
        "id": "cust_2",
        "name": "Global Tech",
        "country": "UK",
        "visa_type": "Skilled Worker",
        "stage": "Active",
        "contact": "mobility@globaltech.com",
        "language": "en",
    },
    {
        "id": "cust_3",
        "name": "Sunrise Solutions",
        "country": "UK",
        "visa_type": "Graduate",
        "stage": "Post-Approval",
        "contact": "hr@sunrise.io",
        "language": "en",
    },
]


async def seed():
    await init_db()

    async with AsyncSessionLocal() as db:
        from sqlalchemy import select

        for cdata in SAMPLE_CUSTOMERS:
            exists = await db.execute(select(Customer).where(Customer.id == cdata["id"]))
            if not exists.scalar_one_or_none():
                db.add(Customer(**cdata))

        await db.commit()
        print("✅ Seed complete")


if __name__ == "__main__":
    asyncio.run(seed())
