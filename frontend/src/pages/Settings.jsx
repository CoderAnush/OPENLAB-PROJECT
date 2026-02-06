import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Bluetooth, Database, Brain, Info } from 'lucide-react';

const Settings = () => {
    const [config, setConfig] = useState({
        serialPort: 'COM4',
        baudRate: 9600,
        mockMode: false,
        dbPath: './iot_v2.db'
    });

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <SettingsIcon className="w-8 h-8 text-blue-600" />
                <h2 className="text-2xl font-bold dark:text-white">System Settings</h2>
            </div>

            {/* Connection Settings */}
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <Bluetooth className="w-6 h-6 text-blue-600" />
                    <h3 className="text-xl font-semibold text-slate-800 dark:text-white">Serial Connection</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Serial Port
                        </label>
                        <input 
                            type="text" 
                            value={config.serialPort}
                            disabled
                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-not-allowed"
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Currently configured: <span className="font-semibold text-blue-600">{config.serialPort}</span>
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Baud Rate
                        </label>
                        <input 
                            type="text" 
                            value={config.baudRate}
                            disabled
                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-not-allowed"
                        />
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Standard rate for STM32 Bluetooth module
                        </p>
                    </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 dark:bg-slate-800 rounded-lg border border-blue-200 dark:border-slate-600">
                    <div className="flex items-start gap-3">
                        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-white mb-1">
                                How to change serial port:
                            </p>
                            <ol className="text-sm text-slate-600 dark:text-slate-300 space-y-1 list-decimal pl-5">
                                <li>Open <code className="bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-xs">backend/app/core/config.py</code></li>
                                <li>Modify <code className="bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-xs">SERIAL_PORT = "COM4"</code></li>
                                <li>Restart the backend server</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>

            {/* Database Settings */}
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <Database className="w-6 h-6 text-green-600" />
                    <h3 className="text-xl font-semibold text-slate-800 dark:text-white">Database Configuration</h3>
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Database Path
                    </label>
                    <input 
                        type="text" 
                        value={config.dbPath}
                        disabled
                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-not-allowed"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        SQLite database for sensor readings and alerts
                    </p>
                </div>
            </div>

            {/* ML Model Settings */}
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <Brain className="w-6 h-6 text-purple-600" />
                    <h3 className="text-xl font-semibold text-slate-800 dark:text-white">ML Model Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-slate-700 dark:to-slate-600 rounded-lg p-4">
                        <p className="text-sm text-slate-600 dark:text-slate-300 font-medium mb-1">Model Type</p>
                        <p className="text-lg font-bold text-purple-600 dark:text-purple-400">Random Forest</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">150 trees, max_depth=20</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-slate-700 dark:to-slate-600 rounded-lg p-4">
                        <p className="text-sm text-slate-600 dark:text-slate-300 font-medium mb-1">Test Accuracy</p>
                        <p className="text-lg font-bold text-green-600 dark:text-green-400">97.15%</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">281 test samples</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-700 dark:to-slate-600 rounded-lg p-4">
                        <p className="text-sm text-slate-600 dark:text-slate-300 font-medium mb-1">Training Data</p>
                        <p className="text-lg font-bold text-blue-600 dark:text-blue-400">651 samples</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">5 scenario types</p>
                    </div>
                </div>

                <div className="mt-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-slate-700 rounded-lg border border-indigo-200 dark:border-slate-600">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white mb-2">📊 Model Features (8 dimensions):</p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
                        <span>• MQ2 Current Value</span>
                        <span>• MQ135 Current Value</span>
                        <span>• MQ2 Delta (Δ)</span>
                        <span>• MQ135 Delta (Δ)</span>
                        <span>• MQ2 Mean Window (60s)</span>
                        <span>• MQ135 Mean Window (60s)</span>
                        <span>• MQ2 Max Window (60s)</span>
                        <span>• MQ135 Max Window (60s)</span>
                    </div>
                </div>
            </div>

            {/* System Info */}
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-2xl border border-slate-200 dark:border-slate-600 p-6">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">System Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-slate-600 dark:text-slate-400 font-medium">Backend Framework</p>
                        <p className="text-slate-800 dark:text-white font-semibold">FastAPI + Uvicorn</p>
                    </div>
                    <div>
                        <p className="text-slate-600 dark:text-slate-400 font-medium">Frontend Framework</p>
                        <p className="text-slate-800 dark:text-white font-semibold">React + Vite + Tailwind</p>
                    </div>
                    <div>
                        <p className="text-slate-600 dark:text-slate-400 font-medium">Database</p>
                        <p className="text-slate-800 dark:text-white font-semibold">SQLite</p>
                    </div>
                    <div>
                        <p className="text-slate-600 dark:text-slate-400 font-medium">ML Framework</p>
                        <p className="text-slate-800 dark:text-white font-semibold">scikit-learn 1.5+</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
