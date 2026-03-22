import { motion } from "framer-motion";

const clampPercentage = (value) => {
    const parsed = Number(value);

    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.min(100, parsed));
};

const Battery = ({ percentage = 0, orientation = "vertical" }) => {
    const safePercentage = clampPercentage(percentage);
    const displayPercentage = Math.floor(safePercentage);
    const isHorizontal = orientation === "horizontal";

    const levelStyles = {
        high: {
            fill: "from-cyan-300 via-sky-400 to-blue-500",
            sheen: "from-white/0 via-cyan-100/45 to-white/0",
            glow: "bg-cyan-200",
            aura: "bg-sky-400/30",
            label: "text-cyan-100"
        },
        medium: {
            fill: "from-emerald-300 via-lime-300 to-yellow-300",
            sheen: "from-white/0 via-lime-100/45 to-white/0",
            glow: "bg-lime-100",
            aura: "bg-emerald-300/30",
            label: "text-emerald-50"
        },
        low: {
            fill: "from-amber-300 via-orange-400 to-rose-500",
            sheen: "from-white/0 via-amber-100/45 to-white/0",
            glow: "bg-orange-200",
            aura: "bg-rose-400/35",
            label: "text-amber-100"
        }
    };

    const activeStyle = safePercentage > 65
        ? levelStyles.high
        : safePercentage > 30
            ? levelStyles.medium
            : levelStyles.low;

    return (
        <div
            className={`relative h-full w-full overflow-visible rounded-2xl border border-slate-600/70 bg-[#0D1526] p-2 shadow-[0_18px_40px_rgba(2,6,23,0.45)] ${
                isHorizontal ? "min-h-[3.5rem]" : "min-h-[11rem]"
            }`}
        >
            <div
                className={`relative h-full w-full overflow-hidden rounded-xl border border-slate-500/40 bg-[#162133] ${
                    isHorizontal ? "min-h-[2.5rem]" : ""
                }`}
            >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_58%)]" />

                <motion.div
                    className={`absolute rounded-[0.8rem] bg-gradient-to-r ${activeStyle.fill}`}
                    initial={isHorizontal ? { width: 0 } : { height: 0 }}
                    animate={isHorizontal ? { width: `${safePercentage}%` } : { height: `${safePercentage}%` }}
                    transition={{
                        type: "spring",
                        stiffness: 145,
                        damping: 22
                    }}
                    style={
                        isHorizontal
                            ? { left: 0, top: 0, bottom: 0 }
                            : { left: 0, right: 0, bottom: 0 }
                    }
                >
                    <motion.div
                        className={`absolute ${isHorizontal ? "inset-y-0 w-1/3 bg-gradient-to-r" : "inset-x-0 h-1/3 bg-gradient-to-t"} ${activeStyle.sheen}`}
                        animate={isHorizontal ? { x: ["-40%", "185%"] } : { y: ["140%", "-120%"] }}
                        transition={{
                            duration: safePercentage <= 30 ? 1.4 : 1.05,
                            repeat: Infinity,
                            ease: "linear"
                        }}
                    />

                    <motion.div
                        className={`absolute rounded-full blur-md ${activeStyle.aura} ${
                            isHorizontal
                                ? "right-0 top-1/2 h-8 w-8 -translate-y-1/2 translate-x-1/3"
                                : "left-1/2 top-0 h-8 w-8 -translate-x-1/2 -translate-y-1/3"
                        }`}
                        animate={{
                            scale: safePercentage > 0 ? [1, 1.18, 1] : 0.9,
                            opacity: safePercentage > 0 ? [0.35, 0.9, 0.35] : 0
                        }}
                        transition={{
                            duration: safePercentage <= 30 ? 1.3 : 0.9,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />

                    <motion.div
                        className={`absolute rounded-full border border-white/55 shadow-[0_0_18px_rgba(255,255,255,0.45)] ${activeStyle.glow} ${
                            isHorizontal
                                ? "right-0 top-1/2 h-4 w-4 -translate-y-1/2 translate-x-1/2"
                                : "left-1/2 top-0 h-4 w-4 -translate-x-1/2 -translate-y-1/2"
                        }`}
                        animate={{
                            scale: safePercentage > 0 ? [1, 1.14, 1] : 0.85
                        }}
                        transition={{
                            duration: safePercentage <= 30 ? 1.1 : 0.7,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />
                </motion.div>

                <div
                    className={`absolute z-10 flex text-xs font-black uppercase tracking-[0.2em] ${
                        isHorizontal
                            ? "inset-x-3 top-1/2 -translate-y-1/2 items-center justify-between"
                            : "left-1/2 top-3 -translate-x-1/2 flex-col items-center gap-1"
                    }`}
                >
                    {isHorizontal && (
                        <span className="rounded-full bg-slate-950/75 px-2 py-1 text-slate-100 shadow-[0_8px_18px_rgba(2,6,23,0.45)]">
                            Battery
                        </span>
                    )}
                    <span
                        className={`rounded-full bg-slate-950/75 px-2 py-1 shadow-[0_8px_18px_rgba(2,6,23,0.45)] ${activeStyle.label}`}
                    >
                        {displayPercentage}%
                    </span>
                </div>
            </div>

            <div
                className={`absolute bg-slate-500/80 ${
                    isHorizontal
                        ? "right-[-10px] top-1/4 h-1/2 w-2 rounded-r-md"
                        : "left-1/4 top-[-10px] h-2 w-1/2 rounded-t-md"
                }`}
            />
        </div>
    );
};

export default Battery;
