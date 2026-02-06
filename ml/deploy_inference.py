"""
STEP 3 & 4: Real-Time Inference & AI Command Protocol
======================================================

This script continuously:
1. Reads live MQ2 & MQ135 from STM32 (UART)
2. Maintains rolling time-window
3. Extracts IDENTICAL features to training
4. Runs model.predict() in real-time
5. Sends deterministic AI commands back to STM32

AI COMMAND PROTOCOL (Simple, STM32-Friendly):
- AI_SAFE      → System normal, threshold protection active
- AI_WARN      → Trend detected, fan turns ON early
- AI_CRITICAL  → Immediate action, max alerting

CRITICAL INVARIANT:
Feature extraction must be BIT-IDENTICAL to training phase.
"""

import serial
import joblib
import numpy as np
import json
import time
from datetime import datetime
from collections import deque

print("="*70)
print("REAL-TIME INFERENCE: Gas/Smoke Detection")
print("="*70)

# ========== LOAD TRAINED MODEL ==========
print("\n📦 Loading frozen model...")
try:
    model = joblib.load('ml_models/gas_smoke_rf.pkl')
    feature_names = joblib.load('ml_models/feature_names.pkl')
    with open('ml_models/model_metadata.json', 'r') as f:
        metadata = json.load(f)
    
    print(f"✅ Model loaded: {metadata['model_type']}")
    print(f"✅ Classes: {metadata['classes']}")
    print(f"✅ Features: {feature_names}")
    print(f"✅ Training Accuracy: {metadata['training_accuracy']:.4f}")
    print(f"✅ Test Accuracy: {metadata['test_accuracy']:.4f}")
except Exception as e:
    print(f" ERROR: {e}")
    print(" Run: python ml/train_model.py")
    exit(1)

# ========== CONFIGURATION ==========
SERIAL_PORT = 'COM4'
BAUD_RATE = 9600

WINDOW_SIZE = 60        # Match training (60 samples = ~6.3s at 9.5 Hz)
CONFIDENCE_THRESHOLD = 0.6  # Only act on confident predictions

# Rolling buffers for windowing
mq2_window = deque(maxlen=WINDOW_SIZE)
mq135_window = deque(maxlen=WINDOW_SIZE)

# Logging
INFERENCE_LOG = 'ml_logs/inference_log.csv'
import os
os.makedirs('ml_logs', exist_ok=True)

log_file = open(INFERENCE_LOG, 'w')
log_file.write('timestamp,mq2,mq135,prediction,confidence_safe,confidence_warn,confidence_critical,ai_command\n')
log_file.flush()

# State tracking
last_prediction = 'SAFE'
consecutive_warns = 0
CONFIRMATION_THRESHOLD = 2  # Confirm WARN with 2 consecutive predictions

print(f"\n⚙️  Configuration:")
print(f"   Window Size: {WINDOW_SIZE} samples (~6.3 sec)")
print(f"   Confidence Threshold: {CONFIDENCE_THRESHOLD:.2f}")
print(f"   Serial Port: {SERIAL_PORT} @ {BAUD_RATE} baud")
print(f"   Log File: {INFERENCE_LOG}")

# ========== FEATURE EXTRACTION (IDENTICAL TO TRAINING) ==========
def extract_features(mq2_buffer, mq135_buffer):
    """
    Extract EXACT SAME features as training.
    If this changes, model predictions are invalid.
    """
    if len(mq2_buffer) < WINDOW_SIZE or len(mq135_buffer) < WINDOW_SIZE:
        return None  # Not enough data yet
    
    mq2_arr = np.array(list(mq2_buffer))
    mq135_arr = np.array(list(mq135_buffer))
    
    features = {
        'mq2_now': float(mq2_arr[-1]),
        'mq135_now': float(mq135_arr[-1]),
        'mq2_delta': float(mq2_arr[-1] - mq2_arr[0]),
        'mq135_delta': float(mq135_arr[-1] - mq135_arr[0]),
        'mq2_mean_window': float(np.mean(mq2_arr)),
        'mq135_mean_window': float(np.mean(mq135_arr)),
        'mq2_max_window': float(np.max(mq2_arr)),
        'mq135_max_window': float(np.max(mq135_arr))
    }
    
    return features

# ========== PREDICTION & COMMAND GENERATION ==========
def predict_and_command(features):
    """
    Run model.predict() and convert to AI command.
    
    Returns: (prediction, confidence, ai_command)
    """
    # Ensure feature order matches training
    feature_vector = np.array([[features[fname] for fname in feature_names]])
    
    # Get prediction and confidence
    prediction = model.predict(feature_vector)[0]
    confidences = model.predict_proba(feature_vector)[0]
    class_idx = list(model.classes_).index(prediction)
    confidence = confidences[class_idx]
    
    # Convert to AI commands
    if confidence < CONFIDENCE_THRESHOLD:
        ai_command = 'AI_SAFE'  # Low confidence = safe assumption
    elif prediction == 'CRITICAL':
        ai_command = 'AI_CRITICAL'
    elif prediction == 'WARN':
        ai_command = 'AI_WARN'
    else:
        ai_command = 'AI_SAFE'
    
    return prediction, confidence, ai_command

# ========== SERIAL COMMUNICATION ==========
def send_command_to_stm32(ser, command):
    """Send AI command to STM32"""
    try:
        ser.write(f"{command}\n".encode())
        print(f"   → STM32: {command}")
    except Exception as e:
        print(f"   ⚠️  Serial write failed: {e}")

# ========== MAIN INFERENCE LOOP ==========
def main():
    """Real-time inference loop"""
    global consecutive_warns, last_prediction
    
    print("\n" + "="*70)
    print("🔴 STARTING REAL-TIME INFERENCE...")
    print("="*70)
    print("Connecting to STM32...\n")
    
    try:
        ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
        time.sleep(2)  # Allow port to stabilize
        print(f"✅ Connected to {SERIAL_PORT}\n")
        
    except Exception as e:
        print(f" ERROR: Cannot open {SERIAL_PORT}: {e}")
        return
    
    sample_count = 0
    
    try:
        while True:
            try:
                # Read line from STM32
                line = ser.readline().decode('utf-8', errors='ignore').strip()
                
                if not line or 'MQ2' not in line:
                    continue
                
                # Parse "MQ2: 1.23, MQ135: 0.56"
                try:
                    parts = line.split(',')
                    mq2_str = parts[0].split(':')[1].strip().replace('V', '')
                    mq135_str = parts[1].split(':')[1].strip().replace('V', '')
                    
                    mq2_val = float(mq2_str)
                    mq135_val = float(mq135_str)
                except:
                    continue
                
                # Add to rolling windows
                mq2_window.append(mq2_val)
                mq135_window.append(mq135_val)
                sample_count += 1
                
                # Try to extract features
                features = extract_features(mq2_window, mq135_window)
                
                if features is None:
                    # Still collecting data
                    if sample_count % 10 == 0:
                        progress = len(mq2_window)
                        print(f"   Buffering: {progress}/{WINDOW_SIZE} samples...", end='\r')
                    continue
                
                # Clear progress line
                print("                                      ", end='\r')
                
                # Run inference
                prediction, confidence, ai_command = predict_and_command(features)
                
                # Multi-sample confirmation for WARN (reduce false positives)
                if prediction == 'WARN':
                    consecutive_warns += 1
                    if consecutive_warns < CONFIRMATION_THRESHOLD:
                        ai_command = 'AI_SAFE'  # Wait for confirmation
                else:
                    consecutive_warns = 0
                
                # Log prediction
                timestamp = datetime.now().isoformat()
                log_file.write(
                    f"{timestamp},{mq2_val:.3f},{mq135_val:.3f},"
                    f"{prediction},{confidences[0]:.4f},"
                    f"{confidences[1]:.4f},{confidences[2]:.4f},"
                    f"{ai_command}\n"
                )
                log_file.flush()
                
                # Display and send command
                if prediction != last_prediction or sample_count % 50 == 0:
                    print(f"\n[{timestamp}]")
                    print(f"   MQ2: {mq2_val:.2f}V | MQ135: {mq135_val:.2f}V")
                    print(f"   Prediction: {prediction} ({confidence:.2%} confidence)")
                    print(f"   ➜ Command: {ai_command}")
                    
                    # Send to STM32
                    send_command_to_stm32(ser, ai_command)
                    last_prediction = prediction
                
            except KeyboardInterrupt:
                raise
            except Exception as e:
                continue
    
    except KeyboardInterrupt:
        print("\n\n🛑 Inference stopped by user")
    finally:
        ser.close()
        log_file.close()
        print(f"\n✅ Logged to: {INFERENCE_LOG}")
        print(f"   Total samples processed: {sample_count}")

# ========== FAIL-SAFE & ARCHITECTURE NOTES ==========
ARCHITECTURE_NOTES = """
╔════════════════════════════════════════════════════════════════════════════╗
║ DEPLOYMENT ARCHITECTURE & FAIL-SAFE LOGIC                                 ║
╚════════════════════════════════════════════════════════════════════════════╝

WHERE IS THE MODEL DEPLOYED?
────────────────────────────
✓ Model is on PC (this Python script)
✗ NOT on STM32 (microcontroller)
✗ NOT in cloud
✗ NOT in mobile app

Real-time flow:
┌──────────┐         UART          ┌────────────────────┐
│  STM32   │◄───(MQ2, MQ135)───────►│ PC (this script)   │
│  Board   │                        │ (trained model)    │
└──────────┘───(AI_WARN)─────────────└────────────────────┘
   ▲ Actions:                           ▲ Inference:
   ├─ Fan ON/OFF                        ├─ Extract features
   ├─ Buzzer                            ├─ predict()
   ├─ LEDs                              ├─ Generate command
   └─ Relay                             └─ Send back to STM32

FAIL-SAFE HIERARCHY
───────────────────
1️⃣ AI_CRITICAL received    → Fan ON immediately (highest priority)
2️⃣ Threshold crossed       → Fan ON immediately (built-in protection)
3️⃣ Bluetooth lost          → Thresholds continue to protect
4️⃣ AI node crashed         → STM32 continues with thresholds only

KEY INVARIANTS (MUST NEVER VIOLATE)
───────────────────────────────────
✓ Feature extraction is IDENTICAL between training & deployment
✓ Threshold logic is ALWAYS active (AI is complementary)
✓ AI commands are SIMPLE (AI_SAFE/WARN/CRITICAL, not floats)
✓ Model weights are FROZEN (no retraining in production)
✓ Predictions are LOGGED (for analysis & viva defense)

WHY THIS ARCHITECTURE?
──────────────────────
• PC has CPU power for ML inference
• STM32 has real-time guarantees for control
• Separation of concerns: sensing + ML + actuation
• STM32 never depends on ML (always safe)
• Can update ML without touching embedded code

EARLY PREDICTION CONCEPT
────────────────────────
Traditional: Fan ON when MQ2 > 2.0V ▬▬▬▬▬▬▬▬
AI-Assisted: Fan ON when trend → WARN ▬▬▬▬──  (earlier)

This gives operator 10-30 seconds to react before critical.
"""

if __name__ == '__main__':
    print(ARCHITECTURE_NOTES)
    main()
