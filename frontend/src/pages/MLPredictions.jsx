import React, { useState, useEffect } from 'react';
import { useSensorData } from '../hooks/useSensorData';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Brain, TrendingUp, AlertCircle, CheckCircle2, Zap } from 'lucide-react';

const MLPredictions = () => {
    const { data } = useSensorData();
    const [mlStatus, setMlStatus] = useState(null);
    const [predictionHistory, setPredictionHistory] = useState([]);

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

    // Add to prediction history
    useEffect(() => {
        if (data && data.ml_prediction) {
            setPredictionHistory(prev => {
                const newHistory = [{
                    timestamp: new Date().toLocaleTimeString(),
                    prediction: data.ml_prediction,
                    confidence: (data.ml_confidence * 100).toFixed(1),
                    mq2: data.mq2_voltage?.toFixed(2) || 0,
                    mq135: data.mq135_voltage?.toFixed(2) || 0
                }, ...prev];
                return newHistory.slice(0, 50); // Keep last 50
            });
        }
    }, [data?.ml_prediction]);

    const getPredictionColor = (prediction) => {
        switch (prediction) {
            case 'SAFE':
                return { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-700', dot: '#10B981' };
            case 'WARN':
                return { bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-700', dot: '#F59E0B' };
            case 'CRITICAL':
                return { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-700', dot: '#EF4444' };
            default:
                return { bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-700', dot: '#94A3B8' };
        }
    };

    const getConfidenceColor = (confidence) => {
        if (confidence >= 0.95) return 'text-green-600';
        if (confidence >= 0.85) return 'text-blue-600';
        if (confidence >= 0.75) return 'text-yellow-600';
        return 'text-orange-600';
    };

    const predictionColor = getPredictionColor(data?.ml_prediction || 'SAFE');
    const featureData = mlStatus?.feature_importance ? Object.entries(mlStatus.feature_importance).map(([name, value]) => ({
        name: name.replace(/_/g, ' '),
        value: parseFloat(value.toFixed(1))
    })) : [];

    const confidenceChartData = [
        {
            name: 'Confidence',
            value: Math.round((data?.ml_confidence || 0) * 100)
        },
        {
            name: 'Uncertainty',
            value: Math.round((1 - (data?.ml_confidence || 0)) * 100)
        }
    ];

    const COLORS = ['#10B981', '#D1D5DB'];

    return (
        <div className="space-y-6">
            {/* Main Prediction Card */}
            <div className={`${predictionColor.bg} ${predictionColor.border} border-2 rounded-2xl shadow-lg p-8 transition-all duration-300`}>
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <Brain className={`w-12 h-12 ${predictionColor.text}`} />
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">AI Prediction</h2>
                            <p className="text-sm text-slate-600">Real-time Gas/Smoke Detection</p>
                        </div>
                    </div>
                    {mlStatus?.model_loaded ? (
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                    ) : (
                        <AlertCircle className="w-8 h-8 text-yellow-600" />
                    )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Prediction */}
                    <div className="bg-white/60 backdrop-blur rounded-xl p-4">
                        <p className="text-sm text-slate-600 font-medium mb-2">Prediction</p>
                        <p className={`text-3xl font-bold ${predictionColor.text}`}>
                            {data?.ml_prediction || 'SAFE'}
                        </p>
                    </div>

                    {/* Confidence */}
                    <div className="bg-white/60 backdrop-blur rounded-xl p-4">
                        <p className="text-sm text-slate-600 font-medium mb-2">Confidence</p>
                        <p className={`text-3xl font-bold ${getConfidenceColor(data?.ml_confidence || 0)}`}>
                            {((data?.ml_confidence || 0) * 100).toFixed(1)}%
                        </p>
                    </div>

                    {/* AI Command */}
                    <div className="bg-white/60 backdrop-blur rounded-xl p-4">
                        <p className="text-sm text-slate-600 font-medium mb-2">AI Command</p>
                        <p className="text-lg font-mono font-bold text-slate-800">
                            {data?.ai_command || 'AI_SAFE'}
                        </p>
                    </div>

                    {/* Model Status */}
                    <div className="bg-white/60 backdrop-blur rounded-xl p-4">
                        <p className="text-sm text-slate-600 font-medium mb-2">Model Status</p>
                        <p className="text-sm font-semibold">
                            <span className={mlStatus?.model_loaded ? 'text-green-600' : 'text-yellow-600'}>
                                {mlStatus?.model_loaded ? '✅ Loaded' : '⚠️ Fallback'}
                            </span>
                        </p>
                        <p className="text-xs text-slate-600 mt-1">{mlStatus?.model_accuracy}% Accuracy</p>
                    </div>
                </div>
            </div>

            {/* Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Feature Importance */}
                <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 p-6">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Feature Importance
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={featureData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" />
                            <YAxis dataKey="name" type="category" width={120} fontSize={12} />
                            <Tooltip />
                            <Bar dataKey="value" fill="#3B82F6" radius={[0, 8, 8, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                    <div className="mt-4 text-sm text-slate-600 dark:text-slate-400">
                        <p className="font-semibold mb-2">Top Features:</p>
                        <ul className="space-y-1">
                            <li>🔴 MQ135 Max Window: 23.5% (Smoke peak)</li>
                            <li>🟠 MQ135 Mean Window: 18.9% (Smoke average)</li>
                            <li>🟡 MQ135 Current: 15.7% (Smoke now)</li>
                        </ul>
                    </div>
                </div>

                {/* Confidence Distribution */}
                <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 p-6">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                        <Zap className="w-5 h-5" />
                        Confidence Level
                    </h3>
                    <div className="flex flex-col items-center justify-center h-80">
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={confidenceChartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {COLORS.map((color, index) => (
                                        <Cell key={`cell-${index}`} fill={color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                        <p className="text-center text-slate-600 dark:text-slate-400 mt-4">
                            Current prediction has <span className="font-bold text-green-600">{((data?.ml_confidence || 0) * 100).toFixed(1)}%</span> confidence
                        </p>
                    </div>
                </div>
            </div>

            {/* Sensor Values vs Prediction */}
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 p-6">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">
                    Current Sensor Readings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-slate-700 dark:to-slate-600 rounded-xl p-4">
                        <p className="text-sm text-slate-600 dark:text-slate-300 font-medium mb-2">MQ2 Voltage</p>
                        <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                            {data?.mq2_voltage?.toFixed(2) || '0.00'} V
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">Gas Sensor</p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-700 dark:to-slate-600 rounded-xl p-4">
                        <p className="text-sm text-slate-600 dark:text-slate-300 font-medium mb-2">MQ135 Voltage</p>
                        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                            {data?.mq135_voltage?.toFixed(2) || '0.00'} V
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">Air Quality Sensor</p>
                    </div>

                    <div className={`bg-gradient-to-br ${predictionColor.bg} rounded-xl p-4`}>
                        <p className="text-sm text-slate-600 font-medium mb-2">Prediction</p>
                        <p className={`text-3xl font-bold ${predictionColor.text}`}>
                            {data?.ml_prediction || 'SAFE'}
                        </p>
                        <p className="text-xs text-slate-600 mt-2">ML Model Output</p>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-slate-700 dark:to-slate-600 rounded-xl p-4">
                        <p className="text-sm text-slate-600 dark:text-slate-300 font-medium mb-2">Predictions</p>
                        <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                            {mlStatus?.total_predictions || 0}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">Total Inferences</p>
                    </div>
                </div>
            </div>

            {/* Prediction History */}
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 p-6">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">
                    Prediction History (Last 50)
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700">
                                <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-semibold">Time</th>
                                <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-semibold">Prediction</th>
                                <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-semibold">Confidence</th>
                                <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-semibold">MQ2</th>
                                <th className="text-left py-3 px-4 text-slate-600 dark:text-slate-400 font-semibold">MQ135</th>
                            </tr>
                        </thead>
                        <tbody>
                            {predictionHistory.map((item, idx) => {
                                const itemColor = getPredictionColor(item.prediction);
                                return (
                                    <tr key={idx} className={`border-b border-slate-100 dark:border-slate-700 hover:${itemColor.bg} transition-colors`}>
                                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{item.timestamp}</td>
                                        <td className="py-3 px-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${itemColor.bg} ${itemColor.text}`}>
                                                {item.prediction}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                                                    <div
                                                        className={`h-2 rounded-full transition-all`}
                                                        style={{
                                                            width: `${item.confidence}%`,
                                                            backgroundColor: item.confidence >= 90 ? '#10B981' : item.confidence >= 80 ? '#3B82F6' : '#F59E0B'
                                                        }}
                                                    />
                                                </div>
                                                <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 w-10">
                                                    {item.confidence}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{item.mq2} V</td>
                                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{item.mq135} V</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Model Info */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 rounded-2xl border border-blue-200 dark:border-slate-600 p-6">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">📊 Model Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
                    <div>
                        <p className="text-slate-600 dark:text-slate-400 font-medium mb-1">Model Type</p>
                        <p className="text-slate-800 dark:text-white font-semibold">Random Forest</p>
                        <p className="text-xs text-slate-500">150 decision trees</p>
                    </div>
                    <div>
                        <p className="text-slate-600 dark:text-slate-400 font-medium mb-1">Test Accuracy</p>
                        <p className="text-slate-800 dark:text-white font-semibold">97.15%</p>
                        <p className="text-xs text-slate-500">281 test samples</p>
                    </div>
                    <div>
                        <p className="text-slate-600 dark:text-slate-400 font-medium mb-1">Training Data</p>
                        <p className="text-slate-800 dark:text-white font-semibold">651 samples</p>
                        <p className="text-xs text-slate-500">5 scenarios collected</p>
                    </div>
                    <div>
                        <p className="text-slate-600 dark:text-slate-400 font-medium mb-1">Classes</p>
                        <p className="text-slate-800 dark:text-white font-semibold">3 Classes</p>
                        <p className="text-xs text-slate-500">SAFE, WARN, CRITICAL</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MLPredictions;
