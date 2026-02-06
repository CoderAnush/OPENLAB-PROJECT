import os

class Settings:
    PROJECT_NAME: str = "Gas and Smoke detector Dashboard"
    API_V1_STR: str = "/api/v1"
    SQLALCHEMY_DATABASE_URI: str = "sqlite:///./iot_v2.db"
    
    # Serial Configuration
    SERIAL_PORT: str = "COM4"  # Update this to your Bluetooth COM Port
    SERIAL_BAUDRATE: int = 9600 

settings = Settings()
