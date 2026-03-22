import { motion } from "framer-motion";
import ReactSpeedometer from "react-d3-speedometer";

const clampSpeed = (value, maxValue) => {
    const parsed = Number(value);

    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.min(parsed, maxValue));
};

const Speedometer = ({ speed = 0, maxValue = 80 }) => {
    const safeSpeed = clampSpeed(speed, maxValue);
    const speedRatio = maxValue > 0 ? safeSpeed / maxValue : 0;
    const statusLabel =
        speedRatio > 0.8 ? "High pace" :
        speedRatio > 0.45 ? "Cruising" :
        speedRatio > 0.1 ? "Rolling" :
        "Idle";

    return (
        <div className="relative mx-auto w-full max-w-[22rem] overflow-hidden rounded-[1.75rem] border border-slate-700/60 bg-[#0D1526] px-4 py-4 shadow-[0_24px_55px_rgba(2,6,23,0.5)]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.14),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(251,146,60,0.1),transparent_34%)]" />

            <div className="relative z-10 mb-3 flex items-start justify-between gap-3">
                <div>
                    <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-400">
                        Speed
                    </p>
                    <p className="text-xs font-medium text-slate-300">
                        {statusLabel}
                    </p>
                </div>

                <motion.div
                    key={safeSpeed}
                    initial={{ opacity: 0.7, y: 5, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.22 }}
                    className="rounded-full border border-slate-600/70 bg-slate-950/80 px-3 py-1 text-right shadow-[0_10px_24px_rgba(2,6,23,0.45)]"
                >
                    <div className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-slate-500">
                        Live
                    </div>
                    <div className="font-mono text-2xl font-black leading-none text-slate-50">
                        {safeSpeed.toFixed(0)}
                        <span className="ml-1 text-xs font-semibold text-slate-300">km/h</span>
                    </div>
                </motion.div>
            </div>

            <div className="relative z-10 overflow-hidden rounded-[1.4rem] border border-slate-700/50 bg-[#08111f]/80 px-2 pt-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_40%)]" />
                <div className="relative mx-auto flex w-full justify-center overflow-hidden">
                    <ReactSpeedometer
                        value={safeSpeed}
                        maxValue={maxValue}
                        minValue={0}
                        segments={100}
                        needleColor="#cbd5e1"
                        needleTransitionDuration={700}
                        needleTransition="easeQuadInOut"
                        startColor="#38bdf8"
                        endColor="#f59e0b"
                        segmentColors={[
                            "#38bdf8",
                            "#22d3ee",
                            "#2dd4bf",
                            "#84cc16",
                            "#facc15",
                            "#f59e0b"
                        ]}
                        customSegmentStops={[0, 12, 24, 38, 52, 66, maxValue]}
                        textColor="#94a3b8"
                        ringWidth={22}
                        needleHeightRatio={0.6}
                        width={280}
                        height={210}
                        currentValueText=""
                        valueTextFontSize="0px"
                        labelFontSize="11px"
                        paddingHorizontal={20}
                        paddingVertical={18}
                    />
                    <div className="pointer-events-none absolute bottom-[1.9rem] left-1/2 h-4 w-4 -translate-x-1/2 rounded-full border border-white/20 bg-slate-200 shadow-[0_0_18px_rgba(148,163,184,0.4)]" />
                </div>
            </div>
        </div>
    );
};

export default Speedometer;
