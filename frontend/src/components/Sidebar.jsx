import React from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Activity,
    LineChart,
    BrainCircuit,
    AlertTriangle,
    Siren,
    Settings,
    Info
} from 'lucide-react';
import clsx from 'clsx';

const Sidebar = () => {
    const navItems = [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Sensors', path: '/sensors', icon: Activity },
        { name: 'Live Graphs', path: '/graphs', icon: LineChart },
        { name: 'ML Predictions', path: '/ml', icon: BrainCircuit },
        { name: 'Alerts & Logs', path: '/alerts', icon: AlertTriangle },
        { name: 'Emergency', path: '/emergency', icon: Siren, className: 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' },
        { name: 'Settings', path: '/settings', icon: Settings },
        { name: 'System Info', path: '/info', icon: Info },
    ];

    return (
        <div className="h-screen w-64 bg-white dark:bg-dark-card border-r border-slate-200 dark:border-slate-700 flex flex-col transition-colors duration-300">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                    IndustraIoT
                </h1>
                <p className="text-xs text-slate-500 mt-1">Monitor. Predict. Protect.</p>
            </div>

            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => clsx(
                            "flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                            item.className,
                            isActive
                                ? "bg-primary/10 text-primary dark:bg-primary/20"
                                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-900 dark:hover:text-slate-200"
                        )}
                    >
                        <item.icon className={clsx("w-5 h-5 mr-3",)} />
                        {item.name}
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                        A
                    </div>
                    <div>
                        <p className="text-sm font-medium dark:text-white">Admin User</p>
                        <p className="text-xs text-slate-500">Online</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
