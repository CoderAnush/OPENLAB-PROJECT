import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Sensors from './pages/Sensors';
import LiveGraphs from './pages/LiveGraphs';
import MLPredictions from './pages/MLPredictions';
import Alerts from './pages/Alerts';
import Emergency from './pages/Emergency';
import Settings from './pages/Settings';

function App() {
  const location = useLocation();

  const getTitle = () => {
    switch (location.pathname) {
      case '/': return 'Dashboard Overview';
      case '/sensors': return 'Sensor Status';
      case '/graphs': return 'Real-time Analytics';
      case '/ml': return 'Machine Learning Insights';
      case '/alerts': return 'System Alerts & Logs';
      case '/emergency': return 'Emergency Protocols';
      case '/settings': return 'System Settings';
      default: return 'IndustraIoT';
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-dark-bg overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header title={getTitle()} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 transition-colors duration-300">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/sensors" element={<Sensors />} />
            <Route path="/graphs" element={<LiveGraphs />} />
            <Route path="/ml" element={<MLPredictions />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/emergency" element={<Emergency />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/info" element={<div className="p-10 dark:text-white">System v1.0.0</div>} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
