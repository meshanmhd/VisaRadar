"""
routers/customers.py — CRUD for Customer records.

Endpoints:
  GET  /customers       → list all customers
  POST /customers       → add a new customer
  GET  /customers/{id}  → get one customer
  PUT  /customers/{id}  → update customer
  DELETE /customers/{id}→ delete customer
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from database import get_db, Customer
from schemas import CustomerOut, CustomerCreate

router = APIRouter(prefix="/customers", tags=["Customers"])


def _to_schema(c: Customer) -> CustomerOut:
    return CustomerOut(
        id=c.id,
        name=c.name,
        country=c.country,
        visa_type=c.visa_type,
        stage=c.stage,
        contact=c.contact,
        language=c.language,
    )


@router.get("", response_model=List[CustomerOut])
async def list_customers(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Customer).order_by(Customer.name))
    return [_to_schema(c) for c in result.scalars().all()]


@router.get("/{customer_id}", response_model=CustomerOut)
async def get_customer(customer_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Customer).where(Customer.id == customer_id))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(404, "Customer not found")
    return _to_schema(c)


@router.post("", response_model=CustomerOut, status_code=201)
async def create_customer(body: CustomerCreate, db: AsyncSession = Depends(get_db)):
    customer = Customer(**body.model_dump())
    db.add(customer)
    await db.commit()
    await db.refresh(customer)
    return _to_schema(customer)


@router.put("/{customer_id}", response_model=CustomerOut)
async def update_customer(
    customer_id: str,
    body: CustomerCreate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Customer).where(Customer.id == customer_id))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(404, "Customer not found")

    for k, v in body.model_dump().items():
        setattr(c, k, v)

    await db.commit()
    await db.refresh(c)
    return _to_schema(c)


@router.delete("/{customer_id}", status_code=204)
async def delete_customer(customer_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Customer).where(Customer.id == customer_id))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(404, "Customer not found")
    await db.delete(c)
    await db.commit()
