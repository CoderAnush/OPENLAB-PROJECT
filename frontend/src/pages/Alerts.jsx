import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Bell, Trash2 } from 'lucide-react';
import { useSensorData } from '../hooks/useSensorData';

const Alerts = () => {
    const [alerts, setAlerts] = useState([]);
    const [filter, setFilter] = useState('all');
    const { data } = useSensorData();

    // NOTE: Removed backend fetch - only showing real-time alerts
    // Uncomment below if you want to load historical alerts from database
    // useEffect(() => {
    //     fetch('http://localhost:8001/api/alerts?limit=50')
    //         .then(res => res.json())
    //         .then(data => setAlerts(data))
    //         .catch(err => console.error(err));
    // }, []);

    // Real-time alert detection from sensor data
    useEffect(() => {
        if (data && data.risk_score >= 100) {
            const newAlert = {
                id: Date.now(),
                message: `Critical Risk Detected! Score: ${data.risk_score}`,
                severity: 'HIGH',
                timestamp: new Date().toISOString(),
                mq2: data.mq2_voltage?.toFixed(2),
                mq135: data.mq135_voltage?.toFixed(2)
            };
            setAlerts(prev => [newAlert, ...prev].slice(0, 100)); // Keep last 100
        } else if (data && data.risk_score >= 50 && data.ml_prediction !== 'SAFE') {
            // Check if last alert was recent to avoid spam
            const lastAlert = alerts[0];
            const timeSinceLastAlert = lastAlert ? (Date.now() - new Date(lastAlert.timestamp).getTime()) : 10000;
            if (timeSinceLastAlert > 5000) { // Only add if 5s passed
                const newAlert = {
                    id: Date.now(),
                    message: `Warning: ${data.ml_prediction} detected (${(data.ml_confidence * 100).toFixed(1)}% confidence)`,
                    severity: 'MEDIUM',
                    timestamp: new Date().toISOString(),
                    mq2: data.mq2_voltage?.toFixed(2),
                    mq135: data.mq135_voltage?.toFixed(2)
                };
                setAlerts(prev => [newAlert, ...prev].slice(0, 100));
            }
        }
    }, [data?.risk_score, data?.ml_prediction]);

    const getSeverityColor = (severity) => {
        switch (severity?.toUpperCase()) {
            case 'HIGH': return 'border-red-500 bg-red-50';
            case 'MEDIUM': return 'border-yellow-500 bg-yellow-50';
            case 'LOW': return 'border-blue-500 bg-blue-50';
            default: return 'border-slate-500 bg-slate-50';
        }
    };

    const getSeverityBadge = (severity) => {
        switch (severity?.toUpperCase()) {
            case 'HIGH': return 'bg-red-100 text-red-700';
            case 'MEDIUM': return 'bg-yellow-100 text-yellow-700';
            case 'LOW': return 'bg-blue-100 text-blue-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const filteredAlerts = alerts.filter(alert => {
        if (filter === 'all') return true;
        if (filter === 'danger') return alert.severity?.toUpperCase() === 'HIGH';
        if (filter === 'warning') return alert.severity?.toUpperCase() === 'MEDIUM';
        return true;
    });

    const exportCSV = () => {
        const csv = [
            ['Timestamp', 'Severity', 'Message', 'MQ2 (V)', 'MQ135 (V)'],
            ...alerts.map(a => [
                new Date(a.timestamp).toLocaleString(),
                a.severity,
                a.message,
                a.mq2 || 'N/A',
                a.mq135 || 'N/A'
            ])
        ].map(row => row.join(',')).join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `alerts_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const clearAllAlerts = () => {
        if (window.confirm('Are you sure you want to clear all alerts?')) {
            setAlerts([]);
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Bell className="w-8 h-8 text-blue-600" />
                    <h2 className="text-2xl font-bold dark:text-white">System Alerts & Logs</h2>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={clearAllAlerts}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold text-sm flex items-center gap-2"
                    >
                        <Trash2 className="w-4 h-4" />
                        Clear All
                    </button>
                    <button 
                        onClick={exportCSV}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm"
                    >
                        📥 Export CSV
                    </button>
                </div>
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-3">
                <button 
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                        filter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                >
                    All
                </button>
                <button 
                    onClick={() => setFilter('danger')}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 ${
                        filter === 'danger' ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                >
                    ⚠️ Danger
                </button>
                <button 
                    onClick={() => setFilter('warning')}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 ${
                        filter === 'warning' ? 'bg-yellow-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                >
                    ⚠ Warning
                </button>
            </div>

            {/* Alerts List */}
            <div className="space-y-4">
                {filteredAlerts.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-slate-700">
                        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">No alerts found</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">System is operating normally</p>
                    </div>
                ) : (
                    filteredAlerts.map(alert => (
                        <div key={alert.id} className={`p-4 dark:bg-dark-card border-l-4 rounded-lg shadow-sm flex items-center justify-between ${
                            getSeverityColor(alert.severity)
                        }`}>
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="text-red-500 flex-shrink-0" />
                                <div>
                                    <p className="font-semibold text-slate-800 dark:text-white">{alert.message}</p>
                                    <div className="flex gap-4 text-xs text-slate-600 dark:text-slate-400 mt-1">
                                        <span>📅 {new Date(alert.timestamp).toLocaleString()}</span>
                                        {alert.mq2 && <span>MQ2: {alert.mq2}V</span>}
                                        {alert.mq135 && <span>MQ135: {alert.mq135}V</span>}
                                    </div>
                                </div>
                            </div>
                            <span className={`px-3 py-1 text-xs rounded-full uppercase font-bold whitespace-nowrap ${
                                getSeverityBadge(alert.severity)
                            }`}>
                                {alert.severity}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Alerts;
