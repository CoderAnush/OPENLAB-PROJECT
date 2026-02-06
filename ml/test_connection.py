import serial
import time

print("Testing STM32 data stream...")
ser = serial.Serial('COM9', 115200, timeout=1)
time.sleep(2)

start = time.time()
count = 0

while (time.time() - start) < 10:
    line = ser.readline().decode('utf-8', errors='ignore').strip()
    if line:
        elapsed = time.time() - start
        count += 1
        print(f'{elapsed:.2f}s: {line}')

ser.close()
print(f"\nTotal lines received in 10 seconds: {count}")
print(f"Rate: {count/10:.1f} lines/second")
