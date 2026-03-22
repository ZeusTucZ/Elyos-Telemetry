

const PerformanceTable = ({ current = 0, voltage = 0, rpms = 0, totalConsumption = 0, efficiency = 0, distance = 0, ampHours = 0, whPerKm = 0, ambient_temp = 0, throttle = 0}) => {
    return (
        <div className="h-full w-full rounded-xl border border-slate-700/60 bg-[#0D1526] p-4 text-white shadow-[0_18px_40px_rgba(2,6,23,0.45)]">
            <div className="mb-4">
                <h2 className="text-xl font-semibold text-center text-white">Performance</h2>
                <p className="text-center text-xs uppercase tracking-[0.22em] text-slate-400">Power Snapshot</p>
            </div>
            <table className="w-full text-left table-auto">
                <thead>
                <tr className="border-b border-slate-700">
                    <th className="py-1 w-1/2 text-left">Metric</th>
                    <th className="py-1 w-1/2 text-left">Value</th>
                </tr>
                </thead>
                <tbody>
                <tr className="border-b border-slate-700/80">
                    <td className="py-1">Current</td>
                    <td className="py-1 text-orange-100">{current} A</td>
                </tr>
                <tr className="border-b border-slate-700/80">
                    <td className="py-1">Voltage</td>
                    <td className="py-1 text-cyan-100">{voltage} V</td>
                </tr>
                <tr className="border-b border-slate-700/80">
                    <td className="py-1">RPMs</td>
                    <td className="py-1">{rpms}</td>
                </tr>
                <tr className="border-b border-slate-700/80">
                    <td className="py-1">Total Consumption</td>
                    <td className="py-1">{totalConsumption} Wh</td>
                </tr>
                <tr className="border-b border-slate-700/80">
                    <td className="py-1">Efficiency</td>
                    <td className="py-1">{efficiency} km/kWh</td>
                </tr>
                <tr className="border-b border-slate-700/80">
                    <td className="py-1">Distance</td>
                    <td className="py-1">{distance} km</td>
                </tr>
                <tr className="border-b border-slate-700/80">
                    <td className="py-1">Amp Hours</td>
                    <td className="py-1">{ampHours} km</td>
                </tr>
                <tr className="border-b border-slate-700/80">
                    <td className="py-1">Wh Per Km</td>
                    <td className="py-1">{whPerKm} km</td>
                </tr>
                <tr className="border-b border-slate-700/80">
                    <td className="py-1">Ambient Temp</td>
                    <td className="py-1">{ambient_temp} °</td>
                </tr>
                <tr>
                    <td className="py-1">Throttle</td>
                    <td className="py-1">{throttle}%</td>
                </tr>
                </tbody>
            </table>
        </div>
    );
};

export default PerformanceTable;
