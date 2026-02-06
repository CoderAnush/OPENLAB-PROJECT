from sqlalchemy.orm import Session
from app import models, schemas
from datetime import datetime

def create_sensor_data(db: Session, data: schemas.SensorDataCreate):
    db_data = models.SensorData(**data.dict(), timestamp=datetime.now())
    db.add(db_data)
    db.commit()
    db.refresh(db_data)
    return db_data

def get_sensor_data(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.SensorData).order_by(models.SensorData.timestamp.desc()).offset(skip).limit(limit).all()

def create_alert(db: Session, alert: schemas.AlertCreate):
    db_alert = models.Alert(**alert.dict(), timestamp=datetime.now())
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    return db_alert

def get_alerts(db: Session, skip: int = 0, limit: int = 50):
    return db.query(models.Alert).order_by(models.Alert.timestamp.desc()).offset(skip).limit(limit).all()

def get_settings(db: Session):
    return db.query(models.AppSetting).all()

def update_setting(db: Session, key: str, value: str):
    setting = db.query(models.AppSetting).filter(models.AppSetting.key == key).first()
    if setting:
        setting.value = value
    else:
        setting = models.AppSetting(key=key, value=value)
        db.add(setting)
    db.commit()
    db.refresh(setting)
    return setting
