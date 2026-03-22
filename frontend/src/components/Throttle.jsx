import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const clampPercentage = (value) => {
    const parsed = Number(value);

    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.min(100, parsed));
};

const Throttle = ({ percentage = 0 }) => {
    const safePercentage = clampPercentage(percentage);
    const previousPercentageRef = useRef(safePercentage);
    const [trend, setTrend] = useState("steady");

    useEffect(() => {
        if (safePercentage > previousPercentageRef.current) {
            setTrend("increasing");
        } else if (safePercentage < previousPercentageRef.current) {
            setTrend("decreasing");
        } else {
            setTrend("steady");
        }

        previousPercentageRef.current = safePercentage;
    }, [safePercentage]);

    const stylesByTrend = {
        increasing: {
            fill: "from-cyan-300 via-sky-400 to-blue-500",
            sheen: "from-white/0 via-cyan-100/50 to-white/0",
            glow: "bg-cyan-200",
            aura: "bg-sky-400/35",
            label: "text-cyan-100",
            status: "Pushing"
        },
        decreasing: {
            fill: "from-amber-300 via-orange-400 to-rose-500",
            sheen: "from-white/0 via-amber-100/45 to-white/0",
            glow: "bg-orange-200",
            aura: "bg-rose-400/30",
            label: "text-amber-100",
            status: "Lifting"
        },
        steady: {
            fill: "from-slate-300 via-slate-400 to-slate-500",
            sheen: "from-white/0 via-slate-100/30 to-white/0",
            glow: "bg-slate-200",
            aura: "bg-slate-300/20",
            label: "text-slate-300",
            status: "Holding"
        }
    };

    const activeStyle = stylesByTrend[trend];

    return (
        <div className="w-full max-w-sm rounded-2xl border border-slate-600/70 bg-[#0D1526] px-4 py-3 shadow-[0_18px_40px_rgba(2,6,23,0.45)]">
            <div className="mb-2 flex items-end justify-between gap-4">
                <div>
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-slate-400">
                        Throttle
                    </p>
                    <p className={`text-xs font-medium ${activeStyle.label}`}>
                        {activeStyle.status}
                    </p>
                </div>
                <motion.div
                    key={`${trend}-${safePercentage}`}
                    initial={{ opacity: 0.65, y: 5, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.22 }}
                    className="rounded-full bg-slate-950/70 px-3 py-1 text-2xl font-black leading-none text-white shadow-[0_8px_18px_rgba(2,6,23,0.45)]"
                >
                    {safePercentage.toFixed(0)}%
                </motion.div>
            </div>

            <div className="relative h-5 overflow-hidden rounded-full border border-slate-500/40 bg-[#162133]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_58%)]" />

                <motion.div
                    className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${activeStyle.fill}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${safePercentage}%` }}
                    transition={{
                        type: "spring",
                        stiffness: trend === "increasing" ? 180 : 120,
                        damping: trend === "increasing" ? 18 : 24
                    }}
                >
                    <motion.div
                        className={`absolute inset-y-0 w-1/2 bg-gradient-to-r ${activeStyle.sheen}`}
                        animate={{
                            x: ["-35%", "155%"]
                        }}
                        transition={{
                            duration: trend === "increasing" ? 1.05 : 1.5,
                            repeat: Infinity,
                            ease: "linear"
                        }}
                    />

                    <motion.div
                        className={`absolute right-0 top-1/2 h-8 w-8 -translate-y-1/2 translate-x-1/3 rounded-full blur-md ${activeStyle.aura}`}
                        animate={{
                            scale: safePercentage > 0 ? [1, 1.18, 1] : 0.9,
                            opacity: safePercentage > 0 ? [0.35, 0.9, 0.35] : 0
                        }}
                        transition={{
                            duration: trend === "increasing" ? 0.9 : 1.25,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />

                    <motion.div
                        className={`absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 translate-x-1/2 rounded-full border border-white/55 shadow-[0_0_18px_rgba(255,255,255,0.45)] ${activeStyle.glow}`}
                        animate={{
                            scale: safePercentage > 0 ? [1, 1.14, 1] : 0.85
                        }}
                        transition={{
                            duration: trend === "decreasing" ? 1.1 : 0.7,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />
                </motion.div>
            </div>
        </div>
    );
};

export default Throttle;
