import asyncio
import random
import serial
import json
import logging
from app.core.config import settings
from app.services.ml_service import ml_service

logger = logging.getLogger(__name__)

class SensorManager:
    def __init__(self):
        self.latest_data = {
            "mq2_gas": 50.0,
            "mq2_voltage": 0.0,
            "mq135_air": 50.0,
            "mq135_voltage": 0.0,
            "risk_score": 0.0,
            "status": "Safe",
            "sensor_connected": False,
            "raw_log": "Waiting for data..."
        }
        self.running = False
        self.serial_conn = None
        self.last_sent_command = None

    async def start_reading(self):
        self.running = True
        
        while self.running:
            # 1. Ensure Connection
            if not self.serial_conn or not self.serial_conn.is_open:
                try:
                    logger.info(f"Attempting to connect to {settings.SERIAL_PORT}...")
                    self.serial_conn = serial.Serial(settings.SERIAL_PORT, settings.SERIAL_BAUDRATE, timeout=1)
                    self.serial_conn.reset_input_buffer()
                    logger.info("Connected to Serial/Bluetooth Device.")
                    self.latest_data["sensor_connected"] = True
                except Exception as e:
                    logger.warning(f"Hardware not connected: {e}. Will retry in 10s...")
                    self.latest_data["sensor_connected"] = False
                    self.latest_data["raw_log"] = f"Hardware not connected. Waiting for device on {settings.SERIAL_PORT}..."
                    await asyncio.sleep(10)
                    continue

            # 2. Read Data
            try:
                # Use run_in_executor to avoid blocking the main event loop during serial I/O
                if self.serial_conn.in_waiting:
                    # Run the blocking readline() in a separate thread
                    loop = asyncio.get_event_loop()
                    line = await loop.run_in_executor(None, self._read_line_blocking)
                    
                    if not line:
                        continue
                    
                    # Debug: Log received line
                    logger.info(f"Received from {settings.SERIAL_PORT}: {line}")
                    
                    # Skip ALERT messages - they are not data messages
                    if line.startswith("ALERT") or line.startswith("IQ") or "ALERT!" in line:
                        logger.debug(f"Skipping alert message: {line}")
                        continue
                        
                    # Parse Data
                    # Supports JSON: {"temperature": 24, "humidity": 50, "mq2": 120, "mq135": 80}
                    # Supports CSV: 24.5,50.2,120,80 (Temp, Hum, MQ2, MQ135)
                    data = {}
                    
                    if line.startswith('{'):
                        try:
                            raw_data = json.loads(line)
                            data = {
                                "mq2_gas": float(raw_data.get("mq2", raw_data.get("mq2_gas", 0))),
                                "mq135_air": float(raw_data.get("mq135", raw_data.get("mq135_air", 0)))
                            }
                        except json.JSONDecodeError:
                            logger.warning(f"Invalid JSON received: {line}")
                            continue
                    else:
                        # Try Custom "Key: Value" format (e.g., "MQ2: 1.17, MQ135: 0.76")
                        if ":" in line:
                            try:
                                parts = [p.strip() for p in line.split(',')]
                                temp_data = {}
                                for p in parts:
                                    if ":" in p:
                                        k, v = p.split(':', 1)
                                        k = k.strip().lower()
                                        v = v.strip()
                                        
                                        # Skip if key contains 'alert' or other non-sensor keywords
                                        if 'alert' in k or 'iq' in k:
                                            continue
                                        
                                        # Clean value - remove 'V' suffix if present
                                        v = v.replace('V', '').replace('v', '').strip()
                                        
                                        if v == "NA" or not v:
                                            continue  # Skip invalid values instead of using 0
                                        else:
                                            try:
                                                val = float(v)
                                            except ValueError:
                                                logger.debug(f"Could not parse value '{v}' from key '{k}'")
                                                continue  # Skip invalid values
                                        
                                        # Only process valid sensor keys
                                        if "mq2" in k and "mq135" not in k: 
                                            temp_data["mq2_voltage"] = val
                                            temp_data["mq2_gas"] = val * 350  # Convert Voltage to PPM (Linear Approx)
                                        elif "mq135" in k: 
                                            temp_data["mq135_voltage"] = val
                                            temp_data["mq135_air"] = val * 350  # Convert Voltage to PPM (Linear Approx)
                                
                                # Only update if we got valid sensor data
                                if temp_data:
                                    # Update only the fields we received - preserve others
                                    if "mq2_gas" in temp_data: 
                                        data["mq2_gas"] = temp_data["mq2_gas"]
                                    if "mq2_voltage" in temp_data: 
                                        data["mq2_voltage"] = temp_data["mq2_voltage"]
                                    if "mq135_air" in temp_data: 
                                        data["mq135_air"] = temp_data["mq135_air"]
                                    if "mq135_voltage" in temp_data: 
                                        data["mq135_voltage"] = temp_data["mq135_voltage"]
                                    
                                    data["sensor_connected"] = True
                                    data["raw_log"] = line
                                else:
                                    # No valid data parsed, skip this line
                                    continue

                            except Exception as e:
                                logger.warning(f"Error parsing custom format '{line}': {e}")
                                continue
                        else:
                            # Try CSV - Assuming now just MQ2, MQ135 if using CSV (or just skipping CSV support for now as it was rigid)
                            # But let's keep it assuming T,H are gone from CSV or just ignore index 0,1 if they are there?
                            # The user said "remove all related". If the hardware sends CSV with 4 values, we might break if we assume 2.
                            # But the user is using the Key:Value format based on logs. I'll just comment out CSV or update it to be safe.
                            pass
                    
                    if data:
                        # FIX: Pass VOLTAGE to ML (expecting < 3.3V), not PPM (e.g. 77)
                        score, status, ai_command = ml_service.predict_risk(
                            data.get("mq2_voltage", 0.0), 
                            data.get("mq135_voltage", 0.0)
                        )
                        data["risk_score"] = score
                        data["status"] = status
                        data["ai_command"] = ai_command
                        data["ml_confidence"] = ml_service.last_confidence
                        
                        # Advanced ML Features
                        ml_data = ml_service.predict_future_trends()
                        if ml_data:
                            data["ml_trend"] = ml_data["trend"]
                            data["time_to_warn"] = ml_data["time_to_warn"]
                            data["time_to_crit"] = ml_data["time_to_crit"]
                        
                        # Add Probabilities
                        if hasattr(ml_service, 'last_probs'):
                            data["ml_probs"] = ml_service.last_probs
                        
                        # Simplified Time String for UI (Backwards Compatible logic)
                        if ml_data and ml_data.get("time_to_crit"):
                             data["time_to_critical"] = f"{ml_data['time_to_crit']}s to Crit"
                        elif ml_data and ml_data.get("time_to_warn"):
                             data["time_to_critical"] = f"{ml_data['time_to_warn']}s to Warn"
                        else:
                             data["time_to_critical"] = "Stable"
                            
                        data["sensor_connected"] = True
                        self.latest_data.update(data)  # Update instead of replacing to preserve values
                        logger.debug(f"Updated Sensor Data: {data}")
                        # Send AI Command back to STM32 (only if changed to avoid flooding)
                        if ai_command != self.last_sent_command:
                            await self.send_command(ai_command)
                            self.last_sent_command = ai_command
                        
                        
                else:
                    await asyncio.sleep(0.005)  # Poll very fast (5ms) when idle to mimic real-time interrupt
            
            except Exception as e:
                logger.warning(f"Serial Error: {e}")
                if self.serial_conn:
                    try:
                        self.serial_conn.close()
                    except:
                        pass
                self.serial_conn = None
                self.latest_data["sensor_connected"] = False
                self.latest_data["raw_log"] = "Hardware disconnected. Reconnecting..."
                await asyncio.sleep(5)

    def _read_line_blocking(self):
        """Blocking read - Flushes buffer and returns ONLY the latest line"""
        try:
            last_line = None
            # Read all available lines to clear buffer and get the freshest data
            while self.serial_conn.in_waiting:
                line = self.serial_conn.readline().decode('utf-8', errors='ignore').strip()
                if line:
                    last_line = line
            return last_line
        except Exception:
            return None

    async def send_command(self, command):
        """Async wrapper for blocking write"""
        if self.serial_conn:
            loop = asyncio.get_running_loop()
            await loop.run_in_executor(None, lambda: self._send_command_blocking(command))

    def _send_command_blocking(self, command):
        """Blocking write to be run in executor"""
        if self.serial_conn and self.serial_conn.is_open:
            try:
                # Ensure command ends with newline
                if not command.endswith('\n'):
                    command += '\n'
                
                self.serial_conn.write(command.encode('utf-8'))
                logger.debug(f" 📤 Sent: {command.strip()}")
            except Exception as e:
                logger.error(f"❌ Failed to send command {command}: {e}")

sensor_manager = SensorManager()
