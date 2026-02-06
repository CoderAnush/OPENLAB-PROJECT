from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

# Sensor Schemas
class SensorDataBase(BaseModel):
    mq2_gas: float
    mq2_voltage: Optional[float] = 0.0
    mq135_air: float
    mq135_voltage: Optional[float] = 0.0
    risk_score: Optional[float] = 0.0
    status: Optional[str] = "Safe"

class SensorDataCreate(SensorDataBase):
    pass

class SensorData(SensorDataBase):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True

# ML Prediction Schemas
class MLPredictionBase(BaseModel):
    mq2_value: float
    mq135_value: float
    prediction: str  # SAFE, WARN, CRITICAL
    confidence: float  # 0.0 to 1.0
    ai_command: str  # AI_SAFE, AI_WARN, AI_CRITICAL

class MLPredictionCreate(MLPredictionBase):
    pass

class MLPrediction(MLPredictionBase):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True

class MLStatus(BaseModel):
    model_loaded: bool
    last_prediction: str
    confidence: float
    prediction_time: Optional[datetime] = None
    model_accuracy: float = 97.15
    total_predictions: int = 0
    feature_importance: dict = {
        "mq135_max_window": 23.5,
        "mq135_mean_window": 18.9,
        "mq135_now": 15.7,
        "mq2_max_window": 14.3,
        "mq2_now": 14.1,
        "mq2_mean_window": 10.3,
        "mq135_delta": 1.8,
        "mq2_delta": 1.5
    }

# Alert Schemas
class AlertBase(BaseModel):
    severity: str
    message: str
    is_resolved: bool = False

class AlertCreate(AlertBase):
    pass

class Alert(AlertBase):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True

# Settings Schemas
class SettingBase(BaseModel):
    key: str
    value: str
    description: Optional[str] = None

class SettingCreate(SettingBase):
    pass

class Setting(SettingBase):
    id: int

    class Config:
        from_attributes = True
