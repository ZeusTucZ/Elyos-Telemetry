import React from "react";
import { Link } from "react-router-dom";
import logoElyos from '../assets/logoElyos.png'

const NavigationBar = () => {
    const disabledItems = ["Dashboard", "Analysis", "Sessions", "Pilots", "Configurations"];

    return (
        <nav className="bg-[#0A0F1C] text-white py-4 shadow-md w-full overflow-x-hidden">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 px-4">
            <Link to="/">
            <img src={logoElyos} alt="Elyos logo" className="h-10 sm:h-12" />
            </Link>

            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm sm:text-lg">
            {disabledItems.map((item) => (
                <button
                    key={item}
                    type="button"
                    disabled
                    className="cursor-not-allowed rounded-full border border-slate-700/70 bg-slate-900/60 px-3 py-1 text-slate-500 opacity-70"
                >
                    {item}
                </button>
            ))}
            </div>
        </div>
        </nav>
    );
}

export default NavigationBar;
