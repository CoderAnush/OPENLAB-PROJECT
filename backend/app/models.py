from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean
from datetime import datetime
from app.core.database import Base

class SensorData(Base):
    __tablename__ = "sensor_data"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.now)
    mq2_gas = Column(Float)   # Converted PPM or Raw
    mq2_voltage = Column(Float) # Raw Voltage
    mq135_air = Column(Float) # Converted PPM or Raw
    mq135_voltage = Column(Float) # Raw Voltage
    risk_score = Column(Float)
    status = Column(String)   # Safe, Warning, Danger

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.now)
    severity = Column(String) # low, medium, high, critical
    message = Column(String)
    is_resolved = Column(Boolean, default=False)

class AppSetting(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True)
    value = Column(String)
    description = Column(String)
