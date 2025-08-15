import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

import Swal from 'sweetalert2';

import Landing from "../components/Landing";
import Speedometer from "../components/Speedometer";
import PerformanceTable from "../components/Performance";
import IMUdata from "../components/IMUdata";
import VoltageCurrentChart from "../components/ConsumptionStats";
import MapGPS from "../components/MapGPS";
import RaceStats from "../components/RaceStats";
import Battery from "../components/Battery";

const DashboardPage = () => {
  // Solo muestra el landing si no se ha mostrado antes
  const [showDashboard, setShowDashboard] = useState(() => {
    return localStorage.getItem("elyosLandingShown") === "true";
  });

  const handleLandingFinish = () => {
    setShowDashboard(true);
    localStorage.setItem("elyosLandingShown", "true");
  };

  const handleStart = async () => {
    try {
      await fetch('http://localhost:4999/api/record/start', { method: 'POST' });
      setIsRunning(true);
      setTimerActive(true);
    } catch (err) {
      console.log(err);
      alert("Error. Failed start button. Is the backend running?")
    }
  }

  const handleReset = async () => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'You will lose all session lectures',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, reset it!',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) return;

    setIsRunning(false);
    setRunningTime(0);
    setTimerActive(false);

    try {
      await fetch('http://localhost:4999/api/record/reset', { method: 'POST' });
    } catch (err) {
      console.log(err);
    }
  };

  const handlePause = async () => {
    setIsRunning(false);
    try {
      await fetch('http://localhost:4999/api/record/pause', { method: 'POST' });
      setTimerActive(false)
    } catch (err) {
      console.log(err);
      alert("Error. Failed pause button. Is the backend running?")
    }
  }

  const [runningTime, setRunningTime] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  // Count the time
  useEffect(() => {
    let interval = null;
    if (timerActive) {
      interval = setInterval(() => {
        setRunningTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive]);

  const [isRunning, setIsRunning] = useState(false);
  
  // Performance data
  const [velocity_x, setVelocity_x] = useState(0);
  const [velocity_y, setVelocity_y] = useState(0);
  const [current, setCurrent] = useState(0);
  const [voltage_battery, setVoltage] = useState(0);
  const [rpm_motor, setRpms] = useState(0);
  const [ambient_temp, setambient_temp] = useState(0);
  const [totalConsumption, setTotalConsumption] = useState(0); // ?
  const [efficiency, setEfficiency] = useState(0); // ?
  const [dataHistory, setDataHistory] = useState([]);
  const [counter, setCounter] = useState(0);

  // IMU data
  const [roll, setRoll] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [yaw, setYaw] = useState(0);
  const [acceleration_x, setAccel_x] = useState(0);
  const [acceleration_y, setAccel_y] = useState(0);

  // Map GPS
  const [latitude, setLatitud] = useState(0);
  const [longitud, setLongitud] = useState(0);

  useEffect(() => {
    if (!showDashboard || !isRunning) return;

    const interval = setInterval(() => {
      fetch("http://localhost:4999/api/lectures")
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data) && data.length > 0) {
            const latest = data[data.length - 1];
            setVelocity_x(latest.velocity_x);
            setVelocity_y(latest.velocity_y);
            setCurrent(latest.current);
            setVoltage(latest.voltage_battery);
            setRpms(latest.rpms);
            setTotalConsumption(latest.totalConsumption);
            setEfficiency(latest.efficiency);
            setambient_temp(latest.ambient_temp);
            setLatitud(latest.latitude);
            setLongitud(latest.longitud);

            // IMU data
            setRoll(latest.roll);
            setPitch(latest.pitch);
            setYaw(latest.yaw);
            setAccel_x(latest.acceleration_x);
            setAccel_y(latest.acceleration_y);

            const newEntry = {
              id: counter,
              voltage: latest.voltage_battery,
              current: latest.current,
            };

            setDataHistory((prev) => [...prev.slice(-19), newEntry]);
            setCounter((prev) => prev + 1);
          }
        })
        .catch((err) => console.error("Error fetching data:", err));
    }, 1000);

    return () => clearInterval(interval);
  }, [counter, showDashboard, isRunning]);

  return (
    <div className="relative">
      {!showDashboard && <Landing onFinish={handleLandingFinish} />}

      {showDashboard && (
        <>
          {/* Fade-in Dashboard */}
          <motion.div
            className="min-h-screen flex flex-row bg-[#0A0F1C] text-white z-0 relative"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 3.2, ease: "easeOut" }}
          >
            <div className="basis-[4%] bg-white m-1 rounded-xl">
              {/* Baterry */}
              <Battery percentage={4 * voltage_battery} />
            </div>
            <div className="basis-[66%] bg-[#20233d] m-1 rounded-xl flex flex-col">
              <div className="basis-[50%] m-2 flex flex-row">
                <div className="basis-[60%] rounded-xl m-1 flex justify-center items-center">
                  <Speedometer speed={Math.sqrt((velocity_x)^2 + (velocity_y)^2)} />
                </div>
                <div className="basis-[40%] rounded-xl m-1">
                  <PerformanceTable
                    current={current}
                    voltage={voltage_battery}
                    rpms={rpm_motor * Math.PI * 0.5588}
                    totalConsumption={totalConsumption}
                    efficiency={efficiency}
                    distance={rpm_motor}
                    ambient_temp={ambient_temp}
                  />
                </div>
              </div>

              <div className="basis-[30%] m-2 rounded-xl flex flex-row">
                <div className="basis-[65%] bg-white rounded-xl m-1">
                  <VoltageCurrentChart dataHistory={dataHistory} />
                </div>
                <div className="basis-[35%] bg-white rounded-xl m-1">
                  <IMUdata 
                    roll={roll}
                    pitch={pitch}
                    yaw={yaw}
                    accel_x={acceleration_x}
                    accel_y={acceleration_y}
                  />
                </div>
              </div>
            </div>

            <div className="basis-[52%] bg-[#20233d] m-1 rounded-xl flex flex-col">
              <div className="basis-[50%] rounded-xl bg-white">
                <MapGPS latitude={latitude} longitud={longitud}/>
              </div>
              <div className="basis-[50%] rounded-xl">
                <RaceStats 
                onStart={handleStart}
                onPause={handlePause}
                onReset={handleReset}
                running_time={`${Math.floor(runningTime / 60)}:${('0' + (runningTime % 60)).slice(-2)}`}
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
