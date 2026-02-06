# IoT Dashboard User Manual

## 1. Introduction
This dashboard provides a centralized view of industrial sensors for safety monitoring.

## 2. Interface Overview

### Sidebar
Navigate between modules.
- **Dashboard**: High-level summary.
- **Sensors**: Detailed sensor list (Placeholder).
- **Live Graphs**: Real-time trend analysis.
- **Emergency**: Critical safety info.

### Header
- **Search**: (Visual only)
- **Theme Toggle**: Switch between Light and Dark mode.
- **Notifications**: Shows red badge on alert.

## 3. Sensor Integration
### Supported Sensors
- **DHT11/22**: Temperature & Humidity.
- **MQ-2**: Smoke, LPG, CO.
- **MQ-135**: Air Quality (NH3, NOx, Alcohol, Benzene, Smoke, CO2).

### Connection
Connect sensors to Arduino/ESP32 and stream JSON data via Serial (USB) to the host machine.
Format: `{"temperature": 25.0, "humidity": 60.0, "mq2_gas": 120, "mq135_air": 80}`

## 4. Troubleshooting
- **"System Disconnected"**: Check if Backend is running (`port 8000`).
- **No Data**: Ensure `MOCK_SENSORS` is `True` for testing, or Serial Port is correct in `config.py`.
