# Industrial IoT Monitoring Dashboard

A professional, real-time IoT monitoring system built with React, FastAPI, and Machine Learning integration.

## Features

- **Real-time Monitoring**: Visualize sensor data (Temperature, Humidity, MQ-2, MQ-135) with live gauges and charts.
- **Machine Learning**: Predictive risk analysis based on sensor values.
- **Alert System**: Immediate visual logs for critical threshold breaches.
- **Emergency Protocol**: Dedicated actionable guide for fire and gas leak emergencies.
- **Responsive Design**: Modern UI with Dark/Light mode support.

## Project Structure

```
IoT-Dashboard/
├── backend/            # FastAPI Server
│   ├── app/
│   │   ├── main.py     # Entry point
│   │   ├── services/   # Serial & ML logic
│   │   └── models/     # DB Models
│   └── requirements.txt
├── frontend/           # React + Vite Client
│   ├── src/
│   │   ├── components/
│   │   └── pages/
│   └── tailwind.config.js
└── docs/               # Documentation
```

## Setup & Installation

### Prerequisites
- Python 3.8+
- Node.js 16+

### 1. Backend Setup

```bash
cd backend
pip install -r requirements.txt
# Run the server
uvicorn app.main:app --reload
```
The API will be available at `http://localhost:8000`.
Docs at `http://localhost:8000/docs`.

**Note:** By default, it runs in **MOCK MODE**. To use real sensors, edit `backend/app/core/config.py` and set `MOCK_SENSORS = False`.

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```
Access the dashboard at `http://localhost:5173`.

## Usage Guide

1. **Dashboard**: View current status and risk levels.
2. **Live Graphs**: Monitor trends over time.
3. **Emergency**: Access critical contact numbers and protocols instantly.
4. **Alerts**: Check history of dangerous events.

## ML Calibration
The current model uses a heuristic rule-based approach in `backend/app/services/ml_service.py`. To train a real model:
1. Collect data in `iot.db`.
2. Extract CSV.
3. Train `scikit-learn` model.
4. Replace `ml_service.py` logic with `model.predict()`.

## License
MIT
