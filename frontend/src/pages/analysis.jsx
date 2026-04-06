import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import NavigationBar from "../components/NavigationBar";

const BACKEND_ORIGIN = (
  process.env.REACT_APP_BACKEND_ORIGIN || "https://elyos-telemetry-exylp.ondigitalocean.app"
).replace(/\/+$/, "");
const BACKEND_BASE_PATH = (
  process.env.REACT_APP_BACKEND_BASE_PATH || "/elyos-telemetry-backend"
).replace(/\/+$/, "");
const API_BASE = `${BACKEND_ORIGIN}${BACKEND_BASE_PATH}/api`;

const cardClassName =
  "rounded-xl border border-slate-700/60 bg-[#0D1526]/95 p-4 text-white shadow-[0_18px_40px_rgba(2,6,23,0.45)]";

const metricCardClassName =
  "rounded-xl border border-slate-700/60 bg-[#0B1324]/95 p-4 text-white shadow-[0_18px_40px_rgba(2,6,23,0.4)]";

const safeNumber = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const formatNumber = (value, maximumFractionDigits = 2) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "--";
  }

  return numericValue.toLocaleString(undefined, {
    maximumFractionDigits
  });
};

const formatDuration = (seconds) => {
  const safeSeconds = Math.max(0, Math.floor(safeNumber(seconds)));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
};

const formatDate = (value) => {
  if (!value) return "--";

  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit"
    }).format(new Date(value));
  } catch (_error) {
    return value;
  }
};

const getSpeedKmh = (lecture) => {
  const velocityX = safeNumber(lecture?.velocity_x);
  const velocityY = safeNumber(lecture?.velocity_y);
  return Math.sqrt(velocityX ** 2 + velocityY ** 2) * 3.6;
};

const sortLectures = (lectures = []) =>
  [...lectures].sort((leftLecture, rightLecture) => {
    const leftRunningTime = leftLecture?.running_time;
    const rightRunningTime = rightLecture?.running_time;

    if (Number.isFinite(Number(leftRunningTime)) && Number.isFinite(Number(rightRunningTime))) {
      return Number(leftRunningTime) - Number(rightRunningTime);
    }

    const leftTimestamp = leftLecture?.timestamp ? new Date(leftLecture.timestamp).getTime() : 0;
    const rightTimestamp = rightLecture?.timestamp ? new Date(rightLecture.timestamp).getTime() : 0;
    return leftTimestamp - rightTimestamp;
  });

const getLectureTimeSeconds = (lecture, fallbackTime) => {
  const runningTime = Number(lecture?.running_time);
  if (Number.isFinite(runningTime)) {
    return Math.max(0, runningTime);
  }

  return Math.max(0, fallbackTime);
};

const average = (values = []) => {
  const numericValues = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  if (!numericValues.length) {
    return 0;
  }

  return numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;
};

const percentile = (values = [], percentileValue = 0.9) => {
  const numericValues = values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
    .sort((leftValue, rightValue) => leftValue - rightValue);

  if (!numericValues.length) {
    return 0;
  }

  const index = Math.min(
    numericValues.length - 1,
    Math.max(0, Math.floor(percentileValue * (numericValues.length - 1)))
  );

  return numericValues[index];
};

const buildSessionMetrics = (lectures = [], session = null) => {
  const orderedLectures = sortLectures(lectures);
  if (!orderedLectures.length) {
    return null;
  }

  let cumulativeWh = 0;
  let cumulativeKm = 0;
  let previousTime = null;
  const samples = orderedLectures.map((lecture, index) => {
    const timeSeconds = getLectureTimeSeconds(lecture, index);
    const speedKmh = getSpeedKmh(lecture);
    const current = safeNumber(lecture.current);
    const voltage = safeNumber(lecture.voltage_battery);
    const throttle = safeNumber(lecture.throttle ?? lecture.accelPct);
    const powerW = voltage * current;

    const rawDt = previousTime === null ? 1 : timeSeconds - previousTime;
    const dtSeconds = Math.max(1, Number.isFinite(rawDt) ? rawDt : 1);
    previousTime = timeSeconds;

    cumulativeWh += (powerW * dtSeconds) / 3600;
    cumulativeKm += (speedKmh * dtSeconds) / 3600;

    return {
      id: lecture.id ?? index,
      lapNumber: Math.max(1, Math.floor(safeNumber(lecture.lap_number, 1))),
      timeSeconds,
      speedKmh,
      current,
      voltage,
      powerW,
      throttle,
      accelerationX: safeNumber(lecture.acceleration_x),
      accelerationY: safeNumber(lecture.acceleration_y),
      airSpeed: safeNumber(lecture.air_speed),
      ambientTemp: safeNumber(lecture.ambient_temp),
      altitude: safeNumber(lecture.altitude_m),
      numSats: safeNumber(lecture.num_sats),
      steering: safeNumber(lecture.steering_direction),
      cumulativeWh,
      cumulativeKm
    };
  });

  const firstSample = samples[0];
  const lastSample = samples[samples.length - 1];
  const durationSeconds = Math.max(1, lastSample.timeSeconds - firstSample.timeSeconds + 1);
  const totalWh = lastSample.cumulativeWh;
  const totalKm = lastSample.cumulativeKm;
  const whPerKm = totalKm > 0 ? totalWh / totalKm : 0;
  const kmPerKWh = totalWh > 0 ? totalKm / (totalWh / 1000) : 0;
  const avgSpeedKmh = average(samples.map((sample) => sample.speedKmh));
  const avgCurrent = average(samples.map((sample) => sample.current));
  const avgThrottle = average(samples.map((sample) => sample.throttle));
  const avgAirSpeed = average(samples.map((sample) => sample.airSpeed));
  const avgAmbientTemp = average(samples.map((sample) => sample.ambientTemp));
  const avgAltitude = average(samples.map((sample) => sample.altitude));
  const peakCurrent = Math.max(...samples.map((sample) => sample.current), 0);
  const peakPowerW = Math.max(...samples.map((sample) => sample.powerW), 0);
  const peakSpeedKmh = Math.max(...samples.map((sample) => sample.speedKmh), 0);
  const gpsStableRatio =
    samples.filter((sample) => sample.numSats >= 8).length / Math.max(samples.length, 1);
  const coastingRatio =
    samples.filter((sample) => sample.throttle <= 5 && sample.speedKmh >= avgSpeedKmh * 0.7).length /
    Math.max(samples.length, 1);
  const currentSpikeThreshold = percentile(samples.map((sample) => sample.current), 0.9);
  const aggressiveLaunchCount = samples.filter(
    (sample) =>
      sample.current >= currentSpikeThreshold &&
      sample.throttle >= 65 &&
      sample.accelerationX > 0.4
  ).length;
  const steeringLoadCount = samples.filter(
    (sample) => Math.abs(sample.accelerationY) > 0.75 || Math.abs(sample.steering) > 12
  ).length;

  const lapBuckets = new Map();
  samples.forEach((sample) => {
    if (!lapBuckets.has(sample.lapNumber)) {
      lapBuckets.set(sample.lapNumber, []);
    }
    lapBuckets.get(sample.lapNumber).push(sample);
  });

  const laps = [...lapBuckets.entries()].map(([lapNumber, lapSamples]) => {
    const lapFirstSample = lapSamples[0];
    const lapLastSample = lapSamples[lapSamples.length - 1];
    const lapDurationSeconds = Math.max(1, lapLastSample.timeSeconds - lapFirstSample.timeSeconds + 1);
    const lapWh = lapLastSample.cumulativeWh - (lapFirstSample.cumulativeWh - (lapFirstSample.powerW / 3600));
    const lapKm = lapLastSample.cumulativeKm - Math.max(0, lapFirstSample.cumulativeKm - (lapFirstSample.speedKmh / 3600));
    const lapWhPerKm = lapKm > 0 ? lapWh / lapKm : 0;

    return {
      lapNumber,
      durationSeconds: lapDurationSeconds,
      wh: Math.max(0, lapWh),
      km: Math.max(0, lapKm),
      whPerKm: Math.max(0, lapWhPerKm),
      avgSpeedKmh: average(lapSamples.map((sample) => sample.speedKmh)),
      avgCurrent: average(lapSamples.map((sample) => sample.current)),
      avgThrottle: average(lapSamples.map((sample) => sample.throttle)),
      peakCurrent: Math.max(...lapSamples.map((sample) => sample.current), 0),
      coastRatio:
        lapSamples.filter(
          (sample) => sample.throttle <= 5 && sample.speedKmh >= avgSpeedKmh * 0.7
        ).length / Math.max(lapSamples.length, 1)
    };
  });

  const sectorCount = Math.min(4, Math.max(1, Math.ceil(totalKm / 0.25)));
  const sectorBuckets = Array.from({ length: sectorCount }, (_, index) => ({
    sector: `S${index + 1}`,
    wh: 0,
    km: 0,
    avgSpeedKmhSamples: []
  }));

  samples.forEach((sample, index) => {
    const previousSample = index === 0 ? null : samples[index - 1];
    const distanceDeltaKm = previousSample
      ? Math.max(0, sample.cumulativeKm - previousSample.cumulativeKm)
      : sample.cumulativeKm;
    const energyDeltaWh = previousSample
      ? Math.max(0, sample.cumulativeWh - previousSample.cumulativeWh)
      : sample.cumulativeWh;
    const progress = totalKm > 0 ? sample.cumulativeKm / totalKm : 0;
    const sectorIndex = Math.min(
      sectorBuckets.length - 1,
      Math.max(0, Math.floor(progress * sectorBuckets.length))
    );
    sectorBuckets[sectorIndex].wh += energyDeltaWh;
    sectorBuckets[sectorIndex].km += distanceDeltaKm;
    sectorBuckets[sectorIndex].avgSpeedKmhSamples.push(sample.speedKmh);
  });

  const sectors = sectorBuckets.map((sector) => ({
    sector: sector.sector,
    whPerKm: sector.km > 0 ? sector.wh / sector.km : 0,
    avgSpeedKmh: average(sector.avgSpeedKmhSamples),
    wh: sector.wh
  }));

  const bestEfficientLap =
    laps.length > 0
      ? [...laps].sort((leftLap, rightLap) => leftLap.whPerKm - rightLap.whPerKm)[0]
      : null;
  const mostExpensiveLap =
    laps.length > 0
      ? [...laps].sort((leftLap, rightLap) => rightLap.whPerKm - leftLap.whPerKm)[0]
      : null;
  const lapWhPerKmSpread =
    laps.length > 1
      ? Math.max(...laps.map((lap) => lap.whPerKm)) - Math.min(...laps.map((lap) => lap.whPerKm))
      : 0;

  return {
    session,
    lectures: orderedLectures,
    samples,
    laps,
    sectors,
    durationSeconds,
    totalWh,
    totalKm,
    whPerKm,
    kmPerKWh,
    avgSpeedKmh,
    avgCurrent,
    avgThrottle,
    avgAirSpeed,
    avgAmbientTemp,
    avgAltitude,
    peakCurrent,
    peakPowerW,
    peakSpeedKmh,
    gpsStableRatio,
    coastingRatio,
    aggressiveLaunchCount,
    steeringLoadCount,
    bestEfficientLap,
    mostExpensiveLap,
    lapWhPerKmSpread
  };
};

const buildInsights = (metrics, benchmarkMetrics) => {
  if (!metrics) {
    return [];
  }

  const insights = [];

  if (metrics.coastingRatio < 0.1) {
    insights.push({
      title: "Más lift-and-coast",
      tone: "warning",
      description:
        "Hay poco tiempo de rodado con acelerador cerrado. Si el piloto empieza a soltar antes en las zonas rápidas, debería bajar el Wh/km sin castigar tanto el tiempo."
    });
  } else {
    insights.push({
      title: "Buen tiempo de rodado",
      tone: "success",
      description:
        "El porcentaje de coasting ya es sano. Conviene mantener esa disciplina y concentrarse en no meter picos de corriente innecesarios en las salidas."
    });
  }

  if (metrics.aggressiveLaunchCount >= 4) {
    insights.push({
      title: "Picos de salida",
      tone: "warning",
      description:
        "Se detectaron varios eventos de alta corriente con mucho throttle y aceleración positiva. Eso sugiere salidas de curva demasiado agresivas."
    });
  }

  if (metrics.lapWhPerKmSpread > 6) {
    insights.push({
      title: "La consistencia está costando energía",
      tone: "warning",
      description:
        "La diferencia de consumo específico entre vueltas es alta. La prioridad no debería ser ir más rápido, sino repetir la vuelta eficiente con menos variación."
    });
  } else {
    insights.push({
      title: "Stint consistente",
      tone: "success",
      description:
        "Las vueltas están relativamente agrupadas en consumo. Eso facilita trabajar la estrategia con ajustes pequeños y medibles."
    });
  }

  const mostExpensiveSector =
    metrics.sectors.length > 0
      ? [...metrics.sectors].sort((leftSector, rightSector) => rightSector.whPerKm - leftSector.whPerKm)[0]
      : null;

  if (mostExpensiveSector) {
    insights.push({
      title: `Sector crítico: ${mostExpensiveSector.sector}`,
      tone: "info",
      description:
        `Ese sector trae el peor Wh/km del stint. Ahí es donde más conviene revisar velocidad pico, punto de lift y suavidad a la salida.`
    });
  }

  if (metrics.gpsStableRatio < 0.85) {
    insights.push({
      title: "GPS poco estable",
      tone: "warning",
      description:
        "Hubo varias muestras con baja calidad satelital. Toma con cuidado la lectura espacial de sectores y usa más peso en energía, corriente y tiempo por vuelta."
    });
  }

  if (benchmarkMetrics && benchmarkMetrics.session?.id !== metrics.session?.id) {
    const whGap = metrics.whPerKm - benchmarkMetrics.whPerKm;
    if (whGap > 0.75) {
      insights.push({
        title: "Hay margen real contra el benchmark",
        tone: "warning",
        description:
          `Esta sesión está ${formatNumber(whGap, 2)} Wh/km arriba del mejor stint comparable. Vale la pena buscar el patrón de velocidad y throttle de esa referencia.`
      });
    } else {
      insights.push({
        title: "Cerca del benchmark",
        tone: "success",
        description:
          "El stint seleccionado ya está muy cerca de la referencia más eficiente. La ganancia ahora viene más de consistencia y ejecución que de cambios grandes."
      });
    }
  }

  return insights.slice(0, 6);
};

const getInsightToneClasses = (tone) => {
  if (tone === "success") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-100";
  }

  if (tone === "warning") {
    return "border-amber-400/20 bg-amber-400/10 text-amber-100";
  }

  return "border-cyan-400/20 bg-cyan-400/10 text-cyan-100";
};

const SessionOption = ({ session, isSelected, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect(session.id)}
    className={`w-full rounded-xl border px-4 py-3 text-left transition ${
      isSelected
        ? "border-cyan-400/30 bg-cyan-400/10 shadow-[0_12px_24px_rgba(34,211,238,0.12)]"
        : "border-slate-700/70 bg-[#08101f]/90 hover:border-slate-500/80 hover:bg-[#101a2d]"
    }`}
  >
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-white">Session #{session.id}</p>
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
          {session.session_type || "real"} {session.session_group_id ? `• ${session.session_group_id}` : ""}
        </p>
      </div>
      <div className="rounded-full border border-slate-700/80 bg-slate-950/70 px-2 py-1 text-xs text-slate-300">
        Run {session.run_number ?? "--"}
      </div>
    </div>
    <p className="mt-2 text-sm text-slate-300">{session.description || "Sin descripción"}</p>
    <p className="mt-2 text-xs text-slate-500">{formatDate(session.date)}</p>
  </button>
);

const MetricCard = ({ label, value, hint, accent = "cyan" }) => {
  const accentClassName =
    accent === "amber"
      ? "text-amber-100"
      : accent === "emerald"
        ? "text-emerald-100"
        : accent === "rose"
          ? "text-rose-100"
          : "text-cyan-100";

  return (
    <div className={metricCardClassName}>
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-slate-400">{label}</p>
      <p className={`mt-3 text-3xl font-black ${accentClassName}`}>{value}</p>
      <p className="mt-2 text-sm text-slate-400">{hint}</p>
    </div>
  );
};

const EmptyState = ({ title, description }) => (
  <div className={`${cardClassName} flex min-h-[220px] flex-col items-center justify-center text-center`}>
    <p className="text-lg font-semibold text-white">{title}</p>
    <p className="mt-2 max-w-xl text-sm text-slate-400">{description}</p>
  </div>
);

const normalizeSessionId = (value) => {
  const numericValue = Number(value);
  return Number.isInteger(numericValue) && numericValue > 0 ? numericValue : null;
};

export default function AnalysisPage() {
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [selectedLectures, setSelectedLectures] = useState([]);
  const [comparisonSessions, setComparisonSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fetchSessions = useCallback(async () => {
    setLoadingSessions(true);
    setErrorMessage("");

    try {
      const response = await fetch(`${API_BASE}/sessions`);
      if (!response.ok) {
        throw new Error("No se pudieron cargar las sesiones");
      }

      const sessionsData = await response.json();
      const orderedSessions = [...sessionsData].sort((leftSession, rightSession) => rightSession.id - leftSession.id);
      setSessions(orderedSessions);
      setSelectedSessionId((currentSelectedSessionId) => {
        const normalizedCurrentSelection = normalizeSessionId(currentSelectedSessionId);
        const stillExists = orderedSessions.some((session) => session.id === normalizedCurrentSelection);

        if (stillExists) {
          return normalizedCurrentSelection;
        }

        return orderedSessions[0]?.id ?? null;
      });
    } catch (error) {
      setErrorMessage(error.message || "Error cargando sesiones");
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    if (!selectedSessionId) {
      setSelectedLectures([]);
      setComparisonSessions([]);
      return;
    }

    const selectedSession = sessions.find((session) => session.id === selectedSessionId);
    if (!selectedSession) {
      return;
    }

    let ignore = false;

    const fetchAnalysisData = async () => {
      setLoadingAnalysis(true);
      setErrorMessage("");

      try {
        const selectedLecturesResponse = await fetch(`${API_BASE}/lectures/session/${selectedSessionId}`);
        if (!selectedLecturesResponse.ok) {
          throw new Error("No se pudieron cargar las lecturas de la sesión seleccionada");
        }

        const selectedLecturesData = await selectedLecturesResponse.json();
        if (ignore) return;
        setSelectedLectures(selectedLecturesData);

        const comparableSessions = sessions
          .filter((session) => session.id !== selectedSessionId)
          .filter((session) =>
            selectedSession.session_group_id
              ? session.session_group_id === selectedSession.session_group_id
              : true
          )
          .slice(0, 4);

        const comparisonData = await Promise.all(
          comparableSessions.map(async (session) => {
            const response = await fetch(`${API_BASE}/lectures/session/${session.id}`);
            if (!response.ok) {
              return { session, lectures: [] };
            }

            const lectures = await response.json();
            return { session, lectures };
          })
        );

        if (!ignore) {
          setComparisonSessions(comparisonData);
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(error.message || "No se pudo construir el análisis");
          setSelectedLectures([]);
          setComparisonSessions([]);
        }
      } finally {
        if (!ignore) {
          setLoadingAnalysis(false);
        }
      }
    };

    fetchAnalysisData();

    return () => {
      ignore = true;
    };
  }, [selectedSessionId, sessions]);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) ?? null,
    [sessions, selectedSessionId]
  );

  const selectedMetrics = useMemo(
    () => buildSessionMetrics(selectedLectures, selectedSession),
    [selectedLectures, selectedSession]
  );

  const comparisonMetrics = useMemo(
    () =>
      comparisonSessions
        .map(({ session, lectures }) => buildSessionMetrics(lectures, session))
        .filter(Boolean)
        .sort((leftMetrics, rightMetrics) => leftMetrics.whPerKm - rightMetrics.whPerKm),
    [comparisonSessions]
  );

  const benchmarkMetrics = useMemo(() => {
    const metricsPool = [selectedMetrics, ...comparisonMetrics].filter(Boolean);
    if (!metricsPool.length) {
      return null;
    }

    return [...metricsPool].sort((leftMetrics, rightMetrics) => leftMetrics.whPerKm - rightMetrics.whPerKm)[0];
  }, [comparisonMetrics, selectedMetrics]);

  const insights = useMemo(
    () => buildInsights(selectedMetrics, benchmarkMetrics),
    [benchmarkMetrics, selectedMetrics]
  );

  const lapChartData = useMemo(
    () =>
      selectedMetrics?.laps.map((lap) => ({
        name: `L${lap.lapNumber}`,
        whPerKm: Number(lap.whPerKm.toFixed(2)),
        durationSeconds: Number(lap.durationSeconds.toFixed(0)),
        avgSpeedKmh: Number(lap.avgSpeedKmh.toFixed(2))
      })) ?? [],
    [selectedMetrics]
  );

  const comparisonChartData = useMemo(() => {
    const metricsPool = [selectedMetrics, ...comparisonMetrics].filter(Boolean);
    return metricsPool.map((metrics) => ({
      sessionLabel: `#${metrics.session?.id ?? "--"}`,
      sessionId: metrics.session?.id,
      whPerKm: Number(metrics.whPerKm.toFixed(2)),
      kmPerKWh: Number(metrics.kmPerKWh.toFixed(2)),
      durationSeconds: Number(metrics.durationSeconds.toFixed(0))
    }));
  }, [comparisonMetrics, selectedMetrics]);

  return (
    <div className="relative min-h-screen bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_28%),radial-gradient(circle_at_right,rgba(251,146,60,0.08),transparent_30%),#08111f] text-[clamp(0.75rem,1vw,1rem)] text-white">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
        <NavigationBar />
      </motion.div>

      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.6, ease: "easeOut" }}
        className="mx-auto max-w-[1600px] px-4 pb-8 pt-4"
      >
        <section className={`${cardClassName} relative isolate overflow-hidden`}>
          <div className="pointer-events-none absolute inset-0" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.32em] text-cyan-300">
                Race Strategy
              </p>
              <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                Analysis Room
              </h1>
              <p className="mt-3 max-w-3xl text-sm text-slate-300 sm:text-base">
                Esta vista convierte sesiones guardadas en decisiones operativas: presupuesto energético por vuelta,
                consistencia del stint, sectores caros y recomendaciones concretas para bajar consumo sin perder el ritmo.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.26em] text-cyan-200">Sessions</p>
                <p className="mt-2 text-2xl font-black">{sessions.length}</p>
              </div>
              <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.26em] text-amber-200">Selected</p>
                <p className="mt-2 text-2xl font-black">#{selectedSession?.id ?? "--"}</p>
              </div>
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.26em] text-emerald-200">Benchmark</p>
                <p className="mt-2 text-2xl font-black">#{benchmarkMetrics?.session?.id ?? "--"}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <section className={cardClassName}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-white">Session Selector</h2>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Historical runs</p>
                </div>
                <button
                  type="button"
                  onClick={fetchSessions}
                  className="rounded-full border border-slate-600 bg-[#162133] px-3 py-1 text-xs font-semibold text-slate-200"
                >
                  Refresh
                </button>
              </div>

              <div className="mt-4">
                <label htmlFor="analysis-session-select" className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Active session
                </label>
                <select
                  id="analysis-session-select"
                  value={selectedSessionId ?? ""}
                  onChange={(event) => setSelectedSessionId(normalizeSessionId(event.target.value))}
                  disabled={loadingSessions || sessions.length === 0}
                  className="w-full rounded-xl border border-slate-700/70 bg-[#08101f]/90 px-3 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
                >
                  {sessions.length === 0 ? (
                    <option value="">No sessions available</option>
                  ) : (
                    sessions.map((session) => (
                      <option key={session.id} value={session.id}>
                        Session #{session.id} | {session.session_type || "real"} | Run {session.run_number ?? "--"}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="mt-4 space-y-3">
                {loadingSessions ? (
                  <p className="text-sm text-slate-400">Cargando sesiones...</p>
                ) : sessions.length === 0 ? (
                  <p className="text-sm text-slate-400">Todavía no hay sesiones guardadas para analizar.</p>
                ) : (
                  sessions.slice(0, 10).map((session) => (
                    <SessionOption
                      key={session.id}
                      session={session}
                      isSelected={session.id === selectedSessionId}
                      onSelect={setSelectedSessionId}
                    />
                  ))
                )}
              </div>
            </section>

            <section className={cardClassName}>
              <h2 className="text-xl font-semibold text-white">Strategy Checklist</h2>
              <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-400">What to look at during the event</p>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="rounded-xl border border-slate-700/70 bg-[#08101f]/80 p-3">
                  <p className="font-semibold text-white">1. Presupuesto por vuelta</p>
                  <p className="mt-1">Compara `Wh/km` y `Wh por vuelta` contra tu stint benchmark antes de pedir más velocidad.</p>
                </div>
                <div className="rounded-xl border border-slate-700/70 bg-[#08101f]/80 p-3">
                  <p className="font-semibold text-white">2. Salidas de curva</p>
                  <p className="mt-1">Si suben mucho `current` y `throttle`, ahí suele esconderse energía fácil de recuperar.</p>
                </div>
                <div className="rounded-xl border border-slate-700/70 bg-[#08101f]/80 p-3">
                  <p className="font-semibold text-white">3. Consistencia</p>
                  <p className="mt-1">Una vuelta rápida aislada sirve menos que un patrón repetible y eficiente durante todo el stint.</p>
                </div>
              </div>
            </section>

            {errorMessage ? (
              <section className={`${cardClassName} border-rose-400/20 bg-rose-400/10`}>
                <h2 className="text-lg font-semibold text-rose-100">Error</h2>
                <p className="mt-2 text-sm text-rose-100/85">{errorMessage}</p>
              </section>
            ) : null}
          </aside>

          <div className="space-y-6 min-w-0">
            {loadingAnalysis ? (
              <EmptyState
                title="Construyendo análisis"
                description="Estoy cargando lecturas históricas, calculando métricas por vuelta y armando comparativas estratégicas."
              />
            ) : !selectedMetrics ? (
              <EmptyState
                title="Selecciona una sesión con telemetría"
                description="La página de análisis necesita lecturas guardadas para calcular consumo, consistencia y recomendaciones operativas."
              />
            ) : (
              <>
                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <MetricCard
                    label="Efficiency"
                    value={`${formatNumber(selectedMetrics.kmPerKWh, 2)} km/kWh`}
                    hint={`${formatNumber(selectedMetrics.whPerKm, 2)} Wh/km en el stint`}
                    accent="emerald"
                  />
                  <MetricCard
                    label="Energy Used"
                    value={`${formatNumber(selectedMetrics.totalWh, 1)} Wh`}
                    hint={`${formatNumber(selectedMetrics.totalKm, 2)} km recorridos`}
                    accent="cyan"
                  />
                  <MetricCard
                    label="Peak Load"
                    value={`${formatNumber(selectedMetrics.peakCurrent, 1)} A`}
                    hint={`${formatNumber(selectedMetrics.peakPowerW, 0)} W de potencia pico`}
                    accent="amber"
                  />
                  <MetricCard
                    label="Coasting"
                    value={`${formatNumber(selectedMetrics.coastingRatio * 100, 0)}%`}
                    hint="Tiempo de rodado con throttle cerrado a velocidad útil"
                    accent="rose"
                  />
                </section>

                <section className="grid gap-6 2xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
                  <div className={cardClassName}>
                    <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                      <div>
                        <h2 className="text-xl font-semibold text-white">Energy Trace</h2>
                        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                          Speed, current and cumulative energy over time
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                        <div className="rounded-full border border-cyan-400/20 bg-slate-950/60 px-3 py-1">Avg speed: {formatNumber(selectedMetrics.avgSpeedKmh, 1)} km/h</div>
                        <div className="rounded-full border border-orange-400/20 bg-slate-950/60 px-3 py-1">Avg current: {formatNumber(selectedMetrics.avgCurrent, 1)} A</div>
                        <div className="rounded-full border border-emerald-400/20 bg-slate-950/60 px-3 py-1">Avg throttle: {formatNumber(selectedMetrics.avgThrottle, 0)}%</div>
                      </div>
                    </div>
                    <div className="h-[360px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={selectedMetrics.samples} margin={{ top: 10, right: 14, left: -10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="analysisEnergyFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#34d399" stopOpacity={0.32} />
                              <stop offset="100%" stopColor="#34d399" stopOpacity={0.04} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid vertical={false} stroke="rgba(148,163,184,0.14)" strokeDasharray="4 6" />
                          <XAxis
                            dataKey="timeSeconds"
                            tickLine={false}
                            axisLine={false}
                            stroke="#94a3b8"
                            tick={{ fill: "#94a3b8", fontSize: 12 }}
                            tickFormatter={(value) => `${value}s`}
                          />
                          <YAxis
                            yAxisId="speed"
                            tickLine={false}
                            axisLine={false}
                            stroke="#94a3b8"
                            tick={{ fill: "#94a3b8", fontSize: 12 }}
                            width={46}
                          />
                          <YAxis yAxisId="current" orientation="right" hide />
                          <YAxis yAxisId="energy" orientation="right" hide />
                          <Tooltip
                            contentStyle={{
                              background: "rgba(2, 6, 23, 0.92)",
                              border: "1px solid rgba(148,163,184,0.2)",
                              borderRadius: "16px",
                              color: "#e2e8f0"
                            }}
                            formatter={(value, name) => {
                              if (name === "speedKmh") return [`${formatNumber(value, 1)} km/h`, "Speed"];
                              if (name === "current") return [`${formatNumber(value, 1)} A`, "Current"];
                              if (name === "cumulativeWh") return [`${formatNumber(value, 1)} Wh`, "Energy"];
                              return [formatNumber(value, 2), name];
                            }}
                            labelFormatter={(value) => `T + ${value}s`}
                          />
                          <Legend wrapperStyle={{ color: "#cbd5e1", fontSize: 12 }} />
                          <Area
                            yAxisId="energy"
                            type="monotone"
                            dataKey="cumulativeWh"
                            name="Energy"
                            fill="url(#analysisEnergyFill)"
                            stroke="#34d399"
                            strokeWidth={2}
                          />
                          <Line
                            yAxisId="speed"
                            type="monotone"
                            dataKey="speedKmh"
                            name="Speed"
                            stroke="#67e8f9"
                            strokeWidth={3}
                            dot={false}
                          />
                          <Line
                            yAxisId="current"
                            type="monotone"
                            dataKey="current"
                            name="Current"
                            stroke="#fb923c"
                            strokeWidth={2.5}
                            dot={false}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className={`${cardClassName} h-full`}>
                    <div>
                      <h2 className="text-xl font-semibold text-white">Strategy Insights</h2>
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Automatic coaching</p>
                    </div>

                    <div className="mt-4 space-y-3">
                      {insights.map((insight) => (
                        <div
                          key={insight.title}
                          className={`rounded-xl border p-3 ${getInsightToneClasses(insight.tone)}`}
                        >
                          <p className="font-semibold">{insight.title}</p>
                          <p className="mt-1 text-sm opacity-90">{insight.description}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-slate-700/70 bg-[#08101f]/80 p-3">
                        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-slate-400">GPS Quality</p>
                        <p className="mt-2 text-2xl font-black text-white">
                          {formatNumber(selectedMetrics.gpsStableRatio * 100, 0)}%
                        </p>
                        <p className="mt-1 text-xs text-slate-400">Muestras con 8 o más satélites.</p>
                      </div>
                      <div className="rounded-xl border border-slate-700/70 bg-[#08101f]/80 p-3">
                        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-slate-400">Aggressive Exits</p>
                        <p className="mt-2 text-2xl font-black text-white">{selectedMetrics.aggressiveLaunchCount}</p>
                        <p className="mt-1 text-xs text-slate-400">Eventos detectados de alta corriente con mucho throttle.</p>
                      </div>
                      <div className="rounded-xl border border-slate-700/70 bg-[#08101f]/80 p-3">
                        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-slate-400">Air Speed</p>
                        <p className="mt-2 text-2xl font-black text-white">{formatNumber(selectedMetrics.avgAirSpeed, 1)} m/s</p>
                        <p className="mt-1 text-xs text-slate-400">Promedio útil para contextualizar arrastre.</p>
                      </div>
                      <div className="rounded-xl border border-slate-700/70 bg-[#08101f]/80 p-3">
                        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-slate-400">Ambient Temp</p>
                        <p className="mt-2 text-2xl font-black text-white">{formatNumber(selectedMetrics.avgAmbientTemp, 1)} C</p>
                        <p className="mt-1 text-xs text-slate-400">Promedio durante la sesión seleccionada.</p>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="grid gap-6 2xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
                  <div className={cardClassName}>
                    <div className="mb-4">
                      <h2 className="text-xl font-semibold text-white">Lap Breakdown</h2>
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                        Wh/km, time and average speed per lap
                      </p>
                    </div>
                    <div className="h-[320px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={lapChartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                          <CartesianGrid vertical={false} stroke="rgba(148,163,184,0.14)" strokeDasharray="4 6" />
                          <XAxis
                            dataKey="name"
                            tickLine={false}
                            axisLine={false}
                            stroke="#94a3b8"
                            tick={{ fill: "#94a3b8", fontSize: 12 }}
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            stroke="#94a3b8"
                            tick={{ fill: "#94a3b8", fontSize: 12 }}
                          />
                          <Tooltip
                            contentStyle={{
                              background: "rgba(2, 6, 23, 0.92)",
                              border: "1px solid rgba(148,163,184,0.2)",
                              borderRadius: "16px",
                              color: "#e2e8f0"
                            }}
                            formatter={(value, name) => {
                              if (name === "whPerKm") return [`${formatNumber(value, 2)} Wh/km`, "Efficiency"];
                              if (name === "durationSeconds") return [formatDuration(value), "Lap time"];
                              if (name === "avgSpeedKmh") return [`${formatNumber(value, 1)} km/h`, "Avg speed"];
                              return [formatNumber(value, 2), name];
                            }}
                          />
                          <Legend wrapperStyle={{ color: "#cbd5e1", fontSize: 12 }} />
                          <Bar dataKey="whPerKm" name="Wh/km" radius={[8, 8, 0, 0]}>
                            {lapChartData.map((entry, index) => (
                              <Cell
                                key={`${entry.name}-${index}`}
                                fill={index % 2 === 0 ? "#38bdf8" : "#fb923c"}
                              />
                            ))}
                          </Bar>
                          <Line
                            type="monotone"
                            dataKey="avgSpeedKmh"
                            name="Avg speed"
                            stroke="#34d399"
                            strokeWidth={3}
                            dot={{ r: 4, fill: "#34d399" }}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className={cardClassName}>
                    <div className="mb-4">
                      <h2 className="text-xl font-semibold text-white">Throttle vs Current</h2>
                      <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                        Spot inefficient acceleration clusters
                      </p>
                    </div>
                    <div className="h-[320px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 10, right: 10, left: -12, bottom: 0 }}>
                          <CartesianGrid stroke="rgba(148,163,184,0.14)" strokeDasharray="4 6" />
                          <XAxis
                            type="number"
                            dataKey="throttle"
                            name="Throttle"
                            unit="%"
                            tickLine={false}
                            axisLine={false}
                            stroke="#94a3b8"
                            tick={{ fill: "#94a3b8", fontSize: 12 }}
                          />
                          <YAxis
                            type="number"
                            dataKey="current"
                            name="Current"
                            unit="A"
                            tickLine={false}
                            axisLine={false}
                            stroke="#94a3b8"
                            tick={{ fill: "#94a3b8", fontSize: 12 }}
                          />
                          <Tooltip
                            cursor={{ strokeDasharray: "4 6" }}
                            contentStyle={{
                              background: "rgba(2, 6, 23, 0.92)",
                              border: "1px solid rgba(148,163,184,0.2)",
                              borderRadius: "16px",
                              color: "#e2e8f0"
                            }}
                            formatter={(value, name) => {
                              if (name === "Throttle") return [`${formatNumber(value, 0)}%`, name];
                              if (name === "Current") return [`${formatNumber(value, 1)} A`, name];
                              return [formatNumber(value, 2), name];
                            }}
                          />
                          <Scatter data={selectedMetrics.samples} fill="#67e8f9" />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </section>

                <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.95fr)]">
                  <div className={cardClassName}>
                    <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
                      <div>
                        <h2 className="text-xl font-semibold text-white">Session Benchmarking</h2>
                        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                          Compare against recent or same-group runs
                        </p>
                      </div>
                      <div className="rounded-full border border-slate-700/70 bg-[#08101f]/80 px-3 py-1 text-xs text-slate-300">
                        Benchmark session: #{benchmarkMetrics?.session?.id ?? "--"}
                      </div>
                    </div>

                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={comparisonChartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                          <CartesianGrid vertical={false} stroke="rgba(148,163,184,0.14)" strokeDasharray="4 6" />
                          <XAxis
                            dataKey="sessionLabel"
                            tickLine={false}
                            axisLine={false}
                            stroke="#94a3b8"
                            tick={{ fill: "#94a3b8", fontSize: 12 }}
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            stroke="#94a3b8"
                            tick={{ fill: "#94a3b8", fontSize: 12 }}
                          />
                          <Tooltip
                            contentStyle={{
                              background: "rgba(2, 6, 23, 0.92)",
                              border: "1px solid rgba(148,163,184,0.2)",
                              borderRadius: "16px",
                              color: "#e2e8f0"
                            }}
                            formatter={(value, name) => {
                              if (name === "whPerKm") return [`${formatNumber(value, 2)} Wh/km`, "Efficiency"];
                              if (name === "kmPerKWh") return [`${formatNumber(value, 2)} km/kWh`, "Range"];
                              return [formatNumber(value, 2), name];
                            }}
                          />
                          <Legend wrapperStyle={{ color: "#cbd5e1", fontSize: 12 }} />
                          <Bar dataKey="whPerKm" name="Wh/km" radius={[8, 8, 0, 0]}>
                            {comparisonChartData.map((entry) => (
                              <Cell
                                key={entry.sessionId}
                                fill={entry.sessionId === selectedSessionId ? "#fb923c" : "#38bdf8"}
                              />
                            ))}
                          </Bar>
                          <Line
                            type="monotone"
                            dataKey="kmPerKWh"
                            name="km/kWh"
                            stroke="#34d399"
                            strokeWidth={3}
                            dot={{ r: 4, fill: "#34d399" }}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className={cardClassName}>
                    <h2 className="text-xl font-semibold text-white">Sector & Lap Targets</h2>
                    <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-400">Quick tactical reference</p>

                    <div className="mt-4 space-y-3">
                      <div className="rounded-xl border border-slate-700/70 bg-[#08101f]/80 p-3">
                        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-slate-400">Best efficient lap</p>
                        <p className="mt-2 text-xl font-black text-emerald-100">
                          {selectedMetrics.bestEfficientLap ? `L${selectedMetrics.bestEfficientLap.lapNumber}` : "--"}
                        </p>
                        <p className="mt-1 text-sm text-slate-300">
                          {selectedMetrics.bestEfficientLap
                            ? `${formatNumber(selectedMetrics.bestEfficientLap.whPerKm, 2)} Wh/km • ${formatDuration(selectedMetrics.bestEfficientLap.durationSeconds)}`
                            : "Sin datos suficientes"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-700/70 bg-[#08101f]/80 p-3">
                        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-slate-400">Most expensive lap</p>
                        <p className="mt-2 text-xl font-black text-amber-100">
                          {selectedMetrics.mostExpensiveLap ? `L${selectedMetrics.mostExpensiveLap.lapNumber}` : "--"}
                        </p>
                        <p className="mt-1 text-sm text-slate-300">
                          {selectedMetrics.mostExpensiveLap
                            ? `${formatNumber(selectedMetrics.mostExpensiveLap.whPerKm, 2)} Wh/km • ${formatDuration(selectedMetrics.mostExpensiveLap.durationSeconds)}`
                            : "Sin datos suficientes"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-700/70 bg-[#08101f]/80 p-3">
                        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-slate-400">Track context</p>
                        <p className="mt-2 text-sm text-slate-300">
                          Altitude {formatNumber(selectedMetrics.avgAltitude, 1)} m • Peak speed {formatNumber(selectedMetrics.peakSpeedKmh, 1)} km/h
                        </p>
                        <p className="mt-1 text-sm text-slate-300">
                          Steering load events: {selectedMetrics.steeringLoadCount}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 overflow-hidden rounded-xl border border-slate-700/70">
                      <table className="min-w-full divide-y divide-slate-700 text-sm">
                        <thead className="bg-[#08101f]/85 text-slate-300">
                          <tr>
                            <th className="px-3 py-2 text-left">Sector</th>
                            <th className="px-3 py-2 text-left">Wh</th>
                            <th className="px-3 py-2 text-left">Wh/km</th>
                            <th className="px-3 py-2 text-left">Avg speed</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700 bg-[#0D1526]/80">
                          {selectedMetrics.sectors.map((sector) => (
                            <tr key={sector.sector}>
                              <td className="px-3 py-2 font-semibold text-white">{sector.sector}</td>
                              <td className="px-3 py-2 text-slate-300">{formatNumber(sector.wh, 1)}</td>
                              <td className="px-3 py-2 text-slate-300">{formatNumber(sector.whPerKm, 2)}</td>
                              <td className="px-3 py-2 text-slate-300">{formatNumber(sector.avgSpeedKmh, 1)} km/h</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>

                <section className={cardClassName}>
                  <div className="mb-4">
                    <h2 className="text-xl font-semibold text-white">Lap-by-Lap Table</h2>
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                      Fast enough to use during competition debriefs
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-700 text-sm">
                      <thead className="bg-[#08101f]/85 text-slate-300">
                        <tr>
                          <th className="px-3 py-2 text-left">Lap</th>
                          <th className="px-3 py-2 text-left">Time</th>
                          <th className="px-3 py-2 text-left">Wh</th>
                          <th className="px-3 py-2 text-left">Wh/km</th>
                          <th className="px-3 py-2 text-left">Avg speed</th>
                          <th className="px-3 py-2 text-left">Avg current</th>
                          <th className="px-3 py-2 text-left">Avg throttle</th>
                          <th className="px-3 py-2 text-left">Coast</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700 bg-[#0D1526]/80">
                        {selectedMetrics.laps.map((lap) => (
                          <tr key={lap.lapNumber}>
                            <td className="px-3 py-2 font-semibold text-white">L{lap.lapNumber}</td>
                            <td className="px-3 py-2 text-slate-300">{formatDuration(lap.durationSeconds)}</td>
                            <td className="px-3 py-2 text-slate-300">{formatNumber(lap.wh, 2)}</td>
                            <td className="px-3 py-2 text-slate-300">{formatNumber(lap.whPerKm, 2)}</td>
                            <td className="px-3 py-2 text-slate-300">{formatNumber(lap.avgSpeedKmh, 1)} km/h</td>
                            <td className="px-3 py-2 text-slate-300">{formatNumber(lap.avgCurrent, 1)} A</td>
                            <td className="px-3 py-2 text-slate-300">{formatNumber(lap.avgThrottle, 0)}%</td>
                            <td className="px-3 py-2 text-slate-300">{formatNumber(lap.coastRatio * 100, 0)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      </motion.main>
    </div>
  );
}
