import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

const formatValue = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue.toFixed(2) : "0.00";
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  const voltage = payload.find((entry) => entry.dataKey === "voltage")?.value ?? 0;
  const current = payload.find((entry) => entry.dataKey === "current")?.value ?? 0;

  return (
    <div className="rounded-2xl border border-slate-600/70 bg-slate-950/85 px-4 py-3 shadow-[0_18px_40px_rgba(2,6,23,0.45)] backdrop-blur-md">
      <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.26em] text-slate-400">
        T + {label}s
      </p>
      <div className="flex items-center gap-2 text-sm text-cyan-100">
        <span className="h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.8)]" />
        Voltage: {formatValue(voltage)} V
      </div>
      <div className="mt-1 flex items-center gap-2 text-sm text-orange-100">
        <span className="h-2.5 w-2.5 rounded-full bg-orange-300 shadow-[0_0_10px_rgba(253,186,116,0.8)]" />
        Current: {formatValue(current)} A
      </div>
    </div>
  );
};

const CustomLegend = () => (
  <div className="mt-2 flex items-center justify-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
    <div className="flex items-center gap-2 rounded-full border border-cyan-400/20 bg-slate-950/55 px-3 py-1">
      <span className="h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_10px_rgba(103,232,249,0.75)]" />
      Voltage
    </div>
    <div className="flex items-center gap-2 rounded-full border border-orange-400/20 bg-slate-950/55 px-3 py-1">
      <span className="h-2.5 w-2.5 rounded-full bg-orange-300 shadow-[0_0_10px_rgba(253,186,116,0.75)]" />
      Current
    </div>
  </div>
);

const getAxisDomain = (values, maxLimit = 52) => {
  const numericValues = values.filter((value) => Number.isFinite(value));

  if (!numericValues.length) {
    return [0, maxLimit];
  }

  const min = Math.min(...numericValues);
  const max = Math.max(...numericValues);

  if (min === max) {
    const padding = Math.max(1, Math.abs(min) * 0.1);
    return [Math.max(0, min - padding), maxLimit];
  }

  const padding = Math.max((max - min) * 0.12, 0.5);
  return [Math.max(0, min - padding), maxLimit];
};

const VoltageCurrentChart = ({ dataHistory = [] }) => {
  const latestPoint = dataHistory[dataHistory.length - 1];
  const [flashKey, setFlashKey] = useState(0);

  useEffect(() => {
    if (latestPoint?.id) {
      setFlashKey((prev) => prev + 1);
    }
  }, [latestPoint?.id]);

  const latestVoltage = latestPoint?.voltage ?? 0;
  const latestCurrent = latestPoint?.current ?? 0;

  const chartData = useMemo(() => {
    if (!dataHistory.length) {
      return [{ timeSeconds: 0, voltage: 0, current: 0 }];
    }

    return dataHistory;
  }, [dataHistory]);

  const smoothedChartData = useMemo(() => {
    return chartData.map((entry, index, array) => {
      const window = array.slice(Math.max(0, index - 2), index + 1);
      const voltageAverage =
        window.reduce((sum, item) => sum + Number(item.voltage || 0), 0) / window.length;
      const currentAverage =
        window.reduce((sum, item) => sum + Number(item.current || 0), 0) / window.length;

      return {
        ...entry,
        voltageSmoothed: voltageAverage,
        currentSmoothed: currentAverage
      };
    });
  }, [chartData]);

  const voltageDomain = useMemo(
    () => getAxisDomain(smoothedChartData.map((entry) => Number(entry.voltageSmoothed))),
    [smoothedChartData]
  );

  const currentDomain = useMemo(
    () => getAxisDomain(smoothedChartData.map((entry) => Number(entry.currentSmoothed))),
    [smoothedChartData]
  );

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-slate-700/60 bg-[#0D1526] p-4 text-white shadow-[0_22px_50px_rgba(2,6,23,0.5)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.1),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(251,146,60,0.08),transparent_38%)]" />

      <AnimatePresence mode="wait">
        <motion.div
          key={flashKey}
          initial={{ opacity: 0.12 }}
          animate={{ opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(103,232,249,0.18),transparent_40%,rgba(253,186,116,0.16))]"
        />
      </AnimatePresence>

      <div className="relative z-10 mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Voltage and Current</h2>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
            Live Power Trace
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="rounded-full border border-cyan-400/20 bg-slate-950/65 px-3 py-2 shadow-[0_12px_24px_rgba(2,6,23,0.4)]">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-slate-400">Voltage</p>
            <p className="text-sm font-bold text-cyan-100">{formatValue(latestVoltage)} V</p>
          </div>

          <div className="rounded-full border border-orange-400/20 bg-slate-950/65 px-3 py-2 shadow-[0_12px_24px_rgba(2,6,23,0.4)]">
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-slate-400">Current</p>
            <p className="text-sm font-bold text-orange-100">{formatValue(latestCurrent)} A</p>
          </div>
        </div>
      </div>

      <div className="relative z-10 h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={smoothedChartData} margin={{ top: 10, right: 10, left: -12, bottom: 8 }}>
            <defs>
              <linearGradient id="voltageFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#67e8f9" stopOpacity={0.32} />
                <stop offset="100%" stopColor="#67e8f9" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="currentFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fb923c" stopOpacity={0.24} />
                <stop offset="100%" stopColor="#fb923c" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid vertical={false} stroke="rgba(148, 163, 184, 0.14)" strokeDasharray="4 6" />

            <XAxis
              dataKey="timeSeconds"
              tickLine={false}
              axisLine={false}
              stroke="#94a3b8"
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              tickFormatter={(value) => `${value}s`}
              minTickGap={24}
            />

            <YAxis
              yAxisId="voltage"
              tickLine={false}
              axisLine={false}
              stroke="#94a3b8"
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              width={42}
              domain={voltageDomain}
            />

            <YAxis yAxisId="current" hide domain={currentDomain} />

            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(226,232,240,0.2)", strokeWidth: 1 }} />

            <Area
              type="natural"
              dataKey="voltageSmoothed"
              yAxisId="voltage"
              fill="url(#voltageFill)"
              stroke="none"
              isAnimationActive={false}
            />

            <Area
              type="natural"
              dataKey="currentSmoothed"
              yAxisId="current"
              fill="url(#currentFill)"
              stroke="none"
              isAnimationActive={false}
            />

            <Line
              type="natural"
              dataKey="voltageSmoothed"
              yAxisId="voltage"
              name="Voltage (V)"
              stroke="#67e8f9"
              strokeWidth={3}
              dot={false}
              activeDot={{
                r: 6,
                fill: "#cffafe",
                stroke: "#67e8f9",
                strokeWidth: 2
              }}
              isAnimationActive={false}
            />

            <Line
              type="natural"
              dataKey="currentSmoothed"
              yAxisId="current"
              name="Current (A)"
              stroke="#fb923c"
              strokeWidth={3}
              dot={false}
              activeDot={{
                r: 6,
                fill: "#ffedd5",
                stroke: "#fb923c",
                strokeWidth: 2
              }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="relative z-10 mt-3">
        <CustomLegend />
      </div>
    </div>
  );
};

export default VoltageCurrentChart;
