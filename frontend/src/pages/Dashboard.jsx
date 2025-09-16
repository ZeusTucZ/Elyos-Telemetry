import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

import Swal from 'sweetalert2';

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
      setCurrentLapTime(0);
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
    setLaps([]);
    setLapStartTime(0);
    setAverageLapTime(0);
    setCurrentLapTime(0);

    setTotalAh(0);
    setTotalKm(0);
    setTotalWh(0);

    try {
      await fetch('http://localhost:4999/api/record/reset', { method: 'POST' });
    } catch (err) {
      console.log(err);
    }
  };

  const [laps, setLaps] = useState([]);
  const [lapStartTime, setLapStartTime] = useState(0);
  const [lapsNumber, setLapsNumber] = useState(1);
  const [averageLapTime, setAverageLapTime] = useState(0);

  const handleNewLap = async () => {
    try {
      await fetch('http://localhost:4999/api/record/newLap', { method: 'POST' });
      const lapTime = runningTime - lapStartTime;
      const newLaps = [...laps, lapTime];
      setLaps(newLaps);
      setLapStartTime(runningTime);
      setCurrentLapTime(0);
      setLapsNumber(lapsNumber + 1);
      // Calculate the average
      const avg = newLaps.length > 0 ? newLaps.reduce((a, b) => a + b, 0) / newLaps.length : 0;
      setAverageLapTime(avg);
    } catch (err) {
      console.log(err)
    }
  };

  const handlePause = async () => {
    setIsRunning(false);
    setTimerActive(false)
    try {
      await fetch('http://localhost:4999/api/record/pause', { method: 'POST' });
    } catch (err) {
      console.log(err);
      alert("Error. Failed pause button. Is the backend running?")
    }
  }

  const [runningTime, setRunningTime] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [currentLapTime, setCurrentLapTime] = useState(0);

  // Count the time
  useEffect(() => {
    let interval = null;
    if (timerActive) {
      interval = setInterval(() => {
        setRunningTime(prev => prev + 1);
        setCurrentLapTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive]);

  const showDashboard = true;
  const [isRunning, setIsRunning] = useState(false);
  
  // Performance data
  const [velocity_x, setVelocity_x] = useState(0);
  const [velocity_y, setVelocity_y] = useState(0);
  const [current, setCurrent] = useState(0);
  const [voltage_battery, setVoltage] = useState(0);
  const [rpm_motor, setRpms] = useState(0);
  const [ambient_temp, setambient_temp] = useState(0);
  const [dataHistory, setDataHistory] = useState([]);
  const [counter, setCounter] = useState(0);

  // Special variables
  const [totalWh, setTotalWh] = useState(0);
  const [totalAh, setTotalAh] = useState(0);
  const [totalKm, setTotalKm] = useState(0);

  // Gear
  const WHEEL_DIAMETER_M = 0.5588;
  const GEAR_RATIO = 1;

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
            setVoltage(latest.voltage);
            setRpms(latest.rpms);
            setambient_temp(latest.ambient_temp);
            setLatitud(latest.latitude);
            setLongitud(latest.longitud);

            const dt = 1; // s

            // Energy eficiency
            const powerW = latest.voltage * latest.current;
            setTotalWh(prev => prev +  (powerW * dt) / 3600);
            setTotalAh(prev => prev + (latest.current * dt) / 3600);

            // Set distance
            const wheelCircM = Math.PI * WHEEL_DIAMETER_M; // m/rev
            const wheelRpm = latest.rpms / GEAR_RATIO;     // rev/min
            const metersThisTick = (wheelRpm / 60) * wheelCircM * dt;
            setTotalKm(prev => prev + (metersThisTick / 1000));

            // IMU data
            setRoll(latest.roll);
            setPitch(latest.pitch);
            setYaw(latest.yaw);
            setAccel_x(latest.acceleration_x);
            setAccel_y(latest.acceleration_y);

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

  const whPerKm = totalKm > 0 ? (totalWh / totalKm) : 0;
  const kmPerKWh = totalWh > 0 ? (totalKm / (totalWh / 1000)) : 0;

  return (
    <div className="relative">
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
              <Battery percentage={4 * voltage_battery} />
            </div>
            <div className="basis-[66%] bg-[#20233d] m-1 rounded-xl flex flex-col">
              <div className="basis-[50%] m-2 flex flex-row">
                <div className="basis-[60%] rounded-xl m-1 flex justify-center items-center">
                  <Speedometer speed={Math.sqrt((velocity_x ** 2) + (velocity_y ** 2))} />
                </div>
                <div className="basis-[40%] rounded-xl m-1">
                  <PerformanceTable
                    current={current}
                    voltage={voltage_battery}
                    rpms={rpm_motor}
                    totalConsumption={totalWh.toFixed(2)}
                    efficiency={kmPerKWh.toFixed(2)}
                    distance={totalKm.toFixed(3)}
                    ampHours={totalAh.toFixed(2)}
                    whPerKm={whPerKm.toFixed(2)}
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
                onNewLap={handleNewLap}
                running_time={`${Math.floor(runningTime / 60)}:${('0' + (runningTime % 60)).slice(-2)}`}
                currentLapTime={`${Math.floor(currentLapTime / 60)}:${('0' + (currentLapTime % 60)).slice(-2)}`}
                laps={laps}
                average_time={averageLapTime.toFixed(2)}
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
