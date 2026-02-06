import asyncio
import logging
from typing import List

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("uvicorn")

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app import models, schemas, crud
from app.core import database, config
from app.services.serial_reader import sensor_manager
from app.services.ml_service import ml_service

# Create Tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title=config.settings.PROJECT_NAME)

# Mount Static Files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Templates
templates = Jinja2Templates(directory="templates")

# CORS (Allowed for flexibility, though not strictly needed for monolithic)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Websocket Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        # Broadcast to all connected clients
        # Note: In high-scale apps, this loop might block if a client is slow
        # For localhost/demo, this is fine.
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()

# Background Task for buffering data to DB
async def data_archiver():
    while True:
        await asyncio.sleep(10) 
        db = database.SessionLocal()
        try:
            data = sensor_manager.latest_data
            # CRITICAL FIX: Only archive and alert if the sensor is actually connected
            # This prevents specific "last known state" from generating infinite alerts when unplugged
            if not data.get("sensor_connected", False):
                 continue

            if data and data.get("mq2_gas") is not None:
                s_data = schemas.SensorDataCreate(**data)
                crud.create_sensor_data(db, s_data)
                
                # Check for Alerts (Warning or Danger)
                status = data.get("status")
                if status in ["Warning", "Danger"]:
                    severity = "high" if status == "Danger" else "medium"
                    
                    # Create descriptive message with Sensor Values
                    ai_cmd = data.get("ai_command", "Unknown")
                    score = int(data.get("risk_score", 0))
                    
                    # Get values (Prefer Voltage as it's the raw truth, or PPM if available)
                    mq2_val = data.get("mq2_voltage", 0.0)
                    mq135_val = data.get("mq135_voltage", 0.0)
                    
                    # PPM Values
                    mq2_ppm = data.get("mq2_gas", 0.0)
                    mq135_ppm = data.get("mq135_air", 0.0)
                    
                    # Format: "Danger Detected! Score: 100% (MQ2: 2.5V | 120ppm, MQ135: 1.2V | 80ppm) [AI_CRITICAL]"
                    msg = f"{status} Detected! Score: {score}% (MQ2: {mq2_val:.2f}V|{mq2_ppm:.0f}ppm, MQ135: {mq135_val:.2f}V|{mq135_ppm:.0f}ppm) [{ai_cmd}]"
                    
                    alert = schemas.AlertCreate(
                        severity=severity, 
                        message=msg
                    )
                    crud.create_alert(db, alert)
        except Exception as e:
            logging.error(f"Error archiving data: {e}")
        finally:
            db.close()

# Startup Events
@app.on_event("startup")
async def startup_event():
    asyncio.create_task(sensor_manager.start_reading())
    asyncio.create_task(data_archiver())

# --- UI Routes (Serving HTML) ---

@app.get("/", response_class=HTMLResponse)
async def read_dashboard(request: Request):
    return templates.TemplateResponse("dashboard.html", {"request": request, "page": "dashboard"})

@app.get("/graphs", response_class=HTMLResponse)
async def read_graphs(request: Request):
    return templates.TemplateResponse("graphs.html", {"request": request, "page": "graphs"})

@app.get("/emergency", response_class=HTMLResponse)
async def read_emergency(request: Request):
    return templates.TemplateResponse("emergency.html", {"request": request, "page": "emergency"})

@app.get("/alerts", response_class=HTMLResponse)
async def read_alerts_page(request: Request):
    return templates.TemplateResponse("alerts.html", {"request": request, "page": "alerts"})

@app.get("/settings", response_class=HTMLResponse)
async def read_settings(request: Request):
    return templates.TemplateResponse("settings.html", {"request": request, "page": "settings"})

# --- API Routes ---

@app.get("/api/sensor/current", response_model=schemas.SensorDataBase)
def get_current_sensor_data():
    data = sensor_manager.latest_data.copy()
    
    # Add ML prediction
    mq2_voltage = data.get("mq2_voltage", 0.0)
    mq135_voltage = data.get("mq135_voltage", 0.0)
    
    prediction, confidence, ai_command = ml_service.predict_with_ml(mq2_voltage, mq135_voltage)
    data["ml_prediction"] = prediction
    data["ml_confidence"] = confidence
    data["ai_command"] = ai_command
    
    return data

@app.get("/api/ml/status", response_model=schemas.MLStatus)
def get_ml_status():
    """Get ML model status and statistics"""
    return ml_service.get_model_status()

@app.get("/api/ml/predict")
def get_ml_prediction(mq2: float = 0.0, mq135: float = 0.0):
    """
    Get ML prediction for given sensor values
    Example: /api/ml/predict?mq2=1.5&mq135=1.2
    """
    prediction, confidence, ai_command = ml_service.predict_with_ml(mq2, mq135)
    return {
        "prediction": prediction,
        "confidence": f"{confidence:.2%}",
        "ai_command": ai_command,
        "mq2_value": mq2,
        "mq135_value": mq135,
        "timestamp": ml_service.prediction_time
    }

@app.get("/api/sensor/history", response_model=List[schemas.SensorData])
def get_sensor_history(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_sensor_data(db, skip=skip, limit=limit)

@app.get("/api/alerts", response_model=List[schemas.Alert])
def get_alerts(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    return crud.get_alerts(db, skip=skip, limit=limit)

@app.delete("/api/alerts/clear")
def clear_all_alerts(db: Session = Depends(get_db)):
    """Clear all alerts from the database"""
    db.query(models.Alert).delete()
    db.commit()
    return {"message": "All alerts cleared successfully"}

# WebSocket Endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Make a copy to avoid reference issues
            data = sensor_manager.latest_data.copy()
            await websocket.send_json(data)
            await asyncio.sleep(0.02)  # Update every 20ms for fast real-time display
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        # Ignore normal client disconnections (browser refresh, navigation, etc.)
        error_name = type(e).__name__
        if error_name not in ["ClientDisconnected", "ConnectionClosedOK", "ConnectionClosedError"]:
            logger.error(f"Unexpected WebSocket error: {error_name}: {str(e)}")
        manager.disconnect(websocket)

