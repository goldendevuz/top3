import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from .database import Base

class BoardType(str, enum.Enum):
    umumiy = "umumiy"
    bugun = "bugun"
    ochiq = "ochiq"

class TransactionStatus(str, enum.Enum):
    pending = "pending"
    paid = "paid"
    failed = "failed"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    google_id = Column(String, unique=True, index=True, nullable=False)
    telegram_id = Column(String, unique=True, index=True, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    domains = relationship("Domain", back_populates="owner")
    transactions = relationship("Transaction", back_populates="user")

class Domain(Base):
    __tablename__ = "domains"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False) # Only .uz domains
    description = Column(String, nullable=True)
    category = Column(String, nullable=True)
    is_admin_added = Column(Boolean, default=False)
    click_count = Column(Integer, default=0)
    current_price = Column(Integer, default=0)
    is_active = Column(Boolean, default=False)
    status = Column(String, default="pending")
    is_sponsored = Column(Boolean, default=False)
    sponsored_until = Column(DateTime(timezone=True), nullable=True)
    board_type = Column(Enum(BoardType), default=BoardType.umumiy)
    is_deleted = Column(Boolean, default=False)
    is_demo = Column(Boolean, default=False)
    custom_url = Column(String, nullable=True)
    custom_cta = Column(String, nullable=True)
    custom_description = Column(String, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    owner = relationship("User", back_populates="domains")
    transactions = relationship("Transaction", back_populates="domain")
    clicks = relationship("DomainClick", back_populates="domain")

class DomainClick(Base):
    __tablename__ = "domain_clicks"
    
    id = Column(Integer, primary_key=True, index=True)
    domain_id = Column(Integer, ForeignKey("domains.id"), nullable=False)
    device_id = Column(String, index=True, nullable=False)
    ip_address = Column(String, index=True, nullable=True)
    user_agent = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    domain = relationship("Domain", back_populates="clicks")

class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    domain_id = Column(Integer, ForeignKey("domains.id"), nullable=False)
    amount = Column(Integer, nullable=False)
    status = Column(Enum(TransactionStatus), default=TransactionStatus.pending)
    provider = Column(String, default="inpay")
    inpay_order_id = Column(String, unique=True, index=True, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    user = relationship("User", back_populates="transactions")
    domain = relationship("Domain", back_populates="transactions")

class SiteVisit(Base):
    __tablename__ = "site_visits"
    
    id = Column(Integer, primary_key=True, index=True)
    visitor_id = Column(String, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
