# 🚀 QUICK COMMAND REFERENCE

## ONE-PAGE GUIDE - Keep This Open!

---

## 📡 STM32 COMMANDS (via Bluetooth Terminal)

```
CSV ON              → Start 10 Hz CSV logging
CSV OFF             → Stop logging
CSV RATE 20         → Change to 20 Hz (1-50 Hz allowed)
STATUS              → Show MQ2/MQ135 voltages + settings
SET MQ2 2.5         → Update MQ2 threshold
SET MQ135 2.0       → Update MQ135 threshold
ALERT ON/OFF        → Enable/disable buzzer alerts
HELP                → Show all commands
```

---

## 💻 PYTHON COMMANDS

### Collect Data (Run 5 times, select different scenarios)
```powershell
python ml/collect_dataset.py

# Interactive menu:
# 1 = safe_baseline
# 2 = gradual_gas
# 3 = rapid_gas
# 4 = gradual_smoke
# 5 = critical_smoke
```

### Process Data (Run once after all 5 collected)
```powershell
python ml/feature_engineering.py
```

### Train Model (Run once)
```powershell
python ml/train_model.py
```

### Check Files
```powershell
ls datasets/          # List CSV files
ls models/           # Check for .pkl model
ls results/          # View confusion matrix, plots
```

---

## 🎯 SCENARIO QUICK REFERENCE

| # | Scenario | Gas/Smoke Source | Timeline | Target Sensor |
|---|----------|------------------|----------|---------------|
| 1 | safe_baseline | None (clean air) | 10 min still | Both low |
| 2 | gradual_gas | Lighter (unlit) | 0→2→4→6→8→10 min | MQ2 ↑ |
| 3 | rapid_gas | Lighter (burst) | 0→1 min spike | MQ2 ↑↑ |
| 4 | gradual_smoke | Incense stick | 0→2→4→6→8→10 min | MQ135 ↑ |
| 5 | critical_smoke | Multiple incense | 1-10 min heavy | MQ135 ↑↑ |

---

## 📊 EXPECTED VOLTAGE RANGES

| Scenario | MQ2 Voltage | MQ135 Voltage |
|----------|-------------|---------------|
| Safe | 0.4-1.0V | 0.8-1.3V |
| Gradual Gas | 1.0-2.5V | 0.8-1.8V |
| Rapid Gas | 0.5→3.0V | 1.0-2.0V |
| Gradual Smoke | 0.5-1.5V | 1.0-2.8V |
| Critical Smoke | 1.0-2.0V | 2.0-3.3V |

⚠️ **If sensor exceeds 3.3V, move source away immediately!**

---

## 🔧 TROUBLESHOOTING QUICK FIXES

| Problem | Quick Fix |
|---------|-----------|
| Python can't connect | Check COM port in Device Manager |
| No voltage change | Verify sensor preheat (24+ hrs) |
| CSV not created | Run `CSV ON` command first |
| Script crashes | Check SERIAL_PORT in line 11 |
| Bluetooth not pairing | Use PIN: 1234 or 0000 |
| LCD not showing | Verify I2C: PB8=SCL, PB9=SDA |

---

## ✅ SUCCESS INDICATORS

### Good Dataset:
- ✅ 5 CSV files in `datasets/` folder
- ✅ Each ~150-200 KB (~6000 samples)
- ✅ Voltages vary across scenarios
- ✅ No repeated timestamps

### Good Model:
- ✅ Test accuracy >85%
- ✅ SAFE precision >95%
- ✅ Confusion matrix shows clear separation
- ✅ `mq2_slope` or `mq135_slope` is top feature

---

## 📁 FILE LOCATIONS

```
IoT-Dashboard/
└── ml/
    ├── collect_dataset.py          ← Run 5 times
    ├── feature_engineering.py      ← Run once
    ├── train_model.py             ← Run once
    ├── stm32_modified_main.c      ← Flash to STM32
    ├── datasets/                  ← CSV files here
    │   ├── safe_baseline_*.csv
    │   ├── gradual_gas_*.csv
    │   ├── rapid_gas_*.csv
    │   ├── gradual_smoke_*.csv
    │   ├── critical_smoke_*.csv
    │   └── processed_features.csv
    ├── models/
    │   └── gas_sensor_rf_model.pkl
    └── results/
        ├── confusion_matrix.png
        └── feature_importance.png
```

---

## ⏱️ TIME ESTIMATES

| Task | Duration |
|------|----------|
| Sensor preheat | 24-48 hours (one-time) |
| Per scenario collection | 10 minutes |
| **Total collection** | **50 minutes** |
| Feature engineering | 2 minutes |
| Model training | 3 minutes |
| **Total active work** | **~65 minutes** |

---

## 🎓 TOP 5 VIVA QUESTIONS & ANSWERS

**Q1: Why Random Forest?**  
✅ Non-linear sensor response, ensemble reduces overfitting, explainable features

**Q2: How early can you predict?**  
✅ 5 seconds ahead using rate-of-change features (slope, delta)

**Q3: Why 10 Hz sampling?**  
✅ MQ sensors have ~2s response time, 10 Hz captures dynamics per Nyquist

**Q4: What if sensors drift?**  
✅ Ratio features (MQ2/MQ135) are drift-invariant + periodic recalibration

**Q5: Why 5 scenarios?**  
✅ Balanced classes (SAFE/WARN/CRITICAL), better generalization, 85-95% accuracy

---

## 📞 EMERGENCY CONTACTS (OPTIONAL)

Project guide: _____________________  
Lab supervisor: ____________________  
Teammate: __________________________

---

## 🎯 TODAY'S GOAL

**Collect 5 scenarios × 10 min = 50 minutes of data**  
**Train model → Achieve >85% accuracy**  
**Generate plots for documentation**

**YOU GOT THIS! 💪**

---

**Print this page and keep it visible during data collection!**
