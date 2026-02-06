import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const CircularGauge = ({ value, max, label, color }) => {
    const percentage = Math.min((value / max) * 100, 100);

    const data = {
        labels: ['Value', 'Remaining'],
        datasets: [
            {
                data: [value, max - value],
                backgroundColor: [color, 'rgba(200, 200, 200, 0.2)'],
                borderWidth: 0,
                cutout: '75%',
            },
        ],
    };

    const options = {
        plugins: {
            tooltip: { enabled: false },
            legend: { display: false },
        },
        maintainAspectRatio: false,
        rotation: -90,
        circumference: 180,
        animation: {
            duration: 200, // Fast 200ms animation for real-time updates
            easing: 'easeOutQuart',
        },
        responsive: true,
    };

    return (
        <div className="relative h-40 w-full flex flex-col items-center justify-center">
            <div className="w-full h-full">
                <Doughnut data={data} options={options} />
            </div>
            <div className="absolute top-2/3 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                <div className="text-2xl font-bold dark:text-white">{value}</div>
                <div className="text-xs text-slate-400">{label}</div>
            </div>
        </div>
    );
};

export default CircularGauge;
