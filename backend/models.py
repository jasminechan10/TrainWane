from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime, timezone
from database import Base


class TrainSighting(Base):
    __tablename__ = "train_sightings"

    id = Column(Integer, primary_key=True, index=True)
    crossing_id = Column(Integer, nullable=False)
    crossing_name = Column(String, nullable=False)
    railroad = Column(String, nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    direction = Column(String, nullable=True)
    train_type = Column(String, nullable=True)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)) 
    local_hour = Column(Integer, nullable=False)