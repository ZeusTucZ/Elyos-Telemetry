const paceStatusCopy = {
  on_target: "On target",
  below_target: "Build speed",
  below_required_pace: "Recover time",
  faster_than_needed: "Save energy",
  pace_limit_exceeded: "Limits too strict",
};

const paceStatusTone = {
  on_target: "border-emerald-400/20 bg-emerald-500/10 text-emerald-200",
  below_target: "border-sky-400/20 bg-sky-500/10 text-sky-200",
  below_required_pace: "border-amber-400/20 bg-amber-500/10 text-amber-200",
  faster_than_needed: "border-cyan-400/20 bg-cyan-500/10 text-cyan-200",
  pace_limit_exceeded: "border-rose-400/20 bg-rose-500/10 text-rose-200",
};

const getConfidenceTone = (confidenceScore = 0) => {
  if (confidenceScore >= 0.7) {
    return "text-emerald-200";
  }

  if (confidenceScore >= 0.4) {
    return "text-amber-200";
  }

  return "text-rose-200";
};

const getConfidenceLabel = (confidenceScore = 0) => {
  if (confidenceScore >= 0.7) {
    return "Stable";
  }

  if (confidenceScore >= 0.4) {
    return "Watch";
  }

  return "Low";
};

const formatNumber = (value, digits = 1) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue.toFixed(digits) : "--";
};

const formatSignedNumber = (value, digits = 1) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return "--";
  }

  return `${numericValue >= 0 ? "+" : ""}${numericValue.toFixed(digits)}`;
};

const InfoTile = ({ label, value, unit = "", accent = "text-white" }) => (
  <div className="rounded-2xl border border-slate-700/60 bg-[#0F1A2E] px-4 py-3 shadow-[0_12px_28px_rgba(2,6,23,0.3)]">
    <div className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-slate-400">
      {label}
    </div>
    <div className={`mt-1 text-[clamp(1.35rem,2.2vw,2rem)] font-bold ${accent}`}>
      {value}
      {unit ? <span className="ml-1 text-sm font-medium text-slate-300">{unit}</span> : null}
    </div>
  </div>
);

const RaceStrategyPanel = ({
  strategy = null,
  strategyConfig = null,
  onStrategyConfigChange,
  canControl = false,
}) => {
  const paceTone =
    paceStatusTone[strategy?.paceStatus] || "border-slate-700/60 bg-slate-900/40 text-slate-300";
  const confidencePercent = Math.max(5, Math.round((strategy?.confidenceScore || 0) * 100));

  return (
    <section className="rounded-2xl border border-slate-700/60 bg-[#0D1526]/95 shadow-[0_22px_50px_rgba(2,6,23,0.45)] overflow-hidden">
      <div className="relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(251,146,60,0.08),transparent_28%)]" />

        <div className="relative z-10 p-4 sm:p-5 lg:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-400">
                The following code is completely made with chatGPT. It uses a ridge regression model from the buffer to predict the optimum velocity based on past data. It calculates km/kWh.
              </p>
              <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
                Live Speed Recommendation
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                Shows the pace the driver should hold right now to protect energy while still finishing on time.
              </p>
            </div>

            <div className={`self-start rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] ${paceTone}`}>
              {paceStatusCopy[strategy?.paceStatus] || "Calibrating"}
            </div>
          </div>

          {strategy ? (
            <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[1.5fr_1fr]">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <InfoTile
                    label="Target Speed"
                    value={formatNumber(strategy.targetSpeedKph)}
                    unit="km/h"
                    accent="text-cyan-100"
                  />
                  <InfoTile
                    label="Current Speed"
                    value={formatNumber(strategy.currentSpeedKph)}
                    unit="km/h"
                  />
                  <InfoTile
                    label="Delta"
                    value={formatSignedNumber(strategy.deltaSpeedKph)}
                    unit="km/h"
                    accent={Number(strategy.deltaSpeedKph) >= 0 ? "text-amber-200" : "text-emerald-200"}
                  />
                  <InfoTile
                    label="Min Pace"
                    value={formatNumber(strategy.minimumFeasibleSpeedKph)}
                    unit="km/h"
                    accent="text-orange-100"
                  />
                </div>

                <div className="rounded-2xl border border-slate-700/60 bg-[#0F1A2E] p-4 shadow-[0_12px_28px_rgba(2,6,23,0.3)]">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-slate-400">
                        Driver Instruction
                      </p>
                      <p className="mt-2 text-base font-medium text-slate-100 sm:text-lg">
                        {strategy.driverMessage}
                      </p>
                    </div>

                    <div className="min-w-[200px] rounded-2xl border border-slate-700/60 bg-[#131E31] px-4 py-3">
                      <div className="flex items-center justify-between text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-slate-400">
                        <span>Confidence</span>
                        <span className={getConfidenceTone(strategy.confidenceScore)}>
                          {getConfidenceLabel(strategy.confidenceScore)}
                        </span>
                      </div>
                      <div className={`mt-1 text-2xl font-bold ${getConfidenceTone(strategy.confidenceScore)}`}>
                        {confidencePercent}%
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className={`h-full rounded-full transition-all ${
                            strategy.confidenceScore >= 0.7
                              ? "bg-emerald-400"
                              : strategy.confidenceScore >= 0.4
                                ? "bg-amber-400"
                                : "bg-rose-400"
                          }`}
                          style={{ width: `${confidencePercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <InfoTile
                    label="Remaining Distance"
                    value={formatNumber(strategy.remainingDistanceKm, 2)}
                    unit="km"
                  />
                  <InfoTile
                    label="Lap Progress"
                    value={formatNumber(strategy.lapProgressPct, 0)}
                    unit="%"
                  />
                  <InfoTile
                    label="Energy Used"
                    value={formatNumber(strategy.energyUsedWh, 1)}
                    unit="Wh"
                  />
                  <InfoTile
                    label="Expected Efficiency"
                    value={formatNumber(strategy.predictedEfficiencyKmPerKWh, 1)}
                    unit="km/kWh"
                  />
                </div>

                <div className="rounded-2xl border border-slate-700/60 bg-[#0F1A2E] p-4 shadow-[0_12px_28px_rgba(2,6,23,0.3)]">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-slate-400">
                        Strategy Limits
                      </p>
                      <p className="mt-1 text-sm text-slate-300">
                        Keep the recommendation inside your competition envelope.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {[
                      {
                        label: "Track km",
                        key: "trackLengthKm",
                        step: "0.01",
                        value: strategyConfig?.trackLengthKm,
                      },
                      {
                        label: "Min km/h",
                        key: "minSpeedKph",
                        step: "0.5",
                        value: strategyConfig?.minSpeedKph,
                      },
                      {
                        label: "Max km/h",
                        key: "maxSpeedKph",
                        step: "0.5",
                        value: strategyConfig?.maxSpeedKph,
                      },
                    ].map((field) => (
                      <label key={field.key} className="flex flex-col gap-1">
                        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-slate-400">
                          {field.label}
                        </span>
                        <input
                          type="number"
                          step={field.step}
                          value={field.value ?? ""}
                          disabled={!canControl}
                          onChange={(event) =>
                            onStrategyConfigChange?.({
                              [field.key]: Number(event.target.value),
                            })
                          }
                          className={`rounded-xl border border-slate-600 bg-[#162133] px-3 py-2 text-sm text-white outline-none transition ${
                            canControl
                              ? "focus:border-cyan-400/60"
                              : "cursor-not-allowed opacity-70"
                          }`}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-700/70 bg-[#0F1A2E] px-5 py-8 text-center text-sm text-slate-400">
              Waiting for enough live telemetry to issue a reliable pace recommendation.
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default RaceStrategyPanel;
