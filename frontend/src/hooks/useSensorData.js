import { useState, useEffect, useRef } from 'react';

export const useSensorData = () => {
    const [data, setData] = useState({
        mq2_gas: 0,
        mq2_voltage: 0,
        mq135_air: 0,
        mq135_voltage: 0,
        risk_score: 0,
        status: 'Safe'
    });
    const [isConnected, setIsConnected] = useState(false);
    const ws = useRef(null);

    useEffect(() => {
        const connect = () => {
            ws.current = new WebSocket('ws://localhost:8001/ws');

            ws.current.onopen = () => {
                setIsConnected(true);
                console.log('Connected to Sensor Stream');
            };

            ws.current.onmessage = (event) => {
                try {
                    const parsed = JSON.parse(event.data);
                    setData(parsed);
                } catch (e) {
                    console.error('Error parsing sensor data', e);
                }
            };

            ws.current.onclose = () => {
                setIsConnected(false);
                console.log('Disconnected. Reconnecting...');
                setTimeout(connect, 3000);
            };

            ws.current.onerror = (err) => {
                console.error('WebSocket Error:', err);
                ws.current.close();
            };
        };

        connect();

        return () => {
            if (ws.current) ws.current.close();
        };
    }, []);

    return { data, isConnected };
};
