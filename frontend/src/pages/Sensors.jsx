import React, { useState, useEffect } from 'react';
import { useSensorData } from '../hooks/useSensorData';
import { Activity, Wifi, WifiOff, Wind, TrendingUp, TrendingDown } from 'lucide-react';

const Sensors = () => {
    const { data, isConnected } = useSensorData();
    const [history, setHistory] = useState([]);

    useEffect(() => {
        // Track sensor value changes
        if (data) {
            setHistory(prev => [{
                timestamp: new Date().toISOString(),
                mq2: data.mq2_voltage,
                mq135: data.mq135_voltage
            }, ...prev].slice(0, 100));
        }
    }, [data?.mq2_voltage, data?.mq135_voltage]);

    const getTrend = (sensor) => {
        if (history.length < 2) return 'stable';
        const recent = history.slice(0, 10).map(h => h[sensor]);
        const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const current = data[sensor === 'mq2' ? 'mq2_voltage' : 'mq135_voltage'];
        
        if (current > avg * 1.05) return 'up';
        if (current < avg * 0.95) return 'down';
        return 'stable';
    };

    const mq2Trend = getTrend('mq2');
    const mq135Trend = getTrend('mq135');

    const getSensorStatus = (voltage) => {
        if (voltage >= 2.0) return { color: 'red', text: 'CRITICAL', bg: 'bg-red-100', border: 'border-red-500' };
        if (voltage >= 1.5) return { color: 'yellow', text: 'WARNING', bg: 'bg-yellow-100', border: 'border-yellow-500' };
        return { color: 'green', text: 'SAFE', bg: 'bg-green-100', border: 'border-green-500' };
    };

    const mq2Status = getSensorStatus(data?.mq2_voltage || 0);
    const mq135Status = getSensorStatus(data?.mq135_voltage || 0);

    return (
        <div className="p-6 space-y-6">
            {/* Connection Status Banner */}
            <div className={`flex items-center gap-3 p-4 rounded-lg ${
                isConnected ? 'bg-green-100 border border-green-300' : 'bg-red-100 border border-red-300'
            }`}>
                {isConnected ? (
                    <>
                        <Wifi className="w-6 h-6 text-green-600" />
                        <div>
                            <p className="font-semibold text-green-800">✅ Sensors Connected</p>
                            <p className="text-sm text-green-700">Receiving real-time data from {data?.sensor_connected ? 'COM4' : 'Mock Source'}</p>
                        </div>
                    </>
                ) : (
                    <>
                        <WifiOff className="w-6 h-6 text-red-600" />
                        <div>
                            <p className="font-semibold text-red-800">❌ Connection Lost</p>
                            <p className="text-sm text-red-700">Attempting to reconnect...</p>
                        </div>
                    </>
                )}
            </div>

            {/* Sensor Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* MQ-2 Sensor */}
                <div className={`bg-white dark:bg-dark-card rounded-2xl shadow-lg border-l-4 ${mq2Status.border} p-6`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Wind className="w-8 h-8 text-purple-600" />
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white">MQ-2 Gas Sensor</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400">LPG, Propane, Methane Detection</p>
                            </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${mq2Status.bg} text-${mq2Status.color}-700`}>
                            {mq2Status.text}
                        </span>
                    </div>

                    <div className="space-y-4">
                        {/* Voltage Reading */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Voltage Reading</p>
                                {mq2Trend === 'up' && <TrendingUp className="w-4 h-4 text-red-500" />}
                                {mq2Trend === 'down' && <TrendingDown className="w-4 h-4 text-green-500" />}
                                {mq2Trend === 'stable' && <Activity className="w-4 h-4 text-blue-500" />}
                            </div>
                            <p className="text-4xl font-bold text-purple-600">{data?.mq2_voltage?.toFixed(3) || '0.000'} V</p>
                        </div>

                        {/* PPM Reading */}
                        <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium mb-2">Gas Concentration</p>
                            <p className="text-2xl font-bold text-slate-800 dark:text-white">{Math.round(data?.mq2_gas || 0)} ppm</p>
                        </div>

                        {/* Status Bar */}
                        <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium mb-2">Status</p>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
                                <div 
                                    className={`h-3 rounded-full transition-all duration-500 ${
                                        mq2Status.color === 'green' ? 'bg-green-500' : 
                                        mq2Status.color === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${Math.min((data?.mq2_voltage / 3.3) * 100, 100)}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
                                <span>0V</span>
                                <span className="text-yellow-600">1.5V</span>
                                <span className="text-red-600">2.0V</span>
                                <span>3.3V</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* MQ-135 Sensor */}
                <div className={`bg-white dark:bg-dark-card rounded-2xl shadow-lg border-l-4 ${mq135Status.border} p-6`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Activity className="w-8 h-8 text-green-600" />
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white">MQ-135 Air Quality</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400">CO2, NH3, Benzene, Smoke</p>
                            </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${mq135Status.bg} text-${mq135Status.color}-700`}>
                            {mq135Status.text}
                        </span>
                    </div>

                    <div className="space-y-4">
                        {/* Voltage Reading */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Voltage Reading</p>
                                {mq135Trend === 'up' && <TrendingUp className="w-4 h-4 text-red-500" />}
                                {mq135Trend === 'down' && <TrendingDown className="w-4 h-4 text-green-500" />}
                                {mq135Trend === 'stable' && <Activity className="w-4 h-4 text-blue-500" />}
                            </div>
                            <p className="text-4xl font-bold text-green-600">{data?.mq135_voltage?.toFixed(3) || '0.000'} V</p>
                        </div>

                        {/* PPM Reading */}
                        <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium mb-2">Air Quality Index</p>
                            <p className="text-2xl font-bold text-slate-800 dark:text-white">{Math.round(data?.mq135_air || 0)} ppm</p>
                        </div>

                        {/* Status Bar */}
                        <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium mb-2">Status</p>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
                                <div 
                                    className={`h-3 rounded-full transition-all duration-500 ${
                                        mq135Status.color === 'green' ? 'bg-green-500' : 
                                        mq135Status.color === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${Math.min((data?.mq135_voltage / 3.3) * 100, 100)}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
                                <span>0V</span>
                                <span className="text-yellow-600">1.5V</span>
                                <span className="text-red-600">2.0V</span>
                                <span>3.3V</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sensor Specifications */}
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-2xl border border-slate-200 dark:border-slate-600 p-6">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">📡 Sensor Specifications</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="font-semibold text-purple-600 mb-2">MQ-2 Gas Sensor</h4>
                        <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
                            <li>• <strong>Detects:</strong> LPG, Propane, Methane, Hydrogen, Alcohol, Smoke</li>
                            <li>• <strong>Range:</strong> 300-10,000 ppm</li>
                            <li>• <strong>Operating Voltage:</strong> 5V DC</li>
                            <li>• <strong>Output:</strong> 0-3.3V (Analog)</li>
                            <li>• <strong>Warm-up Time:</strong> ~24 hours for stable readings</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold text-green-600 mb-2">MQ-135 Air Quality Sensor</h4>
                        <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
                            <li>• <strong>Detects:</strong> CO2, NH3, NOx, Alcohol, Benzene, Smoke</li>
                            <li>• <strong>Range:</strong> 10-1,000 ppm</li>
                            <li>• <strong>Operating Voltage:</strong> 5V DC</li>
                            <li>• <strong>Output:</strong> 0-3.3V (Analog)</li>
                            <li>• <strong>Response Time:</strong> < 10 seconds</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sensors;
