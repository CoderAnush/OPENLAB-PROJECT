/**
 ******************************************************************************
 * @file           : main.c
 * @brief          : Gas Sensor Early Warning System with ML Dataset Logging
 * @author         : Modified for ML Data Collection
 * @date           : January 2026
 ******************************************************************************
 * Features:
 * - MQ2 (Gas) and MQ135 (Smoke) sensor monitoring
 * - Buzzer, Relay, Fan control
 * - I2C LCD display (PB8=SCL, PB9=SDA)
 * - Bluetooth (HC-05) UART communication (PA9=TX, PA10=RX)
 * - CSV logging mode for ML dataset collection
 * - Configurable sampling rate (1-50 Hz)
 ******************************************************************************
 * HARDWARE CONNECTIONS (USER VERIFIED):
 * - MQ2:    PA0 (ADC Channel 0)
 * - MQ135:  PA1 (ADC Channel 1)
 * - HC-05:  PA9 (TX), PA10 (RX), PA4 (STATE)
 * - I2C:    PB8 (SCL), PB9 (SDA)
 * - Buzzer: PB0
 * - Relay:  PB1 (to be added)
 * - Fan:    PB10 (to be added)

 ******************************************************************************
 */

#include "main.h"
#include "adc.h"
#include "i2c.h"
#include "tim.h"
#include "usart.h"
#include "gpio.h"
#include <stdio.h>
#include <stdint.h>
#include <string.h>
#include <stdlib.h>
#include <ctype.h>

/* Private define ------------------------------------------------------------*/
#define LCD_I2C_ADDRESS      (0x27 << 1)
#define BUZZER_PORT          GPIOB
#define BUZZER_PIN           GPIO_PIN_0
#define RELAY_PORT           GPIOB
#define RELAY_PIN            GPIO_PIN_1
#define FAN_PORT             GPIOB
#define FAN_PIN              GPIO_PIN_10
#define RX_BUFFER_SIZE       64
#define SENSOR_INTERVAL 100  // Change from 5000 to 100 (10 Hz)
#define LCD_BUFFER_SIZE      32
#define COMMAND_PAUSE_MS     4000

/* Severity thresholds multipliers */
#define LOW_FACTOR           1.0f
#define MEDIUM_FACTOR        1.25f
#define HIGH_FACTOR          1.5f

/* Buffers */
char rx_buffer[RX_BUFFER_SIZE];
uint8_t rx_index = 0;
uint8_t command_ready = 0;

/* Sensor thresholds */
float mq2_threshold = 2.0f;
float mq135_threshold = 2.0f;

/* Sensor voltages */
float MQ2_V = 0.0f;
float MQ135_V = 0.0f;

/* Timing */
uint32_t last_sensor_time = 0;
uint32_t pause_start_time = 0;
uint8_t bluetooth_paused = 0;

/* Buzzer & LED control */
uint8_t alert_enabled = 1;
uint16_t blink_interval = 500;

/* CSV Logging Control (NEW) */
uint8_t csv_logging_enabled = 0;
uint32_t csv_log_interval = 100;   // 100ms = 10 Hz (default)
uint32_t last_csv_time = 0;

/* LCD function prototypes */
void lcd_init(void);
void lcd_send_cmd(char cmd);
void lcd_send_data(char data);
void lcd_send_string(char *str);
void lcd_set_cursor(uint8_t row, uint8_t col);
void lcd_clear(void);
void lcd_display_severity(float mq2, float mq135);

/* Private function prototypes */
void SystemClock_Config(void);
void Error_Handler(void);

/* ------------------ USER CODE ------------------ */
void buzzer_on(void){ HAL_GPIO_WritePin(BUZZER_PORT, BUZZER_PIN, GPIO_PIN_SET); }
void buzzer_off(void){ HAL_GPIO_WritePin(BUZZER_PORT, BUZZER_PIN, GPIO_PIN_RESET); }
void relay_on(void){ HAL_GPIO_WritePin(RELAY_PORT, RELAY_PIN, GPIO_PIN_SET); }
void relay_off(void){ HAL_GPIO_WritePin(RELAY_PORT, RELAY_PIN, GPIO_PIN_RESET); }
void fan_on(void){ HAL_GPIO_WritePin(FAN_PORT, FAN_PIN, GPIO_PIN_SET); }
void fan_off(void){ HAL_GPIO_WritePin(FAN_PORT, FAN_PIN, GPIO_PIN_RESET); }

float read_adc_voltage(uint32_t channel)
{
    ADC_ChannelConfTypeDef sConfig = {0};
    sConfig.Channel = channel;
    sConfig.Rank = 1;
    sConfig.SamplingTime = ADC_SAMPLETIME_56CYCLES;
    HAL_ADC_ConfigChannel(&hadc1, &sConfig);

    HAL_ADC_Start(&hadc1);
    HAL_ADC_PollForConversion(&hadc1, HAL_MAX_DELAY);
    uint32_t raw = HAL_ADC_GetValue(&hadc1);
    HAL_ADC_Stop(&hadc1);

    return (raw * 3.3f) / 4095.0f;
}

void send_bluetooth(const char* msg)
{
    if (bluetooth_paused) return;
    HAL_UART_Transmit(&huart1, (uint8_t*)msg, strlen(msg), HAL_MAX_DELAY);
}


/* ---------------- UART Interrupt Callback ---------------- */
void HAL_UART_RxCpltCallback(UART_HandleTypeDef *huart)
{
    if (huart->Instance == USART1)
    {
        uint8_t received_byte = rx_buffer[rx_index];

        if (received_byte == '\r' || received_byte == '\n')
        {
            if (rx_index > 0)
            {
                rx_buffer[rx_index] = '\0';
                command_ready = 1;
            }
            rx_index = 0;
        }
        else
        {
            if (rx_index < RX_BUFFER_SIZE - 1)
            {
                rx_buffer[rx_index] = toupper(received_byte);
                rx_index++;
            }
            else rx_index = 0;
        }

        HAL_UART_Receive_IT(&huart1, (uint8_t*)&rx_buffer[rx_index], 1);
    }
}

/* ---------------- Command Processor (MODIFIED) ---------------- */
void process_command(char *cmd)
{
    char response[128];

    if(strncmp(cmd,"SET MQ2 ",8)==0){
        mq2_threshold = atof(cmd+8);
        sprintf(response,"MQ2 threshold set to %.2fV\r\n", mq2_threshold);
        send_bluetooth(response);
        bluetooth_paused = 1;
        pause_start_time = HAL_GetTick();
    }
    else if(strncmp(cmd,"SET MQ135 ",10)==0){
        mq135_threshold = atof(cmd+10);
        sprintf(response,"MQ135 threshold set to %.2fV\r\n", mq135_threshold);
        send_bluetooth(response);
        bluetooth_paused = 1;
        pause_start_time = HAL_GetTick();
    }
    else if(strcmp(cmd,"STATUS")==0){
        snprintf(response,sizeof(response),
            "> STATUS\r\nMQ2: %.2fV\r\nMQ135: %.2fV\r\nAlert: %s\r\nBlink: %dms\r\nCSV: %s\r\nRate: %lu ms\r\n",
            MQ2_V, MQ135_V, alert_enabled?"ON":"OFF", blink_interval,
            csv_logging_enabled?"ON":"OFF", csv_log_interval);
        send_bluetooth(response);
        bluetooth_paused = 1;
        pause_start_time = HAL_GetTick();
    }
    else if(strcmp(cmd,"HELP")==0){
        char *help_text =
            "> HELP\r\n"
            "Available Commands:\r\n"
            "SET MQ2 <value>    - Set MQ2 threshold\r\n"
            "SET MQ135 <value>  - Set MQ135 threshold\r\n"
            "ALERT ON/OFF       - Enable/Disable Alerts\r\n"
            "BLINK <ms>         - Set LED blink interval\r\n"
            "CSV ON             - Start CSV logging\r\n"
            "CSV OFF            - Stop CSV logging\r\n"
            "CSV RATE <hz>      - Set logging rate (1-50 Hz)\r\n"
            "STATUS             - Show current readings\r\n"
            "HELP               - Show this menu\r\n";
        send_bluetooth(help_text);
        bluetooth_paused = 1;
        pause_start_time = HAL_GetTick();
    }
    else if(strcmp(cmd,"CSV ON")==0){
        csv_logging_enabled = 1;
        bluetooth_paused = 0;  // Allow continuous logging
        alert_enabled = 0;      // Disable alerts during logging (optional)

        // Send CSV header
        HAL_UART_Transmit(&huart1, (uint8_t*)"timestamp,mq2,mq135\r\n", 21, HAL_MAX_DELAY);
        last_csv_time = HAL_GetTick();

        // Update LCD
        lcd_clear();
        lcd_send_string("CSV LOGGING ON");
        lcd_set_cursor(1,0);
        snprintf(response,sizeof(response),"%d Hz", 1000/csv_log_interval);
        lcd_send_string(response);
    }
    else if(strcmp(cmd,"CSV OFF")==0){
        csv_logging_enabled = 0;
        alert_enabled = 1;  // Re-enable alerts
        send_bluetooth("> CSV logging DISABLED\r\n");
        bluetooth_paused = 1;
        pause_start_time = HAL_GetTick();

        // Restore LCD
        lcd_clear();
        lcd_send_string("CSV Logging OFF");
        HAL_Delay(1000);
        lcd_clear();
    }
    else if(strncmp(cmd,"CSV RATE ",9)==0){
        uint16_t rate_hz = atoi(cmd+9);
        if(rate_hz >= 1 && rate_hz <= 50){
            csv_log_interval = 1000 / rate_hz;
            snprintf(response,sizeof(response),"> CSV rate set to %d Hz (%lu ms)\r\n",
                     rate_hz, csv_log_interval);
            send_bluetooth(response);
        } else {
            send_bluetooth("> Rate must be 1-50 Hz\r\n");
        }
    }
    else if(strcmp(cmd,"ALERT ON")==0){
        alert_enabled = 1;
        send_bluetooth("> Bluetooth alerts ENABLED\r\n");
    }
    else if(strcmp(cmd,"ALERT OFF")==0){
        alert_enabled = 0;
        send_bluetooth("> Bluetooth alerts DISABLED\r\n");
    }
    else if(strncmp(cmd,"BLINK ",6)==0){
        uint16_t val = atoi(cmd+6);
        if(val>=100 && val<=2000){
            blink_interval = val;
            snprintf(response,sizeof(response),"> Blink interval set to %d ms\r\n",blink_interval);
            send_bluetooth(response);
        } else {
            send_bluetooth("> Blink value out of range (100-2000 ms)\r\n");
        }
    }
    else{
        snprintf(response,sizeof(response),
            "Unknown command: %s\r\nType HELP for commands\r\n",cmd);
        send_bluetooth(response);
        bluetooth_paused = 1;
        pause_start_time = HAL_GetTick();
    }
}

/* ---------------- Update Alerts & LCD ---------------- */
void update_alerts(void)
{
    uint32_t now = HAL_GetTick();
    static uint32_t mq2_blink_time=0, mq135_blink_time=0;
    static uint32_t buzzer_timer=0;
    static uint8_t buzzer_state=0;

    // Determine severity
    uint8_t mq2_level = 0;
    if(MQ2_V > mq2_threshold*HIGH_FACTOR) mq2_level=3;
    else if(MQ2_V > mq2_threshold*MEDIUM_FACTOR) mq2_level=2;
    else if(MQ2_V > mq2_threshold*LOW_FACTOR) mq2_level=1;

    uint8_t mq135_level = 0;
    if(MQ135_V > mq135_threshold*HIGH_FACTOR) mq135_level=3;
    else if(MQ135_V > mq135_threshold*MEDIUM_FACTOR) mq135_level=2;
    else if(MQ135_V > mq135_threshold*LOW_FACTOR) mq135_level=1;



    // -------- Relay & Fan Control --------
    if(mq2_level > 0 || mq135_level > 0){
        relay_on();
        fan_on();
    } else {
        relay_off();
        fan_off();
    }

    // -------- Buzzer (Disabled during CSV logging) --------
    if(alert_enabled && !csv_logging_enabled && (mq2_level>0 || mq135_level>0)){
        uint32_t beep_on = (mq2_level>0)? 200 : (mq135_level>0)? 500 : 0;
        uint32_t beep_off = (mq2_level>0)? 300 : (mq135_level>0)? 500 : 0;
        if(now - buzzer_timer >= (buzzer_state? beep_off : beep_on)){
            buzzer_state = !buzzer_state;
            HAL_GPIO_WritePin(BUZZER_PORT,BUZZER_PIN,buzzer_state? GPIO_PIN_SET : GPIO_PIN_RESET);
            buzzer_timer = now;
        }
    } else HAL_GPIO_WritePin(BUZZER_PORT,BUZZER_PIN,GPIO_PIN_RESET);

    // -------- Bluetooth Alerts (Disabled during CSV) --------
    if(alert_enabled && !bluetooth_paused && !csv_logging_enabled){
        char alert_msg[128];
        if(mq2_level>0){
            snprintf(alert_msg,sizeof(alert_msg),"ALERT! MQ2: %.2fV\r\n",MQ2_V);
            send_bluetooth(alert_msg);
        }
        if(mq135_level>0){
            snprintf(alert_msg,sizeof(alert_msg),"ALERT! MQ135: %.2fV\r\n",MQ135_V);
            send_bluetooth(alert_msg);
        }
    }

    // Update LCD (Skip during CSV logging to reduce overhead)
    if(!csv_logging_enabled){
        lcd_display_severity(MQ2_V, MQ135_V);
    }
}

/* ---------------- LCD Display Severity Bars ---------------- */
void lcd_display_severity(float mq2, float mq135)
{
    static uint32_t last_toggle = 0;
    static uint8_t screen = 0; // 0: voltage, 1: thresholds
    uint32_t now = HAL_GetTick();

    // Switch screen every 1000 ms
    if (now - last_toggle >= 1000)
    {
        screen ^= 1; // toggle screen
        last_toggle = now;
        lcd_clear();
    }

    char buf[17];

    if(screen == 0)
    {
        // ------- Voltage Screen -------
        snprintf(buf, sizeof(buf), "MQ2: %.2fV", mq2);
        lcd_set_cursor(0,0);
        lcd_send_string(buf);

        snprintf(buf, sizeof(buf), "MQ135: %.2fV", mq135);
        lcd_set_cursor(1,0);
        lcd_send_string(buf);
    }
    else
    {
        // ------- Threshold Screen -------
        snprintf(buf, sizeof(buf), "MQ2 Th: %.2fV", mq2_threshold);
        lcd_set_cursor(0,0);
        lcd_send_string(buf);

        snprintf(buf, sizeof(buf), "MQ135 Th: %.2fV", mq135_threshold);
        lcd_set_cursor(1,0);
        lcd_send_string(buf);
    }
}

/* ---------------- MAIN (MODIFIED) ---------------- */
int main(void)
{
    HAL_Init();
    SystemClock_Config();

    MX_GPIO_Init();
    MX_ADC1_Init();
    MX_I2C1_Init();
    MX_USART1_UART_Init();

    MX_TIM3_Init();
    HAL_TIM_Base_Start(&htim3);


    /* Buzzer GPIO */
    GPIO_InitTypeDef GPIO_InitStruct={0};
    GPIO_InitStruct.Pin = BUZZER_PIN;
    GPIO_InitStruct.Mode = GPIO_MODE_OUTPUT_PP;
    GPIO_InitStruct.Pull = GPIO_NOPULL;
    GPIO_InitStruct.Speed = GPIO_SPEED_FREQ_HIGH;
    HAL_GPIO_Init(BUZZER_PORT,&GPIO_InitStruct);
    HAL_GPIO_WritePin(BUZZER_PORT,BUZZER_PIN,GPIO_PIN_RESET);

    /* Relay GPIO */
    GPIO_InitStruct.Pin = RELAY_PIN;
    GPIO_InitStruct.Mode = GPIO_MODE_OUTPUT_PP;
    GPIO_InitStruct.Pull = GPIO_NOPULL;
    GPIO_InitStruct.Speed = GPIO_SPEED_FREQ_LOW;
    HAL_GPIO_Init(RELAY_PORT,&GPIO_InitStruct);
    HAL_GPIO_WritePin(RELAY_PORT,RELAY_PIN,GPIO_PIN_RESET);

    /* Fan GPIO */
    GPIO_InitStruct.Pin = FAN_PIN;
    GPIO_InitStruct.Mode = GPIO_MODE_OUTPUT_PP;
    GPIO_InitStruct.Pull = GPIO_NOPULL;
    GPIO_InitStruct.Speed = GPIO_SPEED_FREQ_LOW;
    HAL_GPIO_Init(FAN_PORT,&GPIO_InitStruct);
    HAL_GPIO_WritePin(FAN_PORT,FAN_PIN,GPIO_PIN_RESET);

    /* Initialize LCD */
    lcd_init();
    lcd_send_string("Gas Sensor ML");
    lcd_set_cursor(1,0);
    lcd_send_string("System Ready");
    HAL_Delay(1500);
    lcd_clear();

    /* Start UART interrupt reception */
    rx_index = 0;
    HAL_UART_Receive_IT(&huart1, (uint8_t*)&rx_buffer[rx_index], 1);

    char bt_buffer[64];

    while(1)
    {
        uint32_t now = HAL_GetTick();

        // Read sensors (always)
        MQ2_V = read_adc_voltage(ADC_CHANNEL_0);
        MQ135_V = read_adc_voltage(ADC_CHANNEL_1);

        // ========== CSV LOGGING MODE (Priority) ==========
        if(csv_logging_enabled && now - last_csv_time >= csv_log_interval)
        {
            // Format: timestamp,mq2,mq135
            snprintf(bt_buffer, sizeof(bt_buffer),
                     "%lu,%.3f,%.3f\r\n",
                     now, MQ2_V, MQ135_V);

            // Direct UART transmit (bypass send_bluetooth to avoid pause check)
            HAL_UART_Transmit(&huart1, (uint8_t*)bt_buffer, strlen(bt_buffer), HAL_MAX_DELAY);
            last_csv_time = now;
        }
        // ========== NORMAL BLUETOOTH MODE ==========
        else if(!csv_logging_enabled && !bluetooth_paused && now - last_sensor_time >= SENSOR_INTERVAL)
        {
            snprintf(bt_buffer, sizeof(bt_buffer),
                     "MQ2: %.2f, MQ135: %.2f\r\n",
                     MQ2_V, MQ135_V);

            send_bluetooth(bt_buffer);
            last_sensor_time = now;
        }

        // Update alerts & LCD (if not CSV logging)
        update_alerts();

        // Resume Bluetooth after pause
        if (bluetooth_paused && now - pause_start_time >= COMMAND_PAUSE_MS)
        {
            bluetooth_paused = 0;
            last_sensor_time = now;
            rx_index = 0;
            HAL_UART_Receive_IT(&huart1, (uint8_t*)&rx_buffer[0], 1);
        }

        // Process received commands
        if(command_ready){
            process_command(rx_buffer);
            memset(rx_buffer,0,RX_BUFFER_SIZE);
            command_ready=0;
        }

        HAL_Delay(10);
    }
}

/* ---------------- LCD Functions ---------------- */
void lcd_send_cmd(char cmd)
{
    char data_u = cmd & 0xF0;
    char data_l = (cmd << 4) & 0xF0;
    uint8_t data_t[4] = {data_u|0x0C,data_u|0x08,data_l|0x0C,data_l|0x08};
    HAL_I2C_Master_Transmit(&hi2c1,LCD_I2C_ADDRESS,data_t,4,100);
}

void lcd_send_data(char data)
{
    char data_u = data & 0xF0;
    char data_l = (data << 4) & 0xF0;
    uint8_t data_t[4] = {data_u|0x0D,data_u|0x09,data_l|0x0D,data_l|0x09};
    HAL_I2C_Master_Transmit(&hi2c1,LCD_I2C_ADDRESS,data_t,4,100);
}

void lcd_send_string(char *str){while(*str) lcd_send_data(*str++);}
void lcd_clear(void){lcd_send_cmd(0x01); HAL_Delay(2);}
void lcd_set_cursor(uint8_t row,uint8_t col){lcd_send_cmd((row==0)?(0x80+col):(0xC0+col));}

void lcd_init(void)
{
    HAL_Delay(50);
    lcd_send_cmd(0x30); HAL_Delay(10);
    lcd_send_cmd(0x30); HAL_Delay(10);
    lcd_send_cmd(0x30); HAL_Delay(10);
    lcd_send_cmd(0x20); HAL_Delay(10);
    lcd_send_cmd(0x28); HAL_Delay(2);
    lcd_send_cmd(0x08); HAL_Delay(2);
    lcd_send_cmd(0x01); HAL_Delay(5);
    lcd_send_cmd(0x06); HAL_Delay(2);
    lcd_send_cmd(0x0C); HAL_Delay(2);
}

/* ---------------- System Clock ---------------- */
void SystemClock_Config(void)
{
    RCC_OscInitTypeDef RCC_OscInitStruct={0};
    RCC_ClkInitTypeDef RCC_ClkInitStruct={0};

    __HAL_RCC_PWR_CLK_ENABLE();
    __HAL_PWR_VOLTAGESCALING_CONFIG(PWR_REGULATOR_VOLTAGE_SCALE2);

    RCC_OscInitStruct.OscillatorType=RCC_OSCILLATORTYPE_HSI;
    RCC_OscInitStruct.HSIState=RCC_HSI_ON;
    RCC_OscInitStruct.HSICalibrationValue=RCC_HSICALIBRATION_DEFAULT;
    RCC_OscInitStruct.PLL.PLLState=RCC_PLL_ON;
    RCC_OscInitStruct.PLL.PLLSource=RCC_PLLSOURCE_HSI;
    RCC_OscInitStruct.PLL.PLLM=16;
    RCC_OscInitStruct.PLL.PLLN=336;
    RCC_OscInitStruct.PLL.PLLP=RCC_PLLP_DIV4;
    RCC_OscInitStruct.PLL.PLLQ=4;
    if(HAL_RCC_OscConfig(&RCC_OscInitStruct)!=HAL_OK) Error_Handler();

    RCC_ClkInitStruct.ClockType=RCC_CLOCKTYPE_HCLK|RCC_CLOCKTYPE_SYSCLK|RCC_CLOCKTYPE_PCLK1|RCC_CLOCKTYPE_PCLK2;
    RCC_ClkInitStruct.SYSCLKSource=RCC_SYSCLKSOURCE_PLLCLK;
    RCC_ClkInitStruct.AHBCLKDivider=RCC_SYSCLK_DIV1;
    RCC_ClkInitStruct.APB1CLKDivider=RCC_HCLK_DIV2;
    RCC_ClkInitStruct.APB2CLKDivider=RCC_HCLK_DIV1;
    if(HAL_RCC_ClockConfig(&RCC_ClkInitStruct,FLASH_LATENCY_2)!=HAL_OK) Error_Handler();
}

void Error_Handler(void){__disable_irq(); while(1);}

#ifdef  USE_FULL_ASSERT
void assert_failed(uint8_t *file, uint32_t line)
{
    /* User can add implementation to report error */
}
#endif
