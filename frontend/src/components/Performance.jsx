import React, { useState, useEffect } from "react";

const PerformanceTable = () => {
    const [current, setCurrent] = useState(0);
    const [voltage, setVoltage] = useState(0);
    const [rpms, setRpms] = useState(0);
    const [totalConsumption, setTotalConsumption] = useState(0);
    const [efficiency, setEfficiency] = useState(0);
    const [distance, setDistance] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            fetch("http://localhost:5050/")
                .then((res) => res.json())
                .then((data) => {
                    if (Array.isArray(data) && data.length > 0) {
                        const latest = data[data.length - 1];
                        setCurrent(latest.current);
                        setVoltage(latest.voltage);
                        setRpms(latest.rpms);
                        setTotalConsumption(latest.totalConsumption);
                        setEfficiency(latest.efficiency);
                        setDistance(latest.distance);
                    }
                })
                .catch((err) => console.error("Error fetching performance data:", err));
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="bg-[#0A0F1C] text-white p-4 rounded-xl shadow-lg w-full mx-auto h-full">
            <h2 className="text-xl font-semibold text-center">Performance</h2>
            <table className="w-full text-left table-auto">
                <thead>
                <tr className="border-b border-gray-600">
                    <th className="py-1 w-1/2 text-left">Metric</th>
                    <th className="py-1 w-1/2 text-left">Value</th>
                </tr>
                </thead>
                <tbody>
                <tr className="border-b border-gray-700">
                    <td className="py-1">Current</td>
                    <td className="py-1">{current} A</td>
                </tr>
                <tr className="border-b border-gray-700">
                    <td className="py-1">Voltage</td>
                    <td className="py-1">{voltage} V</td>
                </tr>
                <tr className="border-b border-gray-700">
                    <td className="py-1">RPMs</td>
                    <td className="py-1">{rpms}</td>
                </tr>
                <tr className="border-b border-gray-700">
                    <td className="py-1">Total Consumption</td>
                    <td className="py-1">{totalConsumption} Wh</td>
                </tr>
                <tr className="border-b border-gray-700">
                    <td className="py-1">Efficiency</td>
                    <td className="py-1">{efficiency} km/kWh</td>
                </tr>
                <tr>
                    <td className="py-1">Distance</td>
                    <td className="py-1">{distance} km</td>
                </tr>
                </tbody>
            </table>
        </div>
    );
};

export default PerformanceTable;