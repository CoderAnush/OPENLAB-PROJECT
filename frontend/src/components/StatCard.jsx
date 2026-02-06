import React from 'react';
import clsx from 'clsx';

const StatCard = ({ title, value, unit, icon: Icon, color, status }) => {
    const colorClasses = {
        blue: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
        green: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
        red: 'text-red-500 bg-red-50 dark:bg-red-900/20',
        orange: 'text-orange-500 bg-orange-50 dark:bg-orange-900/20',
        purple: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20',
    };

    const selectedColor = colorClasses[color] || colorClasses.blue;

    return (
        <div className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 hover:shadow-lg transition-all duration-300">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{title}</p>
                    <div className="flex items-baseline gap-1">
                        <h3 className="text-3xl font-bold text-slate-900 dark:text-white">
                            {value}
                        </h3>
                        <span className="text-sm font-medium text-slate-400">{unit}</span>
                    </div>
                </div>
                <div className={clsx("p-3 rounded-xl", selectedColor)}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
            {status && (
                <div className={clsx(
                    "mt-4 text-xs font-semibold px-2 py-1 rounded inline-block",
                    status === 'Safe' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                        status === 'Warning' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400' :
                            'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400'
                )}>
                    {status}
                </div>
            )}
        </div>
    );
};

export default StatCard;
