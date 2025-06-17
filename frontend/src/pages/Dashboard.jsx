import Speedometer from "../components/Speedometer";
import PerformanceTable from "../components/Performance";
import VoltageCurrentChart from "../components/ConsumptionStats";

import React, {useState, useEffect} from "react";

const DashboardPage = () => {
    const [speed, setSpeed] = useState(0);
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
                        setSpeed(latest.speed);
                        setCurrent(latest.current);
                        setVoltage(latest.voltage);
                        setRpms(latest.rpms);
                        setTotalConsumption(latest.totalConsumption);
                        setEfficiency(latest.efficiency);
                        setDistance(latest.distance);
                    }
                })
                .catch((err) => console.error("Error fetching data:", err));
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <>
            <div className="h-[83vh] flex flex-row">
                <div className="basis-[60%] bg-[#20233d] m-2 rounded-xl flex flex-col">
                    {/* Left square */}
                    <div className="basis-[50%] m-2 flex flex-row">
                        {/* The following contains the speedometer and the performance data */}
                        <div className="basis-[65%] rounded-xl m-1 flex justify-center items-center">
                            {/* Speedometer */}
                            <Speedometer speed={speed}/>
                        </div>
                        <div className="basis-[35%] rounded-xl m-1">
                            {/* Performance data */}
                            <PerformanceTable current={current} voltage={voltage} rpms={rpms} totalConsumption={totalConsumption} efficiency={efficiency} distance={distance}/>
                        </div>
                    </div>

                    <div className="basis-[50%] m-2 rounded-xl flex flex-row">
                        {/* The following contains the consumption stats and the IMU data */}
                        <div className="basis-[65%] bg-white rounded-xl m-1">
                            {/* Consumption Stats */}
                            <VoltageCurrentChart />
                        </div>
                        <div className="basis-[35%] bg-white rounded-xl m-1">
                            {/* IMU data */}
                        </div>
                    </div>
                </div>

                <div className="basis-[40%] bg-[#20233d] m-2 rounded-xl flex flex-col">
                    {/* Right square */}
                    <div className="basis-[50%] m-2 rounded-xl bg-white">
                        {/* GPS Map */}
                    </div>
                    <div className="basis-[50%] m-2 rounded-xl bg-white">
                        {/* Time and race control */}
                    </div>
                </div>
            </div>
        </>
    );
}

export default DashboardPage;