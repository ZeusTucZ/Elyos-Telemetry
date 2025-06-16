import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const VoltageCurrentChart = () => {
  const [dataHistory, setDataHistory] = useState([]);
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      fetch("http://localhost:5050/")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            const latest = data[data.length - 1];

            const newEntry = {
              id: counter,
              voltage: latest.voltage,
              current: latest.current,
            };

            setDataHistory((prev) => [...prev.slice(-19), newEntry]);
            setCounter((prev) => prev + 1);
          }
        })
        .catch((err) => console.error("Error fetching data:", err));
    }, 1000);

    return () => clearInterval(interval);
  }, [counter]);

  return (
    <div className="bg-[#0A0F1C] text-white p-4 rounded-xl shadow-lg w-full h-full">
      <h2 className="text-xl font-semibold text-center mb-4">Voltaje y Corriente</h2>
      <LineChart width={500} height={250} data={dataHistory}>
        <CartesianGrid strokeDasharray="3 3" stroke="#444" />
        <XAxis dataKey="id" stroke="#ccc" />
        <YAxis stroke="#ccc" />
        <Tooltip />
        <Legend />
        <Line
          type="linear"
          dataKey="voltage"
          stroke="#8884d8"
          name="Voltaje (V)"
          isAnimationActive={false}
        />
        <Line
          type="linear"
          dataKey="current"
          stroke="#82ca9d"
          name="Corriente (A)"
          isAnimationActive={false}
        />
      </LineChart>
    </div>
  );
};

export default VoltageCurrentChart;
