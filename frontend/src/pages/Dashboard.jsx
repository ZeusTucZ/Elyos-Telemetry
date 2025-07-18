import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

import Landing from "../components/Landing";
import NavigationBar from "../components/NavigationBar";
import Speedometer from "../components/Speedometer";
import PerformanceTable from "../components/Performance";
import IMUdata from "../components/IMUdata";
import VoltageCurrentChart from "../components/ConsumptionStats";
import MapGPS from "../components/MapGPS";

const DashboardPage = () => {
  const [showDashboard, setShowDashboard] = useState(false);
  
  // Performance data
  const [speed, setSpeed] = useState(0);
  const [current, setCurrent] = useState(0);
  const [voltage, setVoltage] = useState(0);
  const [rpms, setRpms] = useState(0);
  const [totalConsumption, setTotalConsumption] = useState(0);
  const [efficiency, setEfficiency] = useState(0);
  const [distance, setDistance] = useState(0);
  const [dataHistory, setDataHistory] = useState([]);
  const [counter, setCounter] = useState(0);

  // IMU data
  const [roll, setRoll] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [yaw, setYaw] = useState(0);
  const [accel_x, setAccel_x] = useState(0);
  const [accel_y, setAccel_y] = useState(0);
  const [accel_z, setAccel_z] = useState(0);

  // Map GPS
  const [position, setPosition] = useState([0, 0]);

  useEffect(() => {
    if (!showDashboard) return;

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

            // IMU data
            setRoll(latest.roll);
            setPitch(latest.pitch);
            setYaw(latest.yaw);
            setAccel_x(latest.accel_x);
            setAccel_y(latest.accel_y);
            setAccel_z(latest.accel_z);

            if (latest.position && latest.position.lat && latest.position.lng) {
              setPosition([latest.position.lat, latest.position.lng]);
            }

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
  }, [counter, showDashboard]);

  return (
    <div className="relative">
      {!showDashboard && <Landing onFinish={() => setShowDashboard(true)} />}

      {showDashboard && (
        <>
          {/* Fade-in NavigationBar */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
          >
            <NavigationBar />
          </motion.div>

          {/* Fade-in Dashboard */}
          <motion.div
            className="min-h-screen flex flex-row bg-[#0A0F1C] text-white z-0 relative"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 3.2, ease: "easeOut" }}
          >
            <div className="basis-[60%] bg-[#20233d] m-2 rounded-xl flex flex-col">
              <div className="basis-[50%] m-2 flex flex-row">
                <div className="basis-[65%] rounded-xl m-1 flex justify-center items-center">
                  <Speedometer speed={speed} />
                </div>
                <div className="basis-[35%] rounded-xl m-1">
                  <PerformanceTable
                    current={current}
                    voltage={voltage}
                    rpms={rpms}
                    totalConsumption={totalConsumption}
                    efficiency={efficiency}
                    distance={distance}
                  />
                </div>
              </div>

              <div className="basis-[50%] m-2 rounded-xl flex flex-row">
                <div className="basis-[65%] bg-white rounded-xl m-1">
                  <VoltageCurrentChart dataHistory={dataHistory} />
                </div>
                <div className="basis-[35%] bg-white rounded-xl m-1">
                  <IMUdata 
                    roll={roll}
                    pitch={pitch}
                    yaw={yaw}
                    accel_x={accel_x}
                    accel_y={accel_y}
                    accel_z={accel_z}
                  />
                </div>
              </div>
            </div>

            <div className="basis-[40%] bg-[#20233d] m-2 rounded-xl flex flex-col">
              <div className="basis-[50%] m-2 rounded-xl bg-white">
                <MapGPS position={position}/>
              </div>
              <div className="basis-[50%] m-2 rounded-xl bg-white">
                {/* Time and race control */}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
