import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { useSensorData } from '../hooks/useSensorData';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const LiveGraphs = () => {
    const { data } = useSensorData();
    const [history, setHistory] = useState({
        labels: [],
        temp: [],
        mq2: []
    });

    useEffect(() => {
        setHistory(prev => {
            const now = new Date().toLocaleTimeString();
            const newLabels = [...prev.labels, now].slice(-20); // Keep last 20
            const newTemp = [...prev.temp, data.temperature].slice(-20);
            const newMq2 = [...prev.mq2, data.mq2_gas].slice(-20);
            return { labels: newLabels, temp: newTemp, mq2: newMq2 };
        });
    }, [data]);

    const chartData = {
        labels: history.labels,
        datasets: [
            {
                label: 'Temperature (°C)',
                data: history.temp,
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                tension: 0.4
            },
            {
                label: 'MQ-2 Gas (ppm)',
                data: history.mq2,
                borderColor: 'rgb(53, 162, 235)',
                backgroundColor: 'rgba(53, 162, 235, 0.5)',
                tension: 0.4
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: { position: 'top' },
            title: { display: true, text: 'Real-time Sensor Trends' },
        },
        scales: {
            y: {
                grid: { color: 'rgba(200, 200, 200, 0.1)' }
            },
            x: {
                grid: { color: 'rgba(200, 200, 200, 0.1)' }
            }
        }
    };

    return (
        <div className="p-6 bg-white dark:bg-dark-card rounded-xl shadow-sm m-6">
            <Line options={options} data={chartData} />
        </div>
    );
};

export default LiveGraphs;
