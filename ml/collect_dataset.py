"""
STM32 Gas Sensor Dataset Collection Script
Logs MQ2 and MQ135 data for ML training

5-SCENARIO COLLECTION PLAN:
1. safe_baseline    - Clean air (10 min)
2. gradual_gas      - Slow gas exposure (10 min)
3. rapid_gas        - Fast gas leak (10 min)
4. gradual_smoke    - Slow smoke exposure (10 min)
5. critical_smoke   - Heavy smoke (10 min)
"""

import serial
import csv
import time
from datetime import datetime
import os

# ========== CONFIGURATION ==========
SERIAL_PORT = 'COM4'          # Change to your STM32 COM port
BAUD_RATE = 9600              # Must match STM32 UART config
LOGGING_DURATION = 600        # 10 minutes (in seconds)
OUTPUT_FOLDER = 'datasets'

# ========== SCENARIO SELECTION ==========
print("="*60)
print("GAS SENSOR ML DATASET COLLECTION")
print("="*60)
print("\nAvailable Scenarios:")
print("1. safe_baseline    - Clean air environment")
print("2. gradual_gas      - Gradual gas exposure (lighter)")
print("3. rapid_gas        - Rapid gas leak simulation")
print("4. gradual_smoke    - Gradual smoke exposure (incense)")
print("5. critical_smoke   - Critical smoke levels")
print("\n" + "="*60)

scenario_choice = input("\nEnter scenario number (1-5): ").strip()

scenario_map = {
    '1': 'safe_baseline',
    '2': 'gradual_gas',
    '3': 'rapid_gas',
    '4': 'gradual_smoke',
    '5': 'critical_smoke'
}

if scenario_choice not in scenario_map:
    print("❌ Invalid choice! Using 'safe_baseline' as default.")
    SCENARIO_NAME = 'safe_baseline'
else:
    SCENARIO_NAME = scenario_map[scenario_choice]

print(f"\n✅ Selected: {SCENARIO_NAME}")
print("="*60 + "\n")

# ========== SETUP ==========
os.makedirs(OUTPUT_FOLDER, exist_ok=True)
timestamp_str = datetime.now().strftime('%Y%m%d_%H%M%S')
filename = f"{OUTPUT_FOLDER}/{SCENARIO_NAME}_{timestamp_str}.csv"

# Display instructions based on scenario
instructions = {
    'safe_baseline': """
📋 INSTRUCTIONS:
   - Keep sensors in clean, well-ventilated area
   - No gas or smoke sources nearby
   - Do NOT disturb for 10 minutes
   - This establishes baseline for SAFE class
""",
    'gradual_gas': """
📋 INSTRUCTIONS:
   - Start in clean air (0-2 min)
   - Use UNLIT lighter 30cm away (2-4 min)
   - Move to 20cm (4-6 min)
   - Move to 10cm (6-8 min)
   - Hold near sensor 5-10cm (8-10 min)
   - ⚠️ DO NOT ignite lighter!
""",
    'rapid_gas': """
📋 INSTRUCTIONS:
   - Start in clean air (0-1 min)
   - SUDDEN gas release at 5cm (1-3 min)
   - Maintain high concentration (3-5 min)
   - Gradually move away (5-10 min)
   - ⚠️ Simulates emergency gas leak
""",
    'gradual_smoke': """
📋 INSTRUCTIONS:
   - Start in clean air (0-2 min)
   - Light incense stick, hold 50cm away (2-4 min)
   - Move to 30cm (4-6 min)
   - Move to 15cm (6-8 min)
   - Move to 10cm (8-10 min)
   - ✅ Use incense holder for safety
""",
    'critical_smoke': """
📋 INSTRUCTIONS:
   - Start in clean air (0-1 min)
   - Heavy smoke 5-10cm from sensor (1-5 min)
   - Maintain high smoke concentration (5-10 min)
   - 💡 Use multiple incense sticks if needed
   - ⚠️ Work in ventilated area
"""
}

print(instructions.get(SCENARIO_NAME, "Follow standard procedure"))

print(f"🔧 Connecting to {SERIAL_PORT} at {BAUD_RATE} baud...")
ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=2)
time.sleep(2)  # Wait for STM32 reset

# Clear buffer
ser.reset_input_buffer()

print("✅ Ready to collect data (using existing STM32 format)")

# ========== DATA COLLECTION ==========
print(f"📊 Logging to: {filename}")
print(f"⏱️  Duration: {LOGGING_DURATION} seconds ({LOGGING_DURATION//60} min)")
print("🔴 Press Ctrl+C to stop early\n")

start_time = time.time()
sample_count = 0

try:
    with open(filename, 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(['timestamp', 'mq2', 'mq135'])  # CSV header
        
        while (time.time() - start_time) < LOGGING_DURATION:
            if ser.in_waiting > 0:
                line = ser.readline().decode('utf-8', errors='ignore').strip()
                
                # Parse format: "MQ2: 1.18, MQ135: 0.54"
                if line and 'MQ2:' in line and 'MQ135:' in line:
                    try:
                        # Extract MQ2 value
                        mq2_start = line.find('MQ2:') + 4
                        mq2_end = line.find(',', mq2_start)
                        mq2 = float(line[mq2_start:mq2_end].strip())
                        
                        # Extract MQ135 value
                        mq135_start = line.find('MQ135:') + 6
                        mq135 = float(line[mq135_start:].strip())
                        
                        # Generate timestamp (seconds since start with milliseconds)
                        timestamp = time.time() - start_time
                        
                        # Write to CSV
                        writer.writerow([f'{timestamp:.3f}', f'{mq2:.3f}', f'{mq135:.3f}'])
                        sample_count += 1
                        
                        # Progress indicator
                        if sample_count % 100 == 0:
                            elapsed = time.time() - start_time
                            rate = sample_count / elapsed if elapsed > 0 else 0
                            print(f"✅ {sample_count} samples | {elapsed:.1f}s | {rate:.1f} Hz | MQ2: {mq2:.3f}V | MQ135: {mq135:.3f}V")
                    except (ValueError, IndexError) as e:
                        # Skip malformed lines
                        continue

except KeyboardInterrupt:
    print("\n⚠️  Stopped by user")

finally:
    # ========== CLEANUP ==========
    print("\n🛑 Closing connection...")
    ser.close()
    
    elapsed = time.time() - start_time
    print(f"\n{'='*60}")
    print(f"✅ COLLECTION COMPLETE - Scenario: {SCENARIO_NAME}")
    print(f"{'='*60}")
    print(f"   Samples collected: {sample_count}")
    print(f"   Duration: {elapsed:.1f} seconds")
    print(f"   Average rate: {sample_count/elapsed:.2f} Hz")
    print(f"   File: {filename}")
    print(f"   Size: {os.path.getsize(filename)/1024:.2f} KB")
    print(f"{'='*60}\n")
    
    # Show next steps
    remaining_scenarios = []
    all_scenarios = ['safe_baseline', 'gradual_gas', 'rapid_gas', 'gradual_smoke', 'critical_smoke']
    
    for scenario in all_scenarios:
        scenario_files = [f for f in os.listdir(OUTPUT_FOLDER) if f.startswith(scenario)]
        if not scenario_files:
            remaining_scenarios.append(scenario)
    
    if remaining_scenarios:
        print("📋 REMAINING SCENARIOS:")
        for i, scenario in enumerate(remaining_scenarios, 1):
            print(f"   {i}. {scenario}")
        print(f"\n💡 Run script again to collect next scenario")
        print(f"   Total progress: {5 - len(remaining_scenarios)}/5 complete\n")
    else:
        print("🎉 ALL 5 SCENARIOS COLLECTED!")
        print("📊 Next step: Run feature engineering")
        print("   python ml/feature_engineering.py\n")
