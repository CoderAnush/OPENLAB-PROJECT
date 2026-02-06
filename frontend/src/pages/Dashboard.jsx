import React, { useState, useEffect } from 'react';
import StatCard from '../components/StatCard';
import CircularGauge from '../components/CircularGauge';
import { Thermometer, Droplets, Wind, Activity, AlertTriangle, Brain, TrendingUp } from 'lucide-react';
import { useSensorData } from '../hooks/useSensorData';

const Dashboard = () => {
    const { data, isConnected } = useSensorData();
    const [mlStatus, setMlStatus] = useState(null);

    useEffect(() => {
        const fetchMLStatus = async () => {
            try {
                const response = await fetch('/api/ml/status');
                const status = await response.json();
                setMlStatus(status);
            } catch (error) {
                console.error('Error fetching ML status:', error);
            }
        };

        fetchMLStatus();
        const interval = setInterval(fetchMLStatus, 2000);
        return () => clearInterval(interval);
    }, []);

    const getStatusColor = (score) => {
        if (score > 70) return '#EF4444'; // Red
        if (score > 30) return '#F59E0B'; // Orange
        return '#10B981'; // Green
    };

    const getPredictionBgColor = (prediction) => {
        switch (prediction) {
            case 'SAFE':
                return 'from-green-50 to-emerald-50';
            case 'WARN':
                return 'from-yellow-50 to-amber-50';
            case 'CRITICAL':
                return 'from-red-50 to-rose-50';
            default:
                return 'from-slate-50 to-gray-50';
        }
    };

    const getPredictionTextColor = (prediction) => {
        switch (prediction) {
            case 'SAFE':
                return 'text-green-700';
            case 'WARN':
                return 'text-yellow-700';
            case 'CRITICAL':
                return 'text-red-700';
            default:
                return 'text-slate-700';
        }
    };

    const riskColor = getStatusColor(data.risk_score);
    const mlPrediction = data?.ml_prediction || 'SAFE';
    const mlConfidence = data?.ml_confidence || 0;

    return (
        <div className="p-6 space-y-8">
            {/* Connection Status */}
            {!isConnected && (
                <div className="bg-red-500 text-white px-4 py-2 rounded-lg shadow-md flex items-center gap-2 animate-pulse">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="font-semibold">System Disconnected - Checking Connection...</span>
                </div>
            )}

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Gas Level (MQ-2)"
                    value={data.mq2_gas ? data.mq2_gas.toFixed(0) : "0"}
                    unit="ppm"
                    icon={Wind}
                    color="purple"
                    status={data.mq2_gas > 200 ? 'Warning' : 'Safe'}
                />
                <StatCard
                    title="MQ-2 Voltage"
                    value={data.mq2_voltage ? data.mq2_voltage.toFixed(2) : "0.00"}
                    unit="V"
                    icon={Activity}
                    color="blue"
                />
                <StatCard
                    title="Air Quality (MQ-135)"
                    value={data.mq135_air ? data.mq135_air.toFixed(0) : "0"}
                    unit="ppm"
                    icon={Droplets}
                    color="green"
                    status={data.mq135_air > 150 ? 'Warning' : 'Safe'}
                />
                <StatCard
                    title="MQ-135 Voltage"
                    value={data.mq135_voltage ? data.mq135_voltage.toFixed(2) : "0.00"}
                    unit="V"
                    icon={Activity}
                    color="green"
                />
            </div>

            {/* Gauges & ML Prediction */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="col-span-1 lg:col-span-2 bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 p-6">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">Real-time Gauges</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <CircularGauge value={Math.round(data.mq2_gas)} max={500} label="MQ-2 (ppm)" color="#8B5CF6" />
                        <CircularGauge value={Number(data.mq2_voltage.toFixed(2))} max={3.3} label="MQ-2 (V)" color="#3B82F6" />
                        <CircularGauge value={Math.round(data.mq135_air)} max={500} label="MQ-135 (ppm)" color="#10B981" />
                        <CircularGauge value={Number(data.mq135_voltage.toFixed(2))} max={3.3} label="MQ-135 (V)" color="#34D399" />
                    </div>
                </div>

                {/* ML Prediction Card */}
                <div className={`bg-gradient-to-br ${getPredictionBgColor(mlPrediction)} dark:bg-dark-card rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 p-6 flex flex-col justify-between`}>
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <Brain className={`w-6 h-6 ${getPredictionTextColor(mlPrediction)}`} />
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">AI Prediction</h3>
                        </div>
                        <div className={`text-5xl font-bold ${getPredictionTextColor(mlPrediction)} mb-2`}>
                            {mlPrediction}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                            Confidence: <span className="font-bold">{(mlConfidence * 100).toFixed(1)}%</span>
                        </p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-2">Command</p>
                        <p className="font-mono text-sm font-bold text-slate-800 dark:text-white">
                            {data?.ai_command || 'AI_SAFE'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Model Status</p>
                            <p className={`text-2xl font-bold mt-2 ${mlStatus?.model_loaded ? 'text-green-600' : 'text-yellow-600'}`}>
                                {mlStatus?.model_loaded ? '✅ Loaded' : '⚠️ Fallback'}
                            </p>
                        </div>
                        <TrendingUp className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-4">{mlStatus?.model_accuracy || 97.15}% Accuracy</p>
                </div>

                <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Predictions</p>
                            <p className="text-2xl font-bold mt-2 text-blue-600">
                                {mlStatus?.total_predictions || 0}
                            </p>
                        </div>
                        <Brain className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-4">Total Inferences</p>
                </div>

                <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Test Accuracy</p>
                            <p className="text-2xl font-bold mt-2 text-green-600">97.15%</p>
                        </div>
                        <Activity className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-4">281 Samples</p>
                </div>

                <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Training Samples</p>
                            <p className="text-2xl font-bold mt-2 text-purple-600">651</p>
                        </div>
                        <Wind className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-4">5 Scenarios</p>
                </div>
            </div>

            {/* ML Features Info */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 rounded-2xl border border-blue-200 dark:border-slate-600 p-6">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">🤖 Machine Learning Pipeline</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Random Forest classifier trained on 651 samples across 5 detection scenarios. Achieves 97.15% test accuracy with 100% critical event detection.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                        <p className="font-semibold text-slate-800 dark:text-white">Top Feature</p>
                        <p className="text-slate-600 dark:text-slate-400">MQ135 Max (23.5%)</p>
                    </div>
                    <div>
                        <p className="font-semibold text-slate-800 dark:text-white">Classes</p>
                        <p className="text-slate-600 dark:text-slate-400">SAFE, WARN, CRITICAL</p>
                    </div>
                    <div>
                        <p className="font-semibold text-slate-800 dark:text-white">Model Type</p>
                        <p className="text-slate-600 dark:text-slate-400">Random Forest (150 trees)</p>
                    </div>
                    <div>
                        <p className="font-semibold text-slate-800 dark:text-white">Deployment</p>
                        <p className="text-slate-600 dark:text-slate-400">PC Real-time Inference</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
