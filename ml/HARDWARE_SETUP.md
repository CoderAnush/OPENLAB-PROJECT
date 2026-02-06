# Hardware Setup Guide
## Gas Sensor Early Warning System with ML Data Logging

---

## ✅ MINIMUM REQUIRED COMPONENTS

Yes, **MQ2 + MQ135 + HC-05** are the core sensors, but you need additional components for a complete system.

### **Essential Hardware List**

| Component | Quantity | Purpose | Connection |
|-----------|----------|---------|------------|
| **STM32F401/411** | 1 | Main microcontroller | - |
| **MQ2 Gas Sensor** | 1 | LPG/Propane/Methane detection | ADC (PA0) |
| **MQ135 Air Quality Sensor** | 1 | Smoke/CO2/NH3 detection | ADC (PA1) |
| **HC-05 Bluetooth Module** | 1 | Data logging & commands | UART1 (PA9/PA10) |
| **16x2 I2C LCD** | 1 | Real-time display | I2C (PB6/PB7) |
| **Buzzer (Active)** | 1 | Audio alert | PB0 |
| **5V Relay Module** | 1 | Fan control | PB1 |
| **DC Fan (5V/12V)** | 1 | Ventilation | Via relay (PB10) |
| **LEDs (Optional)** | 2 | Visual indicators (NOT USED) | PA6, PA7 |
| **Resistors (Optional)** | 2 | LED current limiting (NOT USED) | - |
| **Breadboard + Jumpers** | 1 set | Prototyping | - |
| **5V Power Supply** | 1 | System power | USB or adapter |

---

## 📐 DETAILED WIRING DIAGRAM

### **STM32 Pin Configuration**

```
STM32F401/411CE (Black Pill / Blue Pill)
┌─────────────────────────────────────┐
│                                     │
│  PA0  ← MQ2 Analog Out              │
│  PA1  ← MQ135 Analog Out            │
│                                     │
│  PA4  ← HC-05 STATE                 │
│  PA6  → LED1 (Optional - Not used)  │
│  PA7  → LED2 (Optional - Not used)  │
│                                     │
│  PA9  → HC-05 RX (UART1 TX)         │
│  PA10 ← HC-05 TX (UART1 RX)         │
│                                     │
│  PB0  → Buzzer Signal               │
│  PB1  → Relay IN                    │
│  PB8  → I2C1 SCL (LCD)              │
│  PB9  → I2C1 SDA (LCD)              │
│  PB10 → Fan Control (via relay)     │
│                                     │
│  3.3V → Sensors VCC + HC-05         │
│  GND  → Common Ground               │
└─────────────────────────────────────┘
```

---

## 🔌 COMPONENT CONNECTIONS

### **1. MQ2 Gas Sensor**
```
MQ2 Module
┌──────────┐
│ VCC  →  5V (STM32)
│ GND  →  GND
│ AOUT →  PA0 (ADC Channel 0)
│ DOUT →  Not used
└──────────┘
```
- **Preheat time:** 24-48 hours for accurate readings
- **Operating voltage:** 5V
- **Output:** 0-3.3V analog

### **2. MQ135 Air Quality Sensor**
```
MQ135 Module
┌──────────┐
│ VCC  →  5V (STM32)
│ GND  →  GND
│ AOUT →  PA1 (ADC Channel 1)
│ DOUT →  Not used
└──────────┘
```
- **Preheat time:** 24-48 hours
- **Operating voltage:** 5V
- **Output:** 0-3.3V analog

⚠️ **IMPORTANT:** MQ sensors output up to 5V on some modules. Use a voltage divider if needed:
```
AOUT ──[10kΩ]──┬──── PA0/PA1
               │
             [10kΩ]
               │
              GND
```

### **3. HC-05 Bluetooth Module**
```
HC-05
┌──────────┐
│ VCC  →  3.3V or 5V (check module specs)
│ GND  →  GND
│ TX   →  PA10 (STM32 RX)
│ RX   →  PA9  (STM32 TX) - Use voltage divider!
│ EN   →  Not connected
│ STATE→  Not connected
└──────────┘
```

⚠️ **CRITICAL:** HC-05 RX is 3.3V tolerant. If using 5V module, add voltage divider:
```
PA9 (TX) ──[1kΩ]──┬──── HC-05 RX
                   │
                 [2kΩ]
                   │
                  GND
```

**Baud Rate:** 115200 (default HC-05 AT mode: 38400)

### **4. I2C LCD (16x2)**
```
I2C LCD Module (PCF8574)
┌──────────┐
│ VCC  →  3.3V (STM32 common VCC)
│ GND  →  GND (common ground)
│ SDA  →  PB9 (I2C1_SDA)
│ SCL  →  PB8 (I2C1_SCL)
└──────────┘
```
- **I2C Address:** 0x27 or 0x3F (scan if needed)
- **Pull-up resistors:** Usually on module

### **5. Buzzer (Active)**
```
Buzzer
┌──────────┐
│ +    →  PB0 (via transistor recommended)
│ -    →  GND
└──────────┘
```
- **Type:** Active buzzer (built-in oscillator)
- **Voltage:** 3-5V
- **Optional:** Use NPN transistor (2N2222) for amplification

### **6. Relay Module (5V)**
```
Relay Module
┌──────────┐
│ VCC  →  5V
│ GND  →  GND
│ IN   →  PB1
│ COM  →  Fan Power +
│ NO   →  Fan VCC
└──────────┘
```
- **Type:** 1-channel 5V relay
- **Load:** DC fan (5V or 12V)

### **7. DC Fan**
```
Fan (connected via relay)
┌──────────┐
│ +    →  Relay NO
│ -    →  Power Supply GND
└──────────┘

Power Supply → Relay COM
```

### **8. LEDs (Visual Indicators)**
```
LED1 (MQ2 - Yellow)
PA6 ──[220Ω]──[LED]──GND

LED2 (MQ135 - Red)
PA7 ──[220Ω]──[LED]──GND
```

---

## ⚡ POWER SUPPLY

### **Option 1: USB Power (5V)**
- STM32 powered via USB
- Sensors, relay, fan powered from 5V pin
- **Limitation:** Max ~500mA from USB

### **Option 2: External 5V Adapter (Recommended)**
- Use 5V 2A adapter
- Connect to STM32 5V pin
- Sufficient for all components + fan

### **Option 3: Dual Supply (Best)**
- 5V 1A for STM32 + sensors + relay
- 12V 1A for fan (if using 12V fan)

---

## 🔧 STM32CubeIDE CONFIGURATION

### **Peripherals to Enable:**

1. **ADC1**
   - PA0 → IN0 (MQ2)
   - PA1 → IN1 (MQ135)
   - Resolution: 12-bit
   - Sampling time: 56 cycles

2. **USART1**
   - Mode: Asynchronous
   - Baud Rate: 115200
   - Word Length: 8 bits
   - Stop Bits: 1
   - Parity: None
   - Enable NVIC interrupt

3. **I2C1**
   - Mode: I2C
   - Speed: 100 kHz (Standard)
   - PB8 → SCL
   - PB9 → SDA

4. **TIM3** (if using PWM for buzzer tones - optional)
   - Prescaler: 84-1
   - Period: 1000

5. **GPIOs**
   - PA6, PA7: Output (LEDs)
   - PB0: Output (Buzzer)
   - PB1: Output (Relay)
   - PB10: Output (Fan - if direct control)

---

## 📱 TESTING PROCEDURE

### **Step 1: Basic Power Test**
1. Connect STM32 to USB
2. Check 5V and 3.3V pins with multimeter
3. Verify LCD backlight turns on

### **Step 2: Sensor Test**
1. Upload code
2. Open serial terminal (115200 baud)
3. Type `STATUS` → Should show MQ2/MQ135 voltages
4. Expose MQ2 to lighter gas → Voltage should increase

### **Step 3: Bluetooth Test**
1. Pair HC-05 (default PIN: 1234 or 0000)
2. Connect via Bluetooth terminal app
3. Send `HELP` → Should receive command list
4. Send `CSV ON` → Should receive CSV header

### **Step 4: CSV Logging Test**
```bash
python ml/collect_dataset.py
```
- Should log timestamp, MQ2, MQ135 at 10 Hz
- File saved in `datasets/` folder

---

## 🛠️ TROUBLESHOOTING

### **Sensors always show 0V**
- Check 5V power to MQ sensors
- Verify ADC pins (PA0, PA1)
- Ensure sensors preheated (24-48 hrs)

### **HC-05 not responding**
- Check TX/RX crossed (TX→RX, RX→TX)
- Verify baud rate (115200)
- Check VCC (3.3V or 5V depending on module)
- Test with USB-TTL first

### **LCD not displaying**
- Check I2C address (0x27 or 0x3F)
- Use I2C scanner sketch
- Verify pull-up resistors on SDA/SCL
- Check contrast potentiometer on LCD module

### **Relay not switching**
- Check 5V power to relay module
- Verify PB1 output (should be HIGH when gas detected)
- Test relay manually (connect IN to 5V)

### **Buzzer not beeping**
- Check active vs passive buzzer
- Verify PB0 connection
- Test with direct 5V connection

---

## 📦 RECOMMENDED PURCHASE LINKS (Example)

- **STM32F401CCU6 Black Pill** - $3-5
- **MQ2 Gas Sensor Module** - $2-3
- **MQ135 Air Quality Module** - $2-3
- **HC-05 Bluetooth Module** - $3-5
- **I2C 16x2 LCD** - $2-3
- **5V Relay Module** - $1-2
- **Active Buzzer 5V** - $0.50
- **DC Fan 5V** - $2-3
- **LEDs + Resistors Kit** - $2

**Total Cost: ~$20-30 USD**

---

## ✅ FINAL CHECKLIST

- [ ] All components purchased
- [ ] STM32CubeIDE project configured
- [ ] Wiring completed per diagram
- [ ] MQ sensors preheated 24+ hours
- [ ] Code uploaded successfully
- [ ] Bluetooth pairing works
- [ ] CSV logging tested
- [ ] Python scripts tested
- [ ] LCD displays voltage
- [ ] Fan activates on gas detection

---

## 🎓 VIVA DEFENSE POINTS

**Q: Why MQ2 and MQ135?**  
A: MQ2 detects flammable gases (LPG, propane), MQ135 detects air pollutants (smoke, CO2, NH3). Together they provide comprehensive air quality monitoring.

**Q: Why HC-05 over USB cable?**  
A: Enables wireless data collection without tethering, useful for deploying sensor in hazardous areas away from PC.

**Q: Why 10 Hz sampling?**  
A: MQ sensors have ~2s response time. 10 Hz (100ms) captures gas dynamics without oversampling. Nyquist theorem: 2× sensor bandwidth.

**Q: Can this work without LCD/buzzer?**  
A: Yes! Minimum system: STM32 + MQ2 + MQ135 + HC-05. LCD/buzzer are for user feedback only.

---

## 📸 SUGGESTED PHOTOS FOR DOCUMENTATION

1. Complete hardware setup (top view)
2. Wiring connections (close-up)
3. LCD showing voltage readings
4. Serial terminal with CSV data
5. Python script running
6. Gas exposure test (lighter near sensor)

---

**Hardware setup complete! Ready for ML dataset collection.** 🚀
