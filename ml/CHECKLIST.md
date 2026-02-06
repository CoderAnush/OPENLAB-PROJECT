# ✅ DATA COLLECTION CHECKLIST - Print This!

## 🔧 BEFORE STARTING (24-48 hours ahead)

- [ ] All hardware connected correctly
  - [ ] MQ2 → PA0
  - [ ] MQ135 → PA1  
  - [ ] HC-05 → PA9, PA10
- [ ] STM32 code flashed successfully
- [ ] Sensors powered on for preheat (24-48 hrs)
- [ ] Python script tested (COM port verified)
- [ ] Materials ready: lighter, incense, matches

---

## 📊 SCENARIO 1: SAFE BASELINE
**Duration:** 10 minutes | **Started:** ____:____ | **Ended:** ____:____

- [ ] Sensors in clean, ventilated area
- [ ] No smoke/gas sources nearby
- [ ] Run: `python ml/collect_dataset.py` → Enter: 1
- [ ] Do NOT disturb for 10 minutes
- [ ] File created: `safe_baseline_*.csv`
- [ ] MQ2 voltage: 0.4-1.0V ✓
- [ ] MQ135 voltage: 0.8-1.3V ✓

---

## 📊 SCENARIO 2: GRADUAL GAS
**Duration:** 10 minutes | **Started:** ____:____ | **Ended:** ____:____

- [ ] Lighter ready (DO NOT IGNITE!)
- [ ] Run: `python ml/collect_dataset.py` → Enter: 2
- [ ] **Timeline:**
  - [ ] 0-2 min: Clean air
  - [ ] 2-4 min: Lighter 30cm away, small puffs
  - [ ] 4-6 min: Move to 20cm
  - [ ] 6-8 min: Move to 10cm
  - [ ] 8-10 min: Hold 5-10cm
- [ ] File created: `gradual_gas_*.csv`
- [ ] MQ2 increased from ~0.5V to >2.0V ✓

---

## 📊 SCENARIO 3: RAPID GAS
**Duration:** 10 minutes | **Started:** ____:____ | **Ended:** ____:____

- [ ] Run: `python ml/collect_dataset.py` → Enter: 3
- [ ] **Timeline:**
  - [ ] 0-1 min: Clean air
  - [ ] 1-3 min: SUDDEN gas release at 5cm
  - [ ] 3-5 min: Maintain high concentration
  - [ ] 5-10 min: Gradually move away (recovery)
- [ ] File created: `rapid_gas_*.csv`
- [ ] MQ2 rapid spike to >2.5V ✓

---

## 📊 SCENARIO 4: GRADUAL SMOKE
**Duration:** 10 minutes | **Started:** ____:____ | **Ended:** ____:____

- [ ] Incense stick + holder ready
- [ ] Fire-safe surface prepared
- [ ] Run: `python ml/collect_dataset.py` → Enter: 4
- [ ] **Timeline:**
  - [ ] 0-2 min: Clean air (before lighting)
  - [ ] 2-4 min: Light incense, hold 50cm away
  - [ ] 4-6 min: Move to 30cm
  - [ ] 6-8 min: Move to 15cm
  - [ ] 8-10 min: Hold 10cm
- [ ] File created: `gradual_smoke_*.csv`
- [ ] MQ135 increased to >2.0V ✓

---

## 📊 SCENARIO 5: CRITICAL SMOKE
**Duration:** 10 minutes | **Started:** ____:____ | **Ended:** ____:____

- [ ] 2-3 incense sticks ready
- [ ] Good ventilation confirmed
- [ ] Run: `python ml/collect_dataset.py` → Enter: 5
- [ ] **Timeline:**
  - [ ] 0-1 min: Clean air
  - [ ] 1-10 min: Heavy smoke 5-10cm from sensor
- [ ] File created: `critical_smoke_*.csv`
- [ ] MQ135 sustained >2.5V ✓

---

## 🔧 AFTER COLLECTION

- [ ] Verify 5 CSV files in `datasets/` folder
- [ ] Each file ~150-200 KB
- [ ] Run: `python ml/feature_engineering.py`
- [ ] Output: `processed_features.csv` created
- [ ] Total samples: ~30,000 ✓
- [ ] Run: `python ml/train_model.py`
- [ ] Model accuracy: ____% (target: >85%)
- [ ] Files generated:
  - [ ] `models/gas_sensor_rf_model.pkl`
  - [ ] `results/confusion_matrix.png`
  - [ ] `results/feature_importance.png`

---

## 📝 NOTES / OBSERVATIONS

Scenario 1 observations:
_________________________________________________________________

Scenario 2 observations:
_________________________________________________________________

Scenario 3 observations:
_________________________________________________________________

Scenario 4 observations:
_________________________________________________________________

Scenario 5 observations:
_________________________________________________________________

Issues encountered:
_________________________________________________________________

Model performance:
_________________________________________________________________

---

## ⚠️ SAFETY REMINDERS

- [ ] Work in ventilated area
- [ ] Never ignite lighter near sensors
- [ ] Use incense holder (not hand-held)
- [ ] Fire extinguisher/water nearby
- [ ] Monitor sensor voltages (should not exceed 3.3V)

---

**Date:** ________________  
**Collected by:** ________________  
**Total time:** ________________  
**Final accuracy:** ________________

✅ PROJECT COMPLETE - READY FOR VIVA!
