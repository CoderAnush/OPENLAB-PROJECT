// Chart Configuration Helper
console.log("Dashboard JS Loaded v13 - Fixed gauge limits and data persistence");

function createGauge(ctx, label, color, max, unit) {
    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Value', 'Remaining'],
            datasets: [{
                data: [0, max],
                backgroundColor: [color, 'rgba(200, 200, 200, 0.15)'],
                borderWidth: 0,
                borderRadius: 8,
            }]
        },
        options: {
            rotation: -90,
            circumference: 180,
            cutout: '70%',
            maintainAspectRatio: false,
            responsive: true,
            animation: {
                duration: 200,
                easing: 'easeInOutQuad'
            },
            layout: { padding: { bottom: 35 } },
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false },
                title: {
                    display: true,
                    text: label,
                    position: 'top',
                    color: '#475569',
                    font: { size: 15, weight: '600' },
                    padding: { bottom: 12 }
                }
            }
        },
        plugins: [{
            id: 'gaugeMeta',
            afterDatasetsDraw(chart) {
                const { ctx, data } = chart;
                const meta = chart.getDatasetMeta(0);
                if (!meta.data || !meta.data[0]) return;

                const x = meta.data[0].x;
                const y = meta.data[0].y;
                const outerRadius = meta.data[0].outerRadius;
                let value = data.datasets[0].data[0];

                if (typeof value !== 'number' || isNaN(value)) value = 0;

                const titleText = chart.config.options.plugins.title.text || '';
                let displayUnit = unit || ' ppm';
                let total = value + data.datasets[0].data[1];
                if (isNaN(total) || total <= 0) total = max;

                ctx.save();

                // Draw large value in center
                ctx.font = 'bold 32px "Inter", "Segoe UI", sans-serif';
                ctx.fillStyle = data.datasets[0].backgroundColor[0];
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';

                let displayValue = unit === ' V' ? value.toFixed(2) + displayUnit : Math.round(value) + displayUnit;
                ctx.fillText(displayValue, x, y);

                // Draw min/max labels
                ctx.font = 'bold 13px "Inter", sans-serif';
                ctx.fillStyle = '#64748b';
                ctx.textBaseline = 'top';

                // Left (0)
                ctx.textAlign = 'left';
                ctx.fillText('0', x - outerRadius + 5, y + 15);

                // Right (Max)
                ctx.textAlign = 'right';
                const maxText = unit === ' V' ? total.toFixed(1) : Math.round(total);
                ctx.fillText(maxText, x + outerRadius - 5, y + 15);

                ctx.restore();
            }
        }]
    });
}

// Init Charts
const gaugeMQ2 = createGauge(document.getElementById('gaugeMQ2').getContext('2d'), 'MQ-2 Gas', '#8B5CF6', 3.3, ' V');
const gaugeMQ135 = createGauge(document.getElementById('gaugeMQ135').getContext('2d'), 'MQ-135 Air', '#10B981', 3.3, ' V');
const gaugeMQ2V = createGauge(document.getElementById('gaugeMQ2V').getContext('2d'), 'MQ-2 Voltage', '#6366F1', 3.3, ' V');
const gaugeMQ135V = createGauge(document.getElementById('gaugeMQ135V').getContext('2d'), 'MQ-135 Voltage', '#2DD4BF', 3.3, ' V');

// WebSocket Connection with Auto-Reconnect
let ws;
let reconnectAttempts = 0;
const maxReconnectDelay = 5000;

function connectWebSocket() {
    ws = new WebSocket(`ws://${window.location.host}/ws`);

    ws.onopen = () => {
        console.log("✓ Connected to Sensor Stream");
        reconnectAttempts = 0;

        // Update connection indicator
        const statusDot = document.getElementById('connection-dot');
        const statusText = document.getElementById('connection-text');
        if (statusDot) statusDot.className = "w-2 h-2 rounded-full bg-emerald-500 animate-pulse";
        if (statusText) {
            statusText.textContent = "Connected";
            statusText.className = "text-xs font-medium text-emerald-600 dark:text-emerald-400";
        }
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            updateDashboard(data);
        } catch (e) {
            console.error("Error parsing data", e);
        }
    };

    ws.onerror = (error) => {
        console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
        console.warn("WebSocket closed. Reconnecting...");

        // Update connection indicator
        const statusDot = document.getElementById('connection-dot');
        const statusText = document.getElementById('connection-text');
        if (statusDot) statusDot.className = "w-2 h-2 rounded-full bg-yellow-500 animate-pulse";
        if (statusText) {
            statusText.textContent = "Reconnecting...";
            statusText.className = "text-xs font-medium text-yellow-600 dark:text-yellow-400";
        }

        // Exponential backoff reconnection
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), maxReconnectDelay);
        reconnectAttempts++;
        setTimeout(connectWebSocket, delay);
    };
}

// Initialize WebSocket
connectWebSocket();

function updateDashboard(data) {
    const now = new Date().toLocaleTimeString();
    document.getElementById('last-update-time').textContent = now;

    // Debug logging
    console.log('Received data:', {
        mq2_gas: data.mq2_gas,
        mq2_voltage: data.mq2_voltage,
        mq135_air: data.mq135_air,
        mq135_voltage: data.mq135_voltage
    });

    // KPI Cards
    document.getElementById('kpi-mq2').textContent = (data.mq2_gas || 0).toFixed(2) + ' V';
    document.getElementById('kpi-mq135').textContent = (data.mq135_air || 0).toFixed(2) + ' V';
    document.getElementById('kpi-risk').textContent = Math.round(data.risk_score || 0) + '%';
    document.getElementById('kpi-status').textContent = data.status || 'SAFE';

    // Update ML Extensions
    const confVal = data.ml_confidence ? (data.ml_confidence * 100).toFixed(1) + '%' : '0%';
    const cmdVal = data.ai_command || 'WAITING';

    const elConf = document.getElementById('ml-confidence');
    const elCmd = document.getElementById('ai-command');
    if (elConf) elConf.textContent = confVal;
    if (elCmd) elCmd.textContent = cmdVal;

    const riskCard = document.getElementById('kpi-risk-card');
    if (data.risk_score > 70) {
        riskCard.className = 'bg-gradient-to-br from-red-500 to-red-600 text-white p-4 rounded-xl shadow-lg';
    } else if (data.risk_score > 30) {
        riskCard.className = 'bg-gradient-to-br from-yellow-500 to-orange-600 text-white p-4 rounded-xl shadow-lg';
    } else {
        riskCard.className = 'bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-xl shadow-lg';
    }

    // Gas Values
    const mq2Val = data.mq2_gas ? data.mq2_gas.toFixed(2) : "0.00";
    const mq2Volts = data.mq2_voltage ? data.mq2_voltage.toFixed(2) : "0.00";
    const mq135Val = data.mq135_air ? data.mq135_air.toFixed(2) : "0.00";
    const mq135Volts = data.mq135_voltage ? data.mq135_voltage.toFixed(2) : "0.00";

    document.getElementById('val-mq2').textContent = mq2Val;
    document.getElementById('val-mq2-v').textContent = mq2Volts + " V";
    document.getElementById('val-mq135').textContent = mq135Val;
    document.getElementById('val-mq135-v').textContent = mq135Volts + " V";

    // Update Gauges with Dynamic Colors
    updateGauge(gaugeMQ2, data.mq2_gas, 3.3, [1.5, 2.0]);
    updateGauge(gaugeMQ135, data.mq135_air, 3.3, [1.5, 2.0]);
    updateGauge(gaugeMQ2V, data.mq2_voltage, 3.3, [1.5, 2.0]);
    updateGauge(gaugeMQ135V, data.mq135_voltage, 3.3, [1.5, 2.0]);

    // Update Risk UI
    updateRisk(data.risk_score, data.status);

    // Trigger Alerts if Danger
    if (data.status === "Danger" && lastAlertStatus !== "Danger" && !alertCooldown) {
        showToast(`Critical Risk Detected! Risk Score: ${data.risk_score.toFixed(0)}%`, 'danger');
        // Optional: Play Sound
        // const audio = new Audio('/static/alert.mp3');
        // audio.play().catch(e => console.log('Audio blocked'));

        lastAlertStatus = "Danger";
        alertCooldown = true;
        setTimeout(() => alertCooldown = false, 30000); // 30s Cooldown
    } else if (data.status === "Safe") {
        lastAlertStatus = "Safe";
    }

    // Update Last Timestamp
    const ts = document.getElementById('last-updated');
    if (ts) ts.textContent = new Date().toLocaleTimeString();

    // Update Connection Status & Raw Log
    const statusDot = document.getElementById('connection-dot');
    const statusText = document.getElementById('connection-text');
    const rawLog = document.getElementById('val-raw-log');

    if (data.sensor_connected) {
        if (statusDot) statusDot.className = "w-2 h-2 rounded-full bg-emerald-500 animate-pulse";
        if (statusText) {
            statusText.textContent = "Connected (COM9)";
            statusText.className = "text-xs font-medium text-emerald-600 dark:text-emerald-400";
        }
        if (rawLog) {
            rawLog.innerHTML = `<span class="text-emerald-600 font-bold">✓ Connected</span> <span class="mx-2 text-slate-300">|</span> <span>Last: ${now}</span> <span class="mx-2 text-slate-300">|</span> <span class="font-semibold">MQ2:</span> ${mq2Val}ppm (${mq2Volts}V) <span class="mx-2"></span> <span class="font-semibold">MQ135:</span> ${mq135Val}ppm (${mq135Volts}V)`;
        }
    } else {
        if (statusDot) statusDot.className = "w-2 h-2 rounded-full bg-red-500";
        if (statusText) {
            statusText.textContent = "Disconnected";
            statusText.className = "text-xs font-medium text-red-600 dark:text-red-400";
        }
        if (rawLog) {
            rawLog.innerHTML = `<span class="text-red-500 font-bold">⚠ Disconnected</span> <span class="mx-2 text-slate-300">|</span> Checking port...`;
        }
    }
}

function updateGauge(chart, value, max, thresholds = []) {
    if (value === undefined || value === null || isNaN(value)) {
        console.warn('Invalid gauge value:', value);
        value = 0;
    }

    // Don't clamp - if value exceeds max, gauge will show full
    // But we'll cap the display at max for the gauge visual (remaining becomes 0)
    const displayValue = Math.max(0, Math.min(value, max));
    const remaining = Math.max(0, max - value);

    let color = chart.data.datasets[0].backgroundColor[0];
    if (thresholds.length >= 2) {
        const [warn, danger] = thresholds;
        if (value > danger) color = '#EF4444';
        else if (value > warn) color = '#F59E0B';
        else color = '#10B981';
    }

    const label = chart.options.plugins.title.text;
    console.log(`Updating ${label}: value=${value}, display=${displayValue}, max=${max}`);

    chart.data.datasets[0].backgroundColor[0] = color;
    chart.data.datasets[0].data[0] = displayValue;
    chart.data.datasets[0].data[1] = remaining;
    chart.update('active');
}

function updateRisk(score, status) {
    const riskCircle = document.getElementById('risk-circle');
    const riskVal = document.getElementById('risk-val');
    const riskStatus = document.getElementById('risk-status');

    let color = '#10B981';
    if (score > 70) color = '#EF4444';
    else if (score > 30) color = '#F59E0B';

    riskVal.textContent = Math.round(score) + "%";
    riskVal.style.color = color;

    riskStatus.textContent = status;
    riskStatus.style.color = color;

    riskCircle.style.borderColor = color;
    riskCircle.style.borderRightColor = 'transparent';
    riskCircle.style.borderBottomColor = 'transparent';
    riskCircle.style.transform = `rotate(${(score / 100) * 360}deg)`;
}
