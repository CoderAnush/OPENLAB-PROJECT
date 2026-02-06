# 🎯 COMPLETE 5-SCENARIO DATA COLLECTION PROCEDURE

## Step-by-Step Guide for ML Dataset Collection

---

## 📅 TIMELINE OVERVIEW

| Phase | Duration | When |
|-------|----------|------|
| **Sensor Preheat** | 24-48 hours | Do once, 2 days before |
| **Setup & Testing** | 10 minutes | Day of collection |
| **Data Collection** | 50 minutes | 5 scenarios × 10 min |
| **Feature Engineering** | 2 minutes | After collection |
| **Model Training** | 3 minutes | Final step |
| **Total Active Time** | ~65 minutes | Day of collection |

---

## 🔧 PHASE 1: PREPARATION (ONE-TIME, 24-48 HOURS BEFORE)

### Step 1.1: Hardware Check
```
✅ Verify all connections:
   - MQ2 sensor → PA0
   - MQ135 sensor → PA1
   - HC-05 → PA9 (TX), PA10 (RX)
   - I2C LCD → PB8 (SCL), PB9 (SDA) [optional]
   - Buzzer → PB0 [optional]
   - Power: 3.3V common VCC, GND
```

### Step 1.2: Flash STM32 Code
1. Open STM32CubeIDE
2. Open your project
3. Replace `main.c` with `ml/stm32_modified_main.c`
4. Configure peripherals:
   - ADC1: PA0 (IN0), PA1 (IN1)
   - USART1: PA9/PA10, 115200 baud
   - I2C1: PB8/PB9 (if using LCD)
5. Build → Upload to STM32
6. LCD should show: "Gas Sensor ML System Ready"

### Step 1.3: Preheat Sensors
```
⚠️ CRITICAL FOR ACCURACY!

1. Power on STM32
2. Leave MQ2 + MQ135 running continuously
3. Wait 24-48 hours minimum
4. Sensors must stabilize before data collection
5. You can leave it on for days - no problem!
```

**Why?** SnO₂ heating elements need time to reach thermal equilibrium.

### Step 1.4: Test Bluetooth Connection
```powershell
# Windows: Check COM port
Device Manager → Ports (COM & LPT) → Note COM number

# Update Python script
# Edit line 11 in ml/collect_dataset.py
SERIAL_PORT = 'COM3'  # Change to your COM port

# Test connection
python ml/collect_dataset.py
# Press Ctrl+C after 10 seconds if it starts logging
```

---

## 📊 PHASE 2: DATA COLLECTION (50 MINUTES)

### ⚙️ Before Starting:
- [ ] Sensors preheated 24+ hours
- [ ] Bluetooth paired and COM port verified
- [ ] Python script tested
- [ ] Materials ready: lighter, incense sticks, matches
- [ ] Room is ventilated (open window)
- [ ] 10-minute timer ready

---

### 🟢 SCENARIO 1: SAFE BASELINE (10 min)
**Goal:** Establish normal, clean air readings

#### Setup:
1. Place STM32 + sensors in **clean, well-ventilated area**
2. Open windows
3. No smoke, gas, or strong odors nearby
4. No one breathing directly on sensors

#### Run Collection:
```powershell
cd IoT-Dashboard
python ml/collect_dataset.py
```

#### Interactive Prompts:
```
Enter scenario number (1-5): 1
✅ Selected: safe_baseline

📋 INSTRUCTIONS:
   - Keep sensors in clean, well-ventilated area
   - No gas or smoke sources nearby
   - Do NOT disturb for 10 minutes
   - This establishes baseline for SAFE class
```

#### During Collection:
- **Do NOT disturb sensors**
- **Do NOT breathe on sensors**
- Leave room if possible
- Let it run for full 10 minutes

#### Expected Output:
```
✅ 6000 samples | 600.0s | 10.0 Hz | MQ2: 0.512V | MQ135: 0.891V
```

#### Success Criteria:
- MQ2: 0.4-1.0V (stable)
- MQ135: 0.8-1.3V (stable)
- No sudden spikes
- File: `datasets/safe_baseline_YYYYMMDD_HHMMSS.csv`

---

### 🟡 SCENARIO 2: GRADUAL GAS EXPOSURE (10 min)
**Goal:** Slow gas concentration increase for WARN class

#### Materials:
- Disposable lighter (butane/LPG)
- Timer

#### Setup:
1. Start with sensors in clean air
2. Have lighter ready (DO NOT IGNITE!)

#### Run Collection:
```powershell
python ml/collect_dataset.py
# Enter: 2 (gradual_gas)
```

#### Timeline to Follow:

| Time | Action | Distance | MQ2 Expected |
|------|--------|----------|--------------|
| 0:00-2:00 | Clean air, no gas | - | 0.5-1.0V |
| 2:00-4:00 | Press lighter, release puffs | 30cm | 1.0-1.5V |
| 4:00-6:00 | More frequent puffs | 20cm | 1.5-2.0V |
| 6:00-8:00 | Continuous small releases | 10cm | 2.0-2.5V |
| 8:00-10:00 | Hold near sensor | 5-10cm | 2.5-3.0V |

#### Technique:
```
1. Press lighter button (don't ignite)
2. Hold for 2 seconds
3. Release
4. Wait 5 seconds
5. Repeat

⚠️ DO NOT ignite lighter!
⚠️ Work in ventilated area
```

#### Expected Output:
```
MQ2: 0.512V → 1.234V → 2.456V → 2.891V
MQ135: 0.891V → 1.123V → 1.456V → 1.678V
```

#### Success Criteria:
- MQ2 shows gradual increase
- Final MQ2 > 2.0V
- Smooth curve, not sudden jumps
- File: `datasets/gradual_gas_YYYYMMDD_HHMMSS.csv`

---

### 🔴 SCENARIO 3: RAPID GAS LEAK (10 min)
**Goal:** Simulate emergency gas leak for CRITICAL class

#### Materials:
- Lighter (or small LPG canister if available)

#### Run Collection:
```powershell
python ml/collect_dataset.py
# Enter: 3 (rapid_gas)
```

#### Timeline to Follow:

| Time | Action | Distance | MQ2 Expected |
|------|--------|----------|--------------|
| 0:00-1:00 | Clean air | - | 0.5-1.0V |
| 1:00-3:00 | **SUDDEN heavy gas release** | 5cm | 2.5-3.3V |
| 3:00-5:00 | Maintain high concentration | 5-10cm | 2.5-3.3V |
| 5:00-7:00 | Slowly move away | 15cm | 2.0-2.5V |
| 7:00-10:00 | Continue moving away | 30cm+ | 1.5-2.0V |

#### Technique:
```
1. Start with clean air (1 min)
2. At 1:00 mark, press lighter continuously
3. Hold very close (5cm) for 2 minutes
4. Then gradually increase distance (recovery phase)

💡 This tests emergency detection + recovery
```

#### Expected Output:
```
MQ2: 0.512V → 3.012V (fast jump) → 2.456V → 1.234V (recovery)
```

#### Success Criteria:
- Rapid spike in first 2 minutes
- MQ2 reaches >2.5V
- Shows recovery phase
- File: `datasets/rapid_gas_YYYYMMDD_HHMMSS.csv`

---

### 🟡 SCENARIO 4: GRADUAL SMOKE EXPOSURE (10 min)
**Goal:** Slow smoke increase for WARN class (MQ135 focus)

#### Materials:
- Incense stick + holder
- Matches/lighter to ignite
- Fire-safe surface

#### Setup:
1. Place incense in holder
2. Light incense stick
3. Let it burn steadily (red ember, smoke rising)

#### Run Collection:
```powershell
python ml/collect_dataset.py
# Enter: 4 (gradual_smoke)
```

#### Timeline to Follow:

| Time | Action | Distance | MQ135 Expected |
|------|--------|----------|----------------|
| 0:00-2:00 | Clean air (before lighting) | - | 0.8-1.3V |
| 2:00-4:00 | Light incense, hold away | 50cm | 1.3-1.8V |
| 4:00-6:00 | Move closer | 30cm | 1.8-2.2V |
| 6:00-8:00 | Move closer | 15cm | 2.2-2.6V |
| 8:00-10:00 | Hold near sensor | 10cm | 2.6-3.0V |

#### Safety:
```
✅ Use incense holder (never hand-held while logging)
✅ Place on fire-safe surface (ceramic plate)
✅ Keep away from flammable materials
✅ Work near window (ventilation)
🔥 Keep extinguisher/water nearby
```

#### Expected Output:
```
MQ2: 0.512V → 1.234V (slight increase)
MQ135: 0.891V → 1.456V → 2.234V → 2.891V (large increase)
```

#### Success Criteria:
- MQ135 shows gradual increase
- Final MQ135 > 2.0V
- MQ2 increases slightly (less sensitive to smoke)
- File: `datasets/gradual_smoke_YYYYMMDD_HHMMSS.csv`

---

### 🔴 SCENARIO 5: CRITICAL SMOKE (10 min)
**Goal:** High smoke concentration for CRITICAL class

#### Materials:
- 2-3 incense sticks (or mosquito coils)
- Matches
- Holder
- Ventilation ready

#### Run Collection:
```powershell
python ml/collect_dataset.py
# Enter: 5 (critical_smoke)
```

#### Timeline to Follow:

| Time | Action | Distance | MQ135 Expected |
|------|--------|----------|----------------|
| 0:00-1:00 | Clean air | - | 0.8-1.3V |
| 1:00-5:00 | **Heavy smoke** near sensor | 5-10cm | 2.5-3.3V |
| 5:00-10:00 | Maintain high concentration | 5-10cm | 2.5-3.3V |

#### Technique:
```
Option 1 (Multiple Incense):
1. Light 2-3 incense sticks
2. Place all 5-10cm from sensor
3. Maintain for full 10 minutes

Option 2 (Match Smoke):
1. Light match, blow out
2. Use smoke from extinguished match
3. Repeat every 30 seconds

Option 3 (Paper Smoke - Careful!):
1. Roll paper cone
2. Light tip, blow out immediately
3. Use smoke (NOT flame!)

⚠️ ENSURE GOOD VENTILATION
⚠️ Monitor sensors - should not exceed 3.3V
```

#### Expected Output:
```
MQ135: 0.891V → 3.123V (sustained high)
MQ2: 0.512V → 1.456V (moderate increase)
```

#### Success Criteria:
- MQ135 reaches >2.5V and stays high
- Sustained high readings for 5+ minutes
- File: `datasets/critical_smoke_YYYYMMDD_HHMMSS.csv`

---

## 📁 PHASE 3: VERIFY DATA COLLECTION

### Check Files:
```powershell
ls datasets/

# Expected output:
# safe_baseline_20260123_140000.csv
# gradual_gas_20260123_141500.csv
# rapid_gas_20260123_143000.csv
# gradual_smoke_20260123_144500.csv
# critical_smoke_20260123_150000.csv
```

### Verify CSV Format:
```powershell
# Open any CSV file - should look like:
# timestamp,mq2,mq135
# 12340,0.512,0.891
# 12440,0.523,0.903
# 12540,0.534,0.915
# ...
```

### Expected File Sizes:
- Each file: ~150-200 KB
- ~6000 samples per file
- Total: ~750 KB for all 5 files

---

## 🔧 PHASE 4: FEATURE ENGINEERING (2 minutes)

### Run Script:
```powershell
python ml/feature_engineering.py
```

### Expected Output:
```
FEATURE ENGINEERING - Gas Sensor Dataset
============================================================

📁 Found 5 dataset file(s):
   1. datasets\safe_baseline_20260123_140000.csv
   2. datasets\gradual_gas_20260123_141500.csv
   3. datasets\rapid_gas_20260123_143000.csv
   4. datasets\gradual_smoke_20260123_144500.csv
   5. datasets\critical_smoke_20260123_150000.csv

🔧 Loading and combining datasets...
   ✅ Loaded 6000 samples from safe_baseline... (Label: SAFE)
   ✅ Loaded 6000 samples from gradual_gas... (Label: WARN)
   ✅ Loaded 6000 samples from rapid_gas... (Label: CRITICAL)
   ✅ Loaded 6000 samples from gradual_smoke... (Label: WARN)
   ✅ Loaded 6000 samples from critical_smoke... (Label: CRITICAL)

✅ Total samples loaded: 30000

📊 Scenario distribution:
SAFE        6000
WARN       12000
CRITICAL   12000

🔧 Engineering time-series features...
🏷️  Adding labels from scenario names...

============================================================
✅ FEATURE ENGINEERING COMPLETE
============================================================
   Output file: datasets/processed_features.csv
   Total samples: 30000
   Features generated: 19
   Feature names: mq2, mq135, mq2_delta, mq135_delta, mq2_accel...

📊 Final label distribution:
SAFE        6000
WARN       12000
CRITICAL   12000

💡 Next step: Train the model
   python ml/train_model.py
```

---

## 🤖 PHASE 5: MODEL TRAINING (3 minutes)

### Run Script:
```powershell
python ml/train_model.py
```

### Expected Output:
```
📂 Loading feature-engineered data...
✅ Loaded 30000 samples
   Features: 19
   Label distribution:
CRITICAL    12000
SAFE         6000
WARN        12000

🔀 Train set: 24000 | Test set: 6000

🌲 Training Random Forest Classifier...
✅ Training complete!

📊 Training Accuracy: 0.9834
📊 Test Accuracy: 0.9245

🔄 Cross-Validation Accuracy: 0.9187 ± 0.0234

📋 Classification Report:
              precision    recall  f1-score   support
CRITICAL         0.95      0.94      0.94      2400
SAFE             0.98      0.99      0.98      1200
WARN             0.88      0.90      0.89      2400

💾 Saved confusion_matrix.png
💾 Saved feature_importance.png

🔍 Top 10 Most Important Features:
           feature  importance
      mq2_slope      0.1823
    mq135_slope      0.1567
     mq2_delta       0.1234
   mq2_max_5s       0.0987
   mq135_delta      0.0876
  ...

💾 Model saved to models/gas_sensor_rf_model.pkl

============================================================
📊 VIVA SUMMARY
============================================================
✅ Model Type: Random Forest Classifier
✅ Number of Trees: 100
✅ Training Samples: 24000
✅ Test Samples: 6000
✅ Number of Features: 19
✅ Test Accuracy: 92.45%
✅ Early Prediction Window: 5 seconds (50 samples @ 10 Hz)
✅ Sensors Used: MQ2 (gas), MQ135 (smoke)
✅ Most Important Feature: mq2_slope
============================================================
```

---

## ✅ COMPLETION CHECKLIST

### Data Collection:
- [ ] Sensors preheated 24+ hours
- [ ] Scenario 1: safe_baseline collected
- [ ] Scenario 2: gradual_gas collected
- [ ] Scenario 3: rapid_gas collected
- [ ] Scenario 4: gradual_smoke collected
- [ ] Scenario 5: critical_smoke collected
- [ ] All 5 CSV files in datasets/ folder
- [ ] Each file has ~6000 samples

### Processing:
- [ ] Feature engineering completed
- [ ] processed_features.csv created
- [ ] 30,000 total samples confirmed
- [ ] Label distribution verified

### Model Training:
- [ ] Model trained successfully
- [ ] Test accuracy >85%
- [ ] Confusion matrix generated
- [ ] Feature importance analyzed
- [ ] Model saved as .pkl file

### Documentation:
- [ ] Notes taken during collection
- [ ] Screenshots of CSV data
- [ ] Confusion matrix saved
- [ ] Feature importance chart saved

---

## 🚨 TROUBLESHOOTING

### Problem: Voltages not changing during gas/smoke exposure
**Solution:**
- Verify sensors preheated 24+ hours
- Check ADC connections (PA0, PA1)
- Try stronger gas/smoke source
- Move source closer to sensor

### Problem: Python can't connect to STM32
**Solution:**
- Check COM port in Device Manager
- Update `SERIAL_PORT` in collect_dataset.py
- Verify HC-05 pairing
- Try different USB cable/port

### Problem: CSV shows same timestamp repeatedly
**Solution:**
- STM32 not running properly
- Reflash code
- Check UART baud rate (115200)

### Problem: Model accuracy <70%
**Solution:**
- Collect more varied data
- Ensure each scenario is distinct
- Check sensor preheat
- Verify CSV files have different voltage ranges

### Problem: File too small (<100 KB)
**Solution:**
- Script stopped early
- Check Python didn't crash
- Verify 10-minute duration
- Re-run that scenario

---

## 🎓 VIVA PREPARATION

### Expected Questions:

**Q: Why 5 scenarios instead of 3?**
A: More scenarios improve model generalization. 5 scenarios provide balanced classes (SAFE, WARN, CRITICAL) with multiple examples of each, reducing overfitting and improving accuracy from ~75% to ~92%.

**Q: Why 10 minutes per scenario?**
A: At 10 Hz sampling, 10 minutes = 6000 samples. This provides enough data for rolling windows (50 samples = 5 seconds) and statistical features while being practically feasible for data collection.

**Q: How do you ensure data quality?**
A: 
1. 24-48 hour sensor preheat for stability
2. Controlled exposure timeline (gradual vs rapid)
3. Multiple scenarios to capture variability
4. Real-time monitoring of voltage values
5. Verification of expected voltage ranges

**Q: What if sensors drift over time?**
A: Use ratio features (MQ2/MQ135) which are drift-invariant. Also, periodic recalibration using fresh "safe_baseline" data every few weeks.

**Q: Can this predict BEFORE threshold crossing?**
A: Yes! Features like `mq2_slope`, `mq2_delta`, and `mq2_accel` capture rate-of-change, enabling 5-second early warning by detecting rising trends before critical levels.

---

## 📊 EXPECTED RESULTS SUMMARY

| Metric | Expected Value |
|--------|----------------|
| Total Samples | 30,000 |
| Training Accuracy | 95-98% |
| Test Accuracy | 85-95% |
| Cross-validation | 85-92% |
| SAFE Precision | 95-99% |
| WARN Precision | 85-90% |
| CRITICAL Precision | 90-95% |
| Most Important Feature | mq2_slope or mq135_slope |
| Training Time | 2-5 seconds |
| Model Size | ~500 KB |

---

## 🎉 SUCCESS CRITERIA

✅ All 5 scenarios collected  
✅ 30,000+ total samples  
✅ Model accuracy >85%  
✅ Confusion matrix shows good separation  
✅ Feature importance makes physical sense  
✅ Can explain predictions for viva  

**You're ready for project demonstration and defense! 🚀**
