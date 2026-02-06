# Quick Start Guide - Gas Sensor ML System

## 🚀 FROM HARDWARE TO ML MODEL IN 30 MINUTES

---

## STEP 1: HARDWARE (10 min)

### Minimum Setup:
```
STM32F401/411
├─ PA0  ← MQ2 AOUT
├─ PA1  ← MQ135 AOUT  
├─ PA9  → HC-05 RX
├─ PA10 ← HC-05 TX
├─ PB8  → LCD SCL (optional)
├─ PB9  → LCD SDA (optional)
├─ PB0  → Buzzer (optional)
└─ PB1  → Relay (optional)
```

**✅ YES, MQ2 + MQ135 + HC-05 is enough for ML!**  
(LCD, buzzer, relay are for alerts only)

---

## STEP 2: FLASH STM32 (5 min)

1. Open `stm32_modified_main.c` in STM32CubeIDE
2. Configure peripherals (ADC1, USART1, I2C1)
3. Build & Upload
4. LCD should show: "Gas Sensor ML System Ready"

---

## STEP 3: TEST BLUETOOTH (2 min)

### On PC:
```bash
# Windows
Open Device Manager → Ports → Note COM port (e.g., COM5)

# Pair HC-05
PIN: 1234 or 0000
```

### Test in Python:
```python
import serial
ser = serial.Serial('COM5', 115200, timeout=1)
ser.write(b'STATUS\r\n')
print(ser.read(200))  # Should show MQ2/MQ135 voltages
```

---

## STEP 4: COLLECT DATASET (50 min)

### Run Script 5 Times (One per scenario):
```bash
python ml/collect_dataset.py

# Interactive menu appears:
# Enter 1-5 to select scenario

# Scenario 1: safe_baseline (10 min)
# - Clean air, no disturbances

# Scenario 2: gradual_gas (10 min)  
# - Lighter gas, gradually move closer (30cm→5cm)

# Scenario 3: rapid_gas (10 min)
# - Sudden gas burst, then recovery

# Scenario 4: gradual_smoke (10 min)
# - Incense stick, gradually move closer (50cm→10cm)

# Scenario 5: critical_smoke (10 min)
# - Heavy smoke, sustained near sensor
```

**Output:** 5 CSV files in `datasets/` folder (~30,000 total samples)

---

## STEP 5: TRAIN MODEL (3 min)

```bash
# Feature engineering
python ml/feature_engineering.py

# Train Random Forest
python ml/train_model.py
```

**Output:**
- Model: `models/gas_sensor_rf_model.pkl`
- Accuracy: ~85-95% (depends on data quality)
- Confusion matrix: `results/confusion_matrix.png`

---

## 📋 STM32 COMMANDS REFERENCE

| Command | Action | Example |
|---------|--------|---------|
| `CSV ON` | Start 10 Hz logging | Sends timestamp,mq2,mq135 |
| `CSV OFF` | Stop logging | Returns to alert mode |
| `CSV RATE 20` | Set to 20 Hz | Max 50 Hz |
| `STATUS` | Show sensor values | MQ2: 1.45V, MQ135: 2.01V |
| `SET MQ2 2.5` | Change threshold | For custom scenarios |
| `ALERT ON/OFF` | Toggle buzzer | Disable during logging |
| `HELP` | Command list | Full menu |

---

## 🎯 EXPECTED CSV OUTPUT

```csv
timestamp,mq2,mq135
12340,1.423,1.987
12440,1.456,2.012
12540,1.489,2.045
12640,1.523,2.089
...
```

**Format:**
- `timestamp`: milliseconds since STM32 boot
- `mq2`: voltage 0.000-3.300V
- `mq135`: voltage 0.000-3.300V
- Rate: 10 samples/sec (100ms interval)
- Duration: 10 minutes = 6000 samples

---

## 🔍 ML FEATURES GENERATED

From raw MQ2/MQ135, Python creates:

1. **mq2, mq135** (current values)
2. **mq2_delta, mq135_delta** (rate of change)
3. **mq2_accel, mq135_accel** (acceleration)
4. **mq2_mean_5s, mq135_mean_5s** (smoothing)
5. **mq2_max_5s, mq135_max_5s** (peak detection)
6. **mq2_std_5s, mq135_std_5s** (volatility)
7. **mq2_slope, mq135_slope** (trend)
8. **mq2_mq135_ratio** (gas signature)
9. **total_gas** (combined load)

**Total: 19 features** → Random Forest → **3 classes (SAFE/WARN/CRITICAL)**

---

## 🎓 VIVA ANSWERS CHEAT SHEET

### Q: Why Random Forest?
**A:** Handles non-linear sensor response, combines weak features (ratio, slope) into strong predictor, robust to noise via ensemble averaging.

### Q: Why 10 Hz sampling?
**A:** MQ sensors have ~2s response time. 10 Hz captures gas dynamics without oversampling. Follows Nyquist theorem (2× bandwidth).

### Q: How does early prediction work?
**A:** By analyzing rate-of-change (ΔV/Δt) and slope trends, we predict threshold crossing 5 seconds ahead. Gas diffusion is gradual, not instantaneous.

### Q: Why MQ2 AND MQ135?
**A:** MQ2 = flammable gases (LPG, methane), MQ135 = air pollutants (smoke, CO2). Combination enables gas type classification.

### Q: Accuracy expected?
**A:** 85-95% depending on:
- Sensor preheat (24-48 hrs)
- Clean/noisy environment
- Scenario variety (need 4+ types)
- Feature quality (rolling windows)

### Q: Real-world deployment?
**A:** STM32 logs → Python trains → Export model → Re-deploy on STM32 using X-CUBE-AI or run inference on edge device (Raspberry Pi).

---

## ⚠️ COMMON MISTAKES

### ❌ Sensor not preheated
**Fix:** Leave MQ2/MQ135 powered 24+ hours before collecting data

### ❌ Wrong COM port
**Fix:** Check Device Manager, update `collect_dataset.py` line 11

### ❌ Bluetooth not paired
**Fix:** Pair HC-05 first (PIN: 1234), then run script

### ❌ CSV header missing
**Fix:** Ensure `CSV ON` command sent before starting Python script

### ❌ Low feature importance
**Fix:** Collect more varied scenarios (safe, gradual, rapid, critical)

### ❌ Overfitting (100% train, 60% test)
**Fix:** Reduce `max_depth` in RandomForest, increase `min_samples_split`

---

## 📊 EXPECTED RESULTS

### Dataset Size (per scenario):
- Duration: 10 min
- Samples: 6000
- File size: ~150 KB
- Total (4 scenarios): 24000 samples, ~600 KB

### Model Performance:
```
Classification Report:
              precision  recall  f1-score
SAFE            0.98     0.99     0.98
WARN            0.87     0.85     0.86
CRITICAL        0.92     0.94     0.93

Accuracy: 92%
```

### Feature Importance (Top 5):
1. mq2_slope (0.18) ← **Most important!**
2. mq135_slope (0.15)
3. mq2_delta (0.12)
4. mq2_max_5s (0.11)
5. mq135_delta (0.10)

**Insight:** Trend features (slope, delta) dominate → confirms early prediction is possible!

---

## 🚀 NEXT STEPS

### For Project Demo:
1. Show hardware setup
2. Live CSV logging (1 min)
3. Load pre-trained model
4. Real-time prediction demo

### For Advanced:
1. Deploy model on STM32 using X-CUBE-AI
2. Add LSTM for sequential prediction
3. Create web dashboard (Flask + Chart.js)
4. Multi-sensor fusion (add DHT22 for context)

---

## 📁 FILE STRUCTURE

```
IoT-Dashboard/
├── ml/
│   ├── stm32_modified_main.c      ← Flash this
│   ├── HARDWARE_SETUP.md          ← Wiring guide
│   ├── collect_dataset.py         ← Step 1: Data collection
│   ├── feature_engineering.py     ← Step 2: Feature creation
│   ├── train_model.py             ← Step 3: Model training
│   ├── datasets/                  ← CSV files stored here
│   ├── models/                    ← Trained model (.pkl)
│   └── results/                   ← Confusion matrix, plots
```

---

## ✅ PROJECT COMPLETION CHECKLIST

- [ ] Hardware assembled and tested
- [ ] STM32 code flashed
- [ ] Bluetooth connection verified
- [ ] 4 datasets collected (safe, gradual, rapid, critical)
- [ ] Features engineered (19 features)
- [ ] Random Forest trained (>85% accuracy)
- [ ] Confusion matrix generated
- [ ] Feature importance analyzed
- [ ] Documentation prepared
- [ ] Viva questions rehearsed

---

**You're ready for final demo! 🎉**

**Estimated Total Time:** 4-6 hours (including sensor preheat)  
**Cost:** $20-30 USD  
**Complexity:** Intermediate  
**Viva Rating:** ⭐⭐⭐⭐⭐ (Strong ML justification)
