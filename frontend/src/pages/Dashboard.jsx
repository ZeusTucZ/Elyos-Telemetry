import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { io } from "socket.io-client";
import Swal from 'sweetalert2';

import NavigationBar from "../components/NavigationBar";
import Speedometer from "../components/Speedometer";
import Throttle from "../components/Throttle";
import PerformanceTable from "../components/Performance";
import IMUdata from "../components/IMUdata";
import VoltageCurrentChart from "../components/ConsumptionStats";
import MapGPS from "../components/MapGPS";
import RaceStats from "../components/RaceStats";
import RaceStrategyPanel from "../components/RaceStrategyPanel";
import Battery from "../components/Battery";
import {
  STRATEGY_DEFAULTS,
  buildRaceStrategy,
  buildTelemetryHistory,
  getLectureSampleKey,
  mergeLectureCollections,
  mergeLectureIntoBuffer,
} from "../components/raceStrategy";

const BACKEND_ORIGIN = (
  process.env.REACT_APP_BACKEND_ORIGIN || "https://elyos-telemetry-exylp.ondigitalocean.app"
).replace(/\/+$/, "");
const BACKEND_BASE_PATH = (
  process.env.REACT_APP_BACKEND_BASE_PATH || "/elyos-telemetry-backend"
).replace(/\/+$/, "");
const API_PREFIX = `${BACKEND_BASE_PATH}/api`;
const socket = io(BACKEND_ORIGIN, {
  path: `${API_PREFIX}/socket.io`,
  transports: ["websocket", "polling"],
});

socket.on("connect", () => {
  console.log("[socket] connected", {
    id: socket.id,
    transport: socket.io.engine.transport.name,
    path: `${API_PREFIX}/socket.io`
  });
});

socket.on("connect_error", (error) => {
  console.log("[socket] connect_error", {
    message: error?.message,
    description: error?.description,
    context: error?.context,
    type: error?.type
  });
});

socket.on("disconnect", (reason) => {
  console.log("[socket] disconnected", { reason });
});

const createZeroChartEntry = () => ({
  id: "start-point",
  timeSeconds: 0,
  voltage: 0,
  current: 0,
});

const formatDuration = (totalSeconds) => {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
  return `${Math.floor(safeSeconds / 60)}:${("0" + (safeSeconds % 60)).slice(-2)}`;
};

const formatNumber = (value) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "--";
  }

  return numericValue.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
};

const formatValueWithUnit = (value, unit = "") => {
  const formattedValue = formatNumber(value);
  return formattedValue === "--" ? "--" : `${formattedValue}${unit}`;
};

const calculateAirDensity = (altitudeMeters = 0, isRunning) => {
  if (!isRunning) {
    return 0;
  }
  const SEA_LEVEL_DENSITY = 1.225;
  const TEMPERATURE_LAPSE_RATE = 0.0065;
  const SEA_LEVEL_TEMPERATURE = 288.15;
  const GRAVITY = 9.81;
  const MOLAR_MASS_AIR = 0.028964;
  const UNIVERSAL_GAS_CONSTANT = 8.314;

  const safeAltitude = Math.max(0, Number(altitudeMeters) || 0);
  const base = 1 - (TEMPERATURE_LAPSE_RATE * safeAltitude) / SEA_LEVEL_TEMPERATURE;

  if (base <= 0) {
    return 0;
  }

  const exponent =
    (GRAVITY * MOLAR_MASS_AIR) /
      (UNIVERSAL_GAS_CONSTANT * TEMPERATURE_LAPSE_RATE) -
    1;

  return SEA_LEVEL_DENSITY * Math.pow(base, exponent);
};

const DashboardPage = () => {
  const API_BASE = `${BACKEND_ORIGIN}${API_PREFIX}`;
  const DEFAULT_LATITUDE = 39.792149;
  const DEFAULT_LONGITUDE = -86.238707;

  // States
  const [canControl, setCanControl] = useState(false);
  const [ingestionEnabled, setIngestionEnabled] = useState(true);
  const [ingestionLoading, setIngestionLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(null);

  const [laps, setLaps] = useState([]);
  const [lapsNumber, setLapsNumber] = useState(1);
  const [maxLaps, setMaxLaps] = useState(5);
  const [averageLapTime, setAverageLapTime] = useState(0);

  const [runningTime, setRunningTime] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentLapTime, setCurrentLapTime] = useState(0);
  const [remaining_time, setRemainingTime] = useState(2100)
  const [raceStartTime, setRaceStartTime] = useState(null);
  const [lastLapStartTime, setLastLapStartTime] = useState(null);

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
  const [telemetryBuffer, setTelemetryBuffer] = useState([]);
  const [throttle, setThrottle] = useState(0);
  const [strategyConfig, setStrategyConfig] = useState({
    trackLengthKm: STRATEGY_DEFAULTS.trackLengthKm,
    minSpeedKph: STRATEGY_DEFAULTS.minSpeedKph,
    maxSpeedKph: STRATEGY_DEFAULTS.maxSpeedKph,
    candidateStepKph: STRATEGY_DEFAULTS.candidateStepKph,
    historyLimit: STRATEGY_DEFAULTS.historyLimit,
  });

  // Special variables
  const [totalWh, setTotalWh] = useState(0);
  const [totalAh, setTotalAh] = useState(0);
  const [totalKm, setTotalKm] = useState(0);

  // Gear and motor
  const WHEEL_DIAMETER_M = 0.5588;
  const [gearRatio, setGearRatio] = useState(1.0);
  const [motorId, setMotorId] = useState('Koford');

  // IMU data
  const [roll, setRoll] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [yaw, setYaw] = useState(0);
  const [acceleration_x, setAccel_x] = useState(0);
  const [acceleration_y, setAccel_y] = useState(0);

  // Map GPS
  const [latitude, setLatitud] = useState(DEFAULT_LATITUDE);
  const [longitud, setLongitud] = useState(DEFAULT_LONGITUDE);

  // Extra variables
  const [altitude, setAltitude] = useState(0);
  const [numberOfSatellites, setNumberOfSatellites] = useState(0);
  const [airSpeed, setAirSpeed] = useState(0);
  const [weatherData, setWeatherData] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const lastProcessedLectureKeyRef = useRef(null);
  const autoResetTriggeredRef = useRef(false);
  const latencyTestCounterRef = useRef(0);

  const RACE_DURATION_SECONDS = 35 * 60;
  const MAX_LAP_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const airDensity = calculateAirDensity(altitude, isRunning);
  const telemetryHistory = useMemo(
    () => buildTelemetryHistory(telemetryBuffer, strategyConfig),
    [telemetryBuffer, strategyConfig],
  );
  const strategyRecommendation = useMemo(
    () =>
      buildRaceStrategy({
        history: telemetryHistory,
        remainingTimeSeconds: remaining_time,
        currentLap: lapsNumber,
        maxLaps,
        config: strategyConfig,
      }),
    [telemetryHistory, remaining_time, lapsNumber, maxLaps, strategyConfig],
  );
  const currentSpeedKph = useMemo(
    () => Math.sqrt((Number(velocity_x) || 0) ** 2 + (Number(velocity_y) || 0) ** 2),
    [velocity_x, velocity_y],
  );

  const calculateAverageLapTime = useCallback((lapsArray = []) => {
    if (!lapsArray.length) return 0;
    return lapsArray.reduce((acc, lap) => acc + lap, 0) / lapsArray.length;
  }, []);

  const processIncomingLecture = useCallback((latest) => {
    if (!latest || !showDashboard || !isRunning) return;

    const receivedAtMs = Date.now();
    const lectureKey = getLectureSampleKey(latest);
    const isNewLecture =
      lectureKey !== null && lectureKey !== lastProcessedLectureKeyRef.current;

    setVelocity_x(latest.velocity_x);
    setVelocity_y(latest.velocity_y);
    setCurrent(latest.current);
    setVoltage(latest.voltage_battery);
    setRpms(latest.rpm_motor);
    setambient_temp(latest.ambient_temp);
    setThrottle(latest.throttle ?? latest.accelPct ?? 0);

    const nextLat = Number(latest.latitude);
    const nextLng = Number(latest.longitude);
    if (Number.isFinite(nextLat) && Number.isFinite(nextLng)) {
      setLatitud(nextLat);
      setLongitud(nextLng);
    }

    if (!isNewLecture) {
      return;
    }

    lastProcessedLectureKeyRef.current = lectureKey;
    setTelemetryBuffer((prev) =>
      mergeLectureIntoBuffer(prev, latest, strategyConfig.historyLimit),
    );

    const dt = 1;
    const powerW = latest.voltage_battery * latest.current;
    setTotalWh((prev) => prev + (powerW * dt) / 3600);
    setTotalAh((prev) => prev + (latest.current * dt) / 3600);

    const wheelCircM = Math.PI * WHEEL_DIAMETER_M;
    const wheelRpm = latest.rpm_motor / gearRatio;
    const metersThisTick = (wheelRpm / 60) * wheelCircM * dt;
    setTotalKm((prev) => prev + (metersThisTick / 1000));

    setRoll(latest.orientation_x);
    setPitch(latest.orientation_y);
    setYaw(latest.orientation_z);
    setAccel_x(latest.acceleration_x);
    setAccel_y(latest.acceleration_y);

    setAltitude(latest.altitude_m);
    setNumberOfSatellites(latest.num_sats);
    setAirSpeed(latest.air_speed);

    const elapsedHistorySeconds = raceStartTime
      ? Math.max(0, Math.floor((Date.now() - raceStartTime) / 1000))
      : 0;

    const newEntry = {
      id: lectureKey,
      timeSeconds: elapsedHistorySeconds,
      voltage: latest.voltage_battery,
      current: latest.current,
    };

    setDataHistory((prev) => [...prev.slice(-19), newEntry]);

    if (latest.server_received_at_ms !== undefined) {
      requestAnimationFrame(() => {
        latencyTestCounterRef.current += 1;
        const renderedAtMs = Date.now();
        const sample = {
          testNumber: latencyTestCounterRef.current,
          lectureId: latest.id,
          serverReceivedAtMs: latest.server_received_at_ms,
          clientReceivedAtMs: receivedAtMs,
          clientRenderedAtMs: renderedAtMs,
          receiveLatencyMs: receivedAtMs - latest.server_received_at_ms,
          renderLatencyMs: renderedAtMs - latest.server_received_at_ms
        };

        window.telemetryLatencySamples = window.telemetryLatencySamples || [];
        window.telemetryLatencySamples.push(sample);

        console.log(sample);
      });
    }
  }, [
    WHEEL_DIAMETER_M,
    gearRatio,
    raceStartTime,
    showDashboard,
    isRunning,
    strategyConfig.historyLimit,
  ]);

  const handleMaxLapsChange = (value) => {
    if (!canControl) return;
    setMaxLaps(value);
    socket.emit("comando-admin", {
      accion: "SET_MAX_LAPS",
      maxLaps: value
    })
  }

  const resetConsumptionStats = useCallback(() => {
    setDataHistory([]);
    setTelemetryBuffer([]);
    setTotalAh(0);
    setTotalKm(0);
    setTotalWh(0);
    setCurrent(0);
    setVoltage(0);
    setRpms(0);
    setThrottle(0);
    lastProcessedLectureKeyRef.current = null;
  }, []);

  const handleStrategyConfigChange = useCallback((nextPartialConfig) => {
    setStrategyConfig((previousConfig) => ({
      ...previousConfig,
      ...nextPartialConfig,
    }));
  }, []);

  const syncRaceState = useCallback((state) => {
    const lapsFromState = state?.laps ?? [];
    const lapsNumberFromState = state?.lapsNumber ?? 1;
    const maxLapsFromState = state?.maxLaps ?? 5;

    setLaps(lapsFromState);
    setLapsNumber(lapsNumberFromState);
    setMaxLaps(maxLapsFromState);
    setAverageLapTime(calculateAverageLapTime(lapsFromState));

    if (!state?.isRunning && !state?.isPaused) {
      setIsRunning(false);
      setIsPaused(false);
      setTimerActive(false);
      setRunningTime(0);
      setCurrentLapTime(0);
      setRemainingTime(RACE_DURATION_SECONDS);
      setRaceStartTime(null);
      setLastLapStartTime(null);
      resetConsumptionStats();
      autoResetTriggeredRef.current = false;
      return;
    }

    if (state?.isPaused) {
      setIsRunning(false);
      setIsPaused(true);
      setTimerActive(false);
      return;
    }

    const clientNow = Date.now();
    const serverNow = typeof state?.serverNow === "number" ? state.serverNow : clientNow;
    const raceStartServer = typeof state?.startTime === "number" ? state.startTime : serverNow;
    const lapStartServer = typeof state?.lastLapStartTime === "number" ? state.lastLapStartTime : raceStartServer;
    const elapsedMilliseconds = Math.max(0, serverNow - raceStartServer);
    const elapsedCurrentLapMilliseconds = Math.max(0, serverNow - lapStartServer);
    const normalizedRaceStart = clientNow - elapsedMilliseconds;
    const normalizedLapStart = clientNow - elapsedCurrentLapMilliseconds;
    const elapsedSeconds = Math.max(0, Math.floor(elapsedMilliseconds / 1000));
    const elapsedCurrentLap = Math.max(0, Math.floor(elapsedCurrentLapMilliseconds / 1000));

    setIsRunning(true);
    setIsPaused(false);
    setTimerActive(true);
    setRaceStartTime(normalizedRaceStart);
    setLastLapStartTime(normalizedLapStart);
    setRunningTime(elapsedSeconds);
    setCurrentLapTime(elapsedCurrentLap);
    setRemainingTime(Math.max(0, RACE_DURATION_SECONDS - elapsedSeconds));
    autoResetTriggeredRef.current = false;
  }, [RACE_DURATION_SECONDS, calculateAverageLapTime, resetConsumptionStats]);

  // Enter initial state
  useEffect(() => {
    socket.on("init-state", (state) => {
      console.log("Sincronizando estado inicial:", state);
      syncRaceState(state);
    });

    return () => socket.off("init-state");
  }, [syncRaceState]);

  useEffect(() => {
    const handleTelemetryLecture = (lecture) => {
      processIncomingLecture(lecture);
    };

    socket.on("telemetry:new-lecture", handleTelemetryLecture);
    return () => socket.off("telemetry:new-lecture", handleTelemetryLecture);
  }, [processIncomingLecture]);

  useEffect(() => {
    if (!isRunning && !isPaused) {
      return undefined;
    }

    let ignore = false;

    const fetchLiveBuffer = async () => {
      try {
        const response = await fetch(
          `${API_BASE}/lectures/live-buffer?limit=${strategyConfig.historyLimit}`,
        );
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        if (!Array.isArray(data) || ignore) {
          return;
        }

        setTelemetryBuffer((prev) =>
          mergeLectureCollections(prev, data, strategyConfig.historyLimit),
        );
      } catch (error) {
        console.warn("Live telemetry buffer unavailable:", error);
      }
    };

    fetchLiveBuffer();

    return () => {
      ignore = true;
    };
  }, [API_BASE, isRunning, isPaused, strategyConfig.historyLimit]);

  useEffect(() => {
    const latestSample = telemetryHistory[telemetryHistory.length - 1];
    if (!latestSample) {
      return;
    }

    const ampHours = telemetryHistory.reduce(
      (sum, sample) => sum + ((Number(sample.lecture?.current) || 0) * sample.dtSeconds) / 3600,
      0,
    );

    setTotalWh(latestSample.energyWh);
    setTotalKm(latestSample.distanceKm);
    setTotalAh(ampHours);
  }, [telemetryHistory]);

  useEffect(() => {
    // Pedir datos al cargar por primera vez
    fetch(`${API_BASE}/vehicle-params`)
      .then(res => res.json())
      .then(data => {
        setGearRatio(data.gearRatio);
        setMotorId(data.motorId);
      });

    // Escuchar actualizaciones en tiempo real
    const handleUpdate = (data) => {
      setGearRatio(data.gearRatio);
      setMotorId(data.motorId);
    };

    socket.on("params-updated", handleUpdate);
    return () => socket.off("params-updated", handleUpdate);
  }, [API_BASE]);

  const handleSettingsUpdate = async () => {
    if (!canControl) return;

    const { value: formValues } = await Swal.fire({
      title: 'Vehicle Parameters',
      html:
        `<label>Motor ID</label>` +
        `<select id="swal-motor" class="swal2-input">
          <option value="Koford" ${motorId === 'Koford' ? 'selected' : ''}>Koford</option>
          <option value="HUB1" ${motorId === 'HUB1' ? 'selected' : ''}>HUB1</option>
        </select>` + 
        `<br>` +
        `<label>Gear Ratio</label>` +
        `<input id="swal-ratio" class="swal2-input" type="number" step="0.01" value="${gearRatio}">`,
      focusConfirm: false,
      showCancelButton: true,
      preConfirm: () => {
        return {
          motorId: document.getElementById('swal-motor').value,
          gearRatio: document.getElementById('swal-ratio').value
        }
      }
    });

    if (formValues) {
      // Mandamos los datos al servidor vía POST
      await fetch(`${API_BASE}/vehicle-params`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formValues)
      });
      Swal.fire('Updated!', 'Vehicle parameters changed.', 'success');
    }
  };


  // Logic functions
  const executeResetLogic = useCallback(() => {
    setIsRunning(false);
    setRunningTime(0);
    setRemainingTime(RACE_DURATION_SECONDS);
    setTimerActive(false);
    setLaps([]);
    setAverageLapTime(0);
    setCurrentLapTime(0);
    setLapsNumber(1);
    setRaceStartTime(null);
    setLastLapStartTime(null);
    resetConsumptionStats();
    setVelocity_x(0);
    setVelocity_y(0);
    setambient_temp(0);
    setRoll(0);
    setPitch(0);
    setYaw(0);
    setAccel_x(0);
    setAccel_y(0);
    setLatitud(DEFAULT_LATITUDE);
    setLongitud(DEFAULT_LONGITUDE);
    setAltitude(0);
    setNumberOfSatellites(0);
    setAirSpeed(0);
    setIsPaused(false);
    autoResetTriggeredRef.current = false;
  }, [DEFAULT_LATITUDE, DEFAULT_LONGITUDE, RACE_DURATION_SECONDS, resetConsumptionStats]);

  // Socket effects
  useEffect(() => {
    socket.on("ejecutar-accion", (data) => {
      console.log("Acción remota recibida:", data.accion);
      if (data.state) {
        if (data.accion === "START_RACE" || data.accion === "RESET_RACE") {
          resetConsumptionStats();
        }
        syncRaceState(data.state);
        return;
      }

      if (data.accion === "RESET_RACE") {
        executeResetLogic();
      }
    });
    return () => socket.off("ejecutar-accion");
  }, [executeResetLogic, resetConsumptionStats, syncRaceState]);

  // Check authentication
  useEffect(() => {
    const fetchPermissions = async () => {
      // Leemos el token de la URL (si existe)
      const urlParams = new URLSearchParams(window.location.search);
      const myToken = urlParams.get('token');

      try {
        // Enviamos el token al servidor para que lo valide
        const resp = await fetch(`${API_BASE}/auth/check-control`, {
          headers: {
            'Authorization': `Bearer ${myToken}`
          }
        });
        const data = await resp.json();
        setCanControl(data.canControl);
      } catch (err) {
        setCanControl(false);
      }
    };
    fetchPermissions();
  }, [API_BASE]);

  useEffect(() => {
    const fetchIngestionStatus = async () => {
      try {
        const response = await fetch(`${API_BASE}/record/ingestion`);
        if (!response.ok) return;
        const data = await response.json();
        setIngestionEnabled(Boolean(data.ingestionEnabled));
      } catch (err) {
        console.error("Error reading ingestion status:", err);
      }
    };

    fetchIngestionStatus();
  }, [API_BASE]);

  useEffect(() => {
    const fetchStoredWeather = async () => {
      try {
        const response = await fetch(`${API_BASE}/record/weather`);
        if (!response.ok) return;

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          const preview = (await response.text()).slice(0, 200);
          console.error('GET /weather returned non-JSON:', preview);
          return;
        }

        const data = await response.json();
        setWeatherData(data.data ?? null);
      } catch (err) {
        console.error('Error reading weather data:', err);
      }
    };

    fetchStoredWeather();
  }, [API_BASE]);

  const updateIngestionStatus = useCallback(async (nextValue) => {
    const response = await fetch(`${API_BASE}/record/ingestion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingestionEnabled: nextValue })
    });

    if (!response.ok) {
      throw new Error('Unable to update ingestion status');
    }

    const data = await response.json();
    const nextState = Boolean(data.ingestionEnabled);
    setIngestionEnabled(nextState);
    return nextState;
  }, [API_BASE]);

  const performReset = useCallback(async () => {
    executeResetLogic();
    socket.emit("comando-admin", { accion: "RESET_RACE" });

    try {
      await updateIngestionStatus(false);
      await fetch(`${API_BASE}/record/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearSession: true })
      });
      setCurrentSessionId(null);
    } catch (err) {
      console.error(err);
    }
  }, [API_BASE, executeResetLogic, updateIngestionStatus]);

  // Admin functions
  const handleStart = async () => {
    if (!canControl) return;
    const { value: formValues } = await Swal.fire({
      title: 'Create Session',
      html:
        `<label>Session Type</label>` +
        `<select id="swal-session-type" class="swal2-input">
          <option value="test">Test</option>
          <option value="real">Real</option>
        </select>` +
        `<label>Session Group</label>` +
        `<input id="swal-session-group" class="swal2-input" placeholder="e.g. 2026-03-16-track-a">` +
        `<label>Run Number</label>` +
        `<input id="swal-run-number" class="swal2-input" type="number" min="1" step="1" placeholder="e.g. 1">` +
        `<label>Description</label>` +
        `<input id="swal-session-description" class="swal2-input" placeholder="Optional notes">`,
      focusConfirm: false,
      showCancelButton: true,
      preConfirm: () => {
        const sessionType = document.getElementById('swal-session-type').value;
        const sessionGroupId = document.getElementById('swal-session-group').value.trim();
        const runNumberValue = document.getElementById('swal-run-number').value.trim();
        const description = document.getElementById('swal-session-description').value.trim();

        if (runNumberValue && (!Number.isInteger(Number(runNumberValue)) || Number(runNumberValue) <= 0)) {
          Swal.showValidationMessage('Run number must be a positive integer');
          return false;
        }

        return {
          session_type: sessionType,
          session_group_id: sessionGroupId || null,
          run_number: runNumberValue ? Number(runNumberValue) : null,
          description: description || null
        };
      }
    });

    if (!formValues) return;

    let createdSession;
    try {
      const response = await fetch(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formValues)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Unable to create session');
      }

      createdSession = await response.json();

      const recordResponse = await fetch(`${API_BASE}/record/start`, {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: createdSession.id })
      });

      if (!recordResponse.ok) {
        throw new Error('Unable to start recording');
      }
    } catch (err) {
      console.error("Error starting session:", err);
      Swal.fire('Error', err.message || 'Could not start the session', 'error');
      return;
    }

    setCurrentSessionId(createdSession.id);
    const now = Date.now();
    resetConsumptionStats();
    autoResetTriggeredRef.current = false;
    setIsPaused(false);
    setIsRunning(true);
    setTimerActive(true);
    setRunningTime(0);
    setCurrentLapTime(0);
    setRemainingTime(RACE_DURATION_SECONDS);
    setRaceStartTime(now);
    setLastLapStartTime(now);
    setDataHistory([createZeroChartEntry()]);
    setLaps([]);
    setLapsNumber(1);
    setAverageLapTime(0);
    socket.emit("comando-admin", { accion: "START_RACE" });
  };

  const handlePauseToggle = async () => {
    if (!canControl) return;
    if (isPaused) {
      socket.emit("comando-admin", { accion: "RESUME_RACE" });

      try {
        await fetch(`${API_BASE}/record/start`, {
          method: "POST",
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: currentSessionId })
        });
      } catch (err) { console.warn("Backend error", err); }
      return;
    }

    if (!raceStartTime) return;
    socket.emit("comando-admin", { accion: "PAUSE_RACE" });

    try {
      await updateIngestionStatus(false);
      await fetch(`${API_BASE}/record/pause`, {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clearSession: false })
      });
    } catch (err) { console.warn("Backend error", err); }
  };

  const handleReset = async () => {
    if (!canControl) return;
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'You will lose all session lectures',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, reset it!',
    });
    if (!result.isConfirmed) return;

    await performReset();
  };

  const handleNewLap = async () => {
    if (!canControl) return;
    if (lapsNumber >= maxLaps) {
      Swal.fire('Max laps reached', `You selected ${maxLaps} laps as the limit for this competition.`, 'info');
      return;
    }
    socket.emit("comando-admin", { accion: "NEW_LAP" });
    try {
      await fetch(`${API_BASE}/record/newLap`, { method: 'POST' });
    } catch (err) { console.error(err); }
  };

  const handleDeleteLastLap = async () => {
    if (!canControl || laps.length === 0) return;

    const result = await Swal.fire({
      title: 'Delete last lap?',
      text: 'This will remove the most recently added lap and restore the previous lap timing.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it'
    });

    if (!result.isConfirmed) return;

    socket.emit("comando-admin", { accion: "DELETE_LAST_LAP" });
  };

  const handleSave = async () => {
    if (!canControl) return;
    try {
      const resp = await fetch(`${API_BASE}/record/save`, { method: 'GET' });
      if (!resp.ok) return; // maneja error
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'lectures.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.warn("Asegurate de iniciar el backend")
    }
  }

  const handleToggleIngestion = async () => {
    if (!canControl || ingestionLoading) return;

    const nextValue = !ingestionEnabled;
    setIngestionLoading(true);

    try {
      await updateIngestionStatus(nextValue);
    } catch (err) {
      console.error("Error updating ingestion status:", err);
      Swal.fire('Error', 'Could not change data ingestion state', 'error');
    } finally {
      setIngestionLoading(false);
    }
  };

  const handleNewMessage = async () => {
    if (!canControl) return;

    const { value: formValues } = await Swal.fire({
      title: 'Escribir Mensaje',
      input: 'textarea',
      inputPlaceholder: 'Escribe tu mensaje aquí...',
      showCancelButton: true,
      confirmButtonText: 'Enviar',
      inputValidator: (value) => {
        if (!value) return '¡El mensaje no puede estar vacío!';
      }
    });

    if (formValues) {
      const dataToSend = { message: formValues };

      try {
        const response = await fetch(`${API_BASE}/record/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend),
        });

        const data = await response.json();

        if (response.ok) {
          // OPCIONAL: Avisar a los demás por Socket.io
          socket.emit("send_message", dataToSend);

          Swal.fire('¡Logrado!', 'Mensaje subido a la ruta correctamente', 'success');
        } else {
          throw new Error(data.error || 'Error en el servidor');
        }
      } catch (error) {
        console.error("Error al enviar:", error);
        Swal.fire('Error', 'No se pudo subir el mensaje', 'error');
      }
    }
  }

  const handleFetchWeather = async () => {
    if (!canControl || weatherLoading) return;

    setWeatherLoading(true);
    try {
      const response = await fetch(`${API_BASE}/record/weather/fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude: longitud })
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const responseBody = (await response.text()).slice(0, 300);
        throw new Error(`Weather endpoint returned non-JSON (status ${response.status}). Body starts with: ${responseBody}`);
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.msg || 'Could not fetch weather');
      }

      setWeatherData(data.data ?? null);
      Swal.fire('Updated', 'Current weather fetched and saved.', 'success');
    } catch (error) {
      console.error('Error fetching weather:', error);
      Swal.fire('Error', error.message || 'Could not fetch weather data', 'error');
    } finally {
      setWeatherLoading(false);
    }
  };

  // Count the time
  useEffect(() => {
    let interval = null;
    if (timerActive && raceStartTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const elapsedSeconds = Math.max(0, Math.floor((now - raceStartTime) / 1000));
        const elapsedCurrentLap = Math.max(0, Math.floor((now - (lastLapStartTime ?? raceStartTime)) / 1000));

        if (elapsedSeconds >= RACE_DURATION_SECONDS) {
          if (!autoResetTriggeredRef.current) {
            autoResetTriggeredRef.current = true;
            performReset().catch((err) => {
              console.error("Error auto-resetting race:", err);
              autoResetTriggeredRef.current = false;
            });
          }
          return;
        }

        setRunningTime(elapsedSeconds);
        setRemainingTime(Math.max(0, RACE_DURATION_SECONDS - elapsedSeconds));
        setCurrentLapTime(elapsedCurrentLap);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, raceStartTime, lastLapStartTime, RACE_DURATION_SECONDS, performReset]);

  const whPerKm = totalKm > 0 ? (totalWh / totalKm) : 0;
  const kmPerKWh = totalWh > 0 ? (totalKm / (totalWh / 1000)) : 0;

  return (
    <div className="relative text-[clamp(0.75rem,1vw,1rem)]">
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
            className="
              min-h-screen
              flex flex-col
              bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_28%),radial-gradient(circle_at_right,rgba(251,146,60,0.08),transparent_30%),#08111f] text-white z-0 relative
              p-[clamp(0.4rem,1vw,1rem)]
              gap-[clamp(0.4rem,1vw,0.75rem)]
            "
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 3.2, ease: "easeOut" }}
          >
            <div className="flex flex-col gap-[clamp(0.4rem,1vw,0.75rem)] md:flex-row">
              {/* Battery: arriba en móvil (horizontal), izquierda en md (vertical si quieres) */}
              <div
                className="
                  flex-none
                  w-full h-[7vh]
                  md:w-16 md:h-auto
                  rounded-xl p-1
                "
              >
                {/* móvil: horizontal */}
                <div className="w-full h-full md:hidden">
                  <Battery percentage={100 * voltage_battery / 51} orientation="horizontal" />
                </div>

                {/* md+: vertical */}
                <div className="hidden md:block w-full h-full">
                  <Battery percentage={100 * voltage_battery / 51} orientation="vertical" />
                </div>
              </div>

              {/* Contenido principal: en móvil se apila, en md se pone en fila */}
              <div className="flex-1 flex flex-col md:flex-row gap-[clamp(0.4rem,1vw,0.75rem)] min-w-0">
                {/* Panel principal */}
                <div className="w-full max-w-full flex-[1.4] rounded-2xl border border-slate-700/60 bg-[#0D1526]/95 shadow-[0_22px_50px_rgba(2,6,23,0.45)] flex flex-col min-w-0 overflow-hidden">
                  <div className="flex-1 m-2 flex flex-col lg:flex-row min-w-0">
                    <div className="flex-col content-center">
                      <div className="flex-[3] rounded-xl m-1 flex justify-center items-center min-w-0">
                        <Speedometer
                          speed={currentSpeedKph}
                        />
                      </div>
                      <div className="flex justify-center">
                        <Throttle
                          percentage={throttle}
                        />
                      </div>
                    </div>

                    <div className="flex-[2] rounded-xl m-1 min-w-0">
                      <PerformanceTable
                        current={current}
                        voltage={voltage_battery}
                        rpms={rpm_motor}
                        totalConsumption={totalWh.toFixed(2)}
                        efficiency={kmPerKWh.toFixed(2)}
                        distance={totalKm.toFixed(3)}
                        ampHours={totalAh.toFixed(2)}
                        whPerKm={whPerKm.toFixed(2)}
                        air_density={airDensity.toFixed(2)}
                      />
                    </div>
                  </div>

                  <div className="m-2 rounded-xl flex flex-col lg:flex-row min-w-0">
                    <div className="flex-[2] rounded-xl m-1 min-w-0">
                      <VoltageCurrentChart dataHistory={dataHistory} />
                    </div>
                    <div className="flex-[1] rounded-xl m-1 min-w-0">
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

                {/* Panel mapa + stats */}
                <div className="w-full max-w-full flex-[1.8] rounded-2xl border border-slate-700/60 bg-[#0D1526]/95 shadow-[0_22px_50px_rgba(2,6,23,0.45)] flex flex-col min-w-0 overflow-hidden">
                  <div className="h-[400px] md:flex-[1.25] md:h-auto rounded-xl m-2 min-h-[260px] overflow-hidden border border-slate-700/60 bg-[#0F1A2E]">
                    <MapGPS latitude={latitude} longitud={longitud} />
                  </div>
                  <div className="rounded-xl m-2 border border-slate-700/60 bg-[#0F1A2E] px-3 py-2.5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-slate-200 sm:grid-cols-3 lg:flex-1">
                        <div>Temp: {weatherData?.current ? formatValueWithUnit(weatherData.current.temperature_2m, ' C') : '--'}</div>
                        <div>Humidity: {weatherData?.current ? formatValueWithUnit(weatherData.current.relative_humidity_2m, '%') : '--'}</div>
                        <div>Precip. Prob. (next 2h): {weatherData?.current ? formatValueWithUnit(weatherData.current.precipitation_probability, '%') : '--'}</div>
                        <div>Weather: {weatherData?.current?.weather_code_description ?? '--'}</div>
                        <div>Visibility: {weatherData?.current ? formatValueWithUnit(weatherData.current.visibility, ' m') : '--'}</div>
                        <div>TZ: {weatherData?.metadata?.timezoneAbbreviation ?? '--'}</div>
                      </div>
                      <button
                        onClick={handleFetchWeather}
                        disabled={!canControl || weatherLoading}
                        className={`rounded-lg border border-sky-400/20 bg-[#162133] px-3 py-2 text-xs font-semibold text-sky-200 lg:self-end ${!canControl || weatherLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        {weatherLoading ? 'Updating...' : 'Get Current Weather'}
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 rounded-xl m-2 min-w-0">
                    <RaceStats
                      canControl={canControl}
                      onStart={handleStart}
                      onPauseToggle={handlePauseToggle}
                      isPaused={isPaused}
                      onReset={handleReset}
                      onSave={handleSave}
                      onNewLap={handleNewLap}
                      onDeleteLastLap={handleDeleteLastLap}
                      maxLaps={maxLaps}
                      onMaxLapsChange={handleMaxLapsChange}
                      maxLapOptions={MAX_LAP_OPTIONS}
                      canCreateNewLap={lapsNumber < maxLaps}
                      canDeleteLastLap={laps.length > 0}
                      onNewConfig={handleSettingsUpdate}
                      onNewMssage={handleNewMessage}
                      onToggleIngestion={handleToggleIngestion}
                      ingestionEnabled={ingestionEnabled}
                      ingestionLoading={ingestionLoading}
                      running_time={formatDuration(runningTime)}
                      currentLapTime={formatDuration(currentLapTime)}
                      laps={laps}
                      average_time={formatDuration(averageLapTime)}
                      current_lap={lapsNumber}
                      remaining_time={formatDuration(remaining_time)}
                      altitude={altitude}
                      num_sats={numberOfSatellites}
                      airSpeed={Number(airSpeed) || 0}
                      ambient_temp={ambient_temp}
                    />
                  </div>
                </div>
              </div>
            </div>

            <RaceStrategyPanel
              strategy={strategyRecommendation}
              strategyConfig={strategyConfig}
              onStrategyConfigChange={handleStrategyConfigChange}
              canControl={canControl}
            />
          </motion.div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
