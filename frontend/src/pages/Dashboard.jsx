import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

import Swal from 'sweetalert2';

import Landing from "../components/Landing";
import NavigationBar from "../components/NavigationBar";
import Speedometer from "../components/Speedometer";
import PerformanceTable from "../components/Performance";
import IMUdata from "../components/IMUdata";
import VoltageCurrentChart from "../components/ConsumptionStats";
import MapGPS from "../components/MapGPS";
import RaceStats from "../components/RaceStats";
import Battery from "../components/Battery";

const DashboardPage = () => {
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

  const [showDashboard, setShowDashboard] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  
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
    if (!showDashboard || !isRunning) return;

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
  }, [counter, showDashboard, isRunning]);

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
            <div className="basis-[4%] bg-white m-1 rounded-xl">
              {/* Baterry */}
              <Battery percentage={100} />
            </div>
            <div className="basis-[66%] bg-[#20233d] m-1 rounded-xl flex flex-col">
              <div className="basis-[50%] m-2 flex flex-row">
                <div className="basis-[60%] rounded-xl m-1 flex justify-center items-center">
                  <Speedometer speed={speed} />
                </div>
                <div className="basis-[40%] rounded-xl m-1">
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

              <div className="basis-[30%] m-2 rounded-xl flex flex-row">
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

            <div className="basis-[52%] bg-[#20233d] m-1 rounded-xl flex flex-col">
              <div className="basis-[50%] rounded-xl bg-white">
                <MapGPS position={position}/>
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
