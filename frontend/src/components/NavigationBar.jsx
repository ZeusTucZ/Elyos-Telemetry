import React from "react";
import { Link, NavLink } from "react-router-dom";
import logoElyos from '../assets/logoElyos.png'

const NavigationBar = () => {
    const navItems = [
        { label: "Dashboard", to: "/dashboard", disabled: false },
        { label: "Analysis", to: "/analysis", disabled: false },
        { label: "Sessions", to: "/sessions", disabled: true },
        { label: "Pilots", to: "/pilots", disabled: true },
        { label: "Configurations", to: "/settings", disabled: true }
    ];

    return (
        <nav className="relative z-50 bg-[#0A0F1C] text-white py-4 shadow-md w-full overflow-x-hidden">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 px-4">
            <Link to="/">
            <img src={logoElyos} alt="Elyos logo" className="h-10 sm:h-12" />
            </Link>

            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm sm:text-lg">
            {navItems.map((item) => (
                item.disabled ? (
                    <button
                        key={item.label}
                        type="button"
                        disabled
                        className="cursor-not-allowed rounded-full border border-slate-700/70 bg-slate-900/60 px-3 py-1 text-slate-500 opacity-70"
                    >
                        {item.label}
                    </button>
                ) : (
                    <NavLink
                        key={item.label}
                        to={item.to}
                        className={({ isActive }) =>
                            `rounded-full border px-3 py-1 transition ${
                                isActive
                                    ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-100"
                                    : "border-slate-700/70 bg-slate-900/60 text-slate-200 hover:border-cyan-400/30 hover:bg-cyan-400/10 hover:text-cyan-100"
                            }`
                        }
                    >
                        {item.label}
                    </NavLink>
                )
            ))}
            </div>
        </div>
        </nav>
    );
}

export default NavigationBar;
