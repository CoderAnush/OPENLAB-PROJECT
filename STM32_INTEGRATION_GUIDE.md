# STM32 INTEGRATION GUIDE
## Modifying `stm32_modified_main.c` for AI Command Processing

---

## Current State Analysis

Your `stm32_modified_main.c` already has:
```c
✅ UART communication (HC-05 Bluetooth on PA9/PA10)
✅ MQ2/MQ135 ADC reading (PA0/PA1)
✅ Buzzer, Fan, Relay control (PB0, PB10, PB1)
✅ COMMAND_PAUSE_MS for command debouncing
✅ Threshold-based alerting
```

What's missing:
```c
❌ AI command parsing (AI_SAFE, AI_WARN, AI_CRITICAL)
❌ Priority logic (AI overrides but doesn't replace thresholds)
❌ Confidence-based triggering
❌ Fail-safe when Bluetooth disconnects
```

---

## Modifications Required

### 1. Add AI Command Parsing Structure

**Location:** After the existing command parsing (around line 200)

```c
/* AI Command Definitions (STEP 4: AI COMMAND PROTOCOL) */
typedef enum {
    AI_SAFE = 0,
    AI_WARN = 1,
    AI_CRITICAL = 2,
    AI_UNKNOWN = -1
} AI_Command_t;

/* Global AI state */
AI_Command_t last_ai_command = AI_SAFE;
uint32_t last_ai_command_time = 0;
uint8_t ai_command_timeout_ms = 5000;  // If no AI command in 5s, use threshold only

/* Parse incoming AI command from PC */
AI_Command_t parse_ai_command(char* rx_data) {
    /* Expected format: "AI_SAFE", "AI_WARN", "AI_CRITICAL" */
    
    if (strstr(rx_data, "AI_CRITICAL") != NULL) {
        return AI_CRITICAL;
    }
    else if (strstr(rx_data, "AI_WARN") != NULL) {
        return AI_WARN;
    }
    else if (strstr(rx_data, "AI_SAFE") != NULL) {
        return AI_SAFE;
    }
    
    return AI_UNKNOWN;
}

/* Check if AI commands are still fresh (Bluetooth connected) */
uint8_t is_ai_command_fresh(void) {
    uint32_t now = HAL_GetTick();
    return (now - last_ai_command_time) < ai_command_timeout_ms;
}
```

---

### 2. Update the UART Receive Handler

**Replace/Modify the existing `UART_RxHandler()` or relevant section:**

```c
void UART_RxHandler(char received_char) {
    /* Existing echo/buffer logic... */
    
    rx_buffer[rx_index] = received_char;
    rx_index++;
    
    if (received_char == '\n' || rx_index >= RX_BUFFER_SIZE - 1) {
        rx_buffer[rx_index] = '\0';
        command_ready = 1;
        
        /* NEW: Parse AI commands from PC */
        AI_Command_t ai_cmd = parse_ai_command(rx_buffer);
        if (ai_cmd != AI_UNKNOWN) {
            last_ai_command = ai_cmd;
            last_ai_command_time = HAL_GetTick();
            
            char debug_msg[64];
            snprintf(debug_msg, sizeof(debug_msg), 
                     "AI CMD: %d (TIME:%lu)\r\n", ai_cmd, last_ai_command_time);
            HAL_UART_Transmit(&huart2, (uint8_t*)debug_msg, strlen(debug_msg), 100);
        }
        
        rx_index = 0;
    }
}
```

---

### 3. Implement Priority Logic for Actuation

**New function: Decision hierarchy**

```c
/* 
 * STEP 5: STM32 INTEGRATION PRIORITY LOGIC
 * 
 * Decision Hierarchy:
 * 1. AI_CRITICAL  → Fan ON immediately (highest priority)
 * 2. Threshold    → If MQ2 > CRITICAL or MQ135 > CRITICAL
 * 3. Bluetooth    → If AI commands are stale, fall back to threshold
 * 4. Default      → Safe mode (all off)
 * 
 * KEY: AI overrides initially, but thresholds are ALWAYS active
 */

typedef struct {
    uint8_t fan_on;
    uint8_t buzzer_on;
    uint8_t relay_on;
    char reason[32];  // For debugging: "AI_CRITICAL", "THRESHOLD", "SAFE"
} ActuationState_t;

ActuationState_t compute_actuation(float mq2_v, float mq135_v, 
                                    AI_Command_t ai_cmd, 
                                    uint8_t ai_fresh) {
    ActuationState_t state = {0};
    
    /* Priority 1: AI_CRITICAL (highest) */
    if (ai_fresh && ai_cmd == AI_CRITICAL) {
        state.fan_on = 1;
        state.buzzer_on = 1;
        state.relay_on = 1;
        strcpy(state.reason, "AI_CRITICAL");
        return state;
    }
    
    /* Priority 2: AI_WARN */
    if (ai_fresh && ai_cmd == AI_WARN) {
        state.fan_on = 1;
        state.buzzer_on = 0;  // Optional: reduce false alarm
        state.relay_on = 0;
        strcpy(state.reason, "AI_WARN");
        // Note: Thresholds still override if breached
    }
    
    /* Priority 3: Hard Thresholds (ALWAYS ACTIVE) */
    if (mq2_v >= MQ2_CRITICAL || mq135_v >= MQ135_CRITICAL) {
        state.fan_on = 1;
        state.buzzer_on = 1;
        state.relay_on = 1;
        strcpy(state.reason, "THRESHOLD_CRITICAL");
        return state;
    }
    
    if (mq2_v >= MQ2_WARN || mq135_v >= MQ135_WARN) {
        state.fan_on = 1;
        strcpy(state.reason, "THRESHOLD_WARN");
        return state;
    }
    
    /* Priority 4: Fallback - no threat */
    state.fan_on = 0;
    state.buzzer_on = 0;
    state.relay_on = 0;
    strcpy(state.reason, "SAFE");
    
    return state;
}
```

---

### 4. Update Main Control Loop

**Modify the main sensing & control section (typically in `main()` or a periodic interrupt):**

```c
/* In your main loop or timer interrupt (SENSOR_INTERVAL = 100ms) */
void update_system_state(void) {
    static uint32_t last_update = 0;
    uint32_t now = HAL_GetTick();
    
    if (now - last_update < SENSOR_INTERVAL) {
        return;
    }
    last_update = now;
    
    /* Read sensors */
    uint16_t adc_mq2 = read_adc(ADC_CHANNEL_0);    // PA0
    uint16_t adc_mq135 = read_adc(ADC_CHANNEL_1);  // PA1
    
    MQ2_V = adc_to_voltage(adc_mq2);       // Convert to voltage
    MQ135_V = adc_to_voltage(adc_mq135);
    
    /* NEW: Check if AI commands are still fresh */
    uint8_t ai_fresh = is_ai_command_fresh();
    
    /* NEW: Compute actuation based on priority logic */
    ActuationState_t action = compute_actuation(MQ2_V, MQ135_V, 
                                                 last_ai_command, 
                                                 ai_fresh);
    
    /* Apply actions */
    if (action.fan_on) {
        HAL_GPIO_WritePin(FAN_PORT, FAN_PIN, GPIO_PIN_SET);
    } else {
        HAL_GPIO_WritePin(FAN_PORT, FAN_PIN, GPIO_PIN_RESET);
    }
    
    if (action.buzzer_on) {
        buzzer_on();
    } else {
        buzzer_off();
    }
    
    if (action.relay_on) {
        HAL_GPIO_WritePin(RELAY_PORT, RELAY_PIN, GPIO_PIN_SET);
    } else {
        HAL_GPIO_WritePin(RELAY_PORT, RELAY_PIN, GPIO_PIN_RESET);
    }
    
    /* Optional: Debug logging */
    if (now % 1000 == 0) {  // Every 1 second
        char log_msg[128];
        snprintf(log_msg, sizeof(log_msg),
                 "MQ2:%.2fV MQ135:%.2fV AI:%d FRESH:%d ACTION:%s\r\n",
                 MQ2_V, MQ135_V, last_ai_command, ai_fresh, action.reason);
        HAL_UART_Transmit(&huart2, (uint8_t*)log_msg, strlen(log_msg), 100);
    }
}
```

---

### 5. Add Timeout Protection (Fail-Safe)

**Ensure system is safe if PC loses connection:**

```c
/* In your periodic health-check (e.g., every 100ms) */
void monitor_ai_connection(void) {
    uint8_t ai_fresh = is_ai_command_fresh();
    
    if (!ai_fresh) {
        /* Bluetooth lost or PC offline */
        last_ai_command = AI_SAFE;
        
        /* Optional: Activate emergency mode */
        char warning[] = "⚠️  AI CONNECTION LOST - THRESHOLD MODE ONLY\r\n";
        HAL_UART_Transmit(&huart2, (uint8_t*)warning, strlen(warning), 100);
        
        /* System will fall back to thresholds only (hardcoded safety) */
    }
}
```

---

## Summary of Changes

### New Code Added:
```c
// ~150 lines total:
- AI_Command_t enum
- parse_ai_command() function
- is_ai_command_fresh() function
- ActuationState_t struct
- compute_actuation() function (core logic)
- Updated UART_RxHandler()
- update_system_state() (modified)
- monitor_ai_connection() (new)
```

### No Changes to:
```c
✅ Sensor reading (ADC still same)
✅ UART init (still HC-05 on PA9/PA10)
✅ Pin assignments (FAN, BUZZER, RELAY same)
✅ Threshold values (still MQ2_CRITICAL, MQ135_CRITICAL)
✅ Fail-safe mechanism (thresholds always active)
```

---

## Testing Checklist

After modifications:

```
☐ Compile without errors
☐ Upload to STM32F401
☐ STM32 reads sensors normally (MQ2, MQ135 values appear)
☐ Thresholds still trigger fan (hard-code test: set high value)
☐ Send "AI_CRITICAL\n" via UART → Fan ON
☐ Send "AI_WARN\n" via UART → Fan ON (early)
☐ Send "AI_SAFE\n" via UART → Normal operation
☐ Disconnect Bluetooth → Threshold-only mode (no response to AI commands)
☐ Reconnect Bluetooth → AI commands resume
☐ Buzzer/Relay respond correctly to AI_CRITICAL
☐ LCD (if present) shows AI status
```

---

## Expected Behavior After Integration

| Scenario | MQ2 | MQ135 | AI Cmd | Bluetooth | Fan | Buzzer | Result |
|----------|-----|-------|--------|-----------|-----|--------|--------|
| Normal | 0.9V | 0.7V | SAFE | Yes | OFF | OFF | ✅ Safe |
| Early Warning | 1.3V | 0.9V | WARN | Yes | **ON** | OFF | ✅ Early prevention |
| Critical (AI) | 1.5V | 1.0V | CRITICAL | Yes | **ON** | **ON** | ✅ Immediate action |
| Critical (Threshold) | 2.1V | 2.1V | SAFE | Yes | **ON** | **ON** | ✅ Threshold override |
| Bluetooth Lost | 1.0V | 0.8V | SAFE | No | OFF | OFF | ✅ Threshold-only |
| Bluetooth Lost (High) | 2.5V | 2.3V | (stale) | No | **ON** | **ON** | ✅ Threshold saves |

---

## Viva-Ready Explanation

**"How does the AI integrate with STM32?"**

> "The AI model runs on the PC and sends simple, priority-based commands to the STM32. The microcontroller implements a decision hierarchy:
> 
> 1. **AI_CRITICAL** → Immediate action (Fan, Buzzer, Relay ON)
> 2. **Hard thresholds** → Always monitored and trigger independently
> 3. **Bluetooth timeout** → If PC disconnects, fall back to threshold-only protection
> 
> The key is that **STM32 never depends solely on AI**. Even if the PC crashes or Bluetooth is lost, the hardware thresholds ensure safety. The AI is a complementary early-warning layer that turns equipment on 10-30 seconds before the threshold is breached."

---

**Ready to code? Start with `compute_actuation()` as your core logic!** 🎯
