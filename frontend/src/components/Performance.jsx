

const PerformanceTable = ({ current = 0, voltage = 0, rpms = 0, totalConsumption = 0, efficiency = 0, distance = 0 }) => {
    return (
        <div className="bg-[#0A0F1C] text-white p-4 rounded-xl shadow-lg w-full mx-auto h-full">
            <h2 className="text-xl font-semibold text-center mb-4">Performance</h2>
            <table className="w-full text-left table-auto">
                <thead>
                <tr className="border-b border-gray-600">
                    <th className="py-1 w-1/2 text-left">Metric</th>
                    <th className="py-1 w-1/2 text-left">Value</th>
                </tr>
                </thead>
                <tbody>
                <tr className="border-b border-gray-700">
                    <td className="py-1">Current</td>
                    <td className="py-1">{current} A</td>
                </tr>
                <tr className="border-b border-gray-700">
                    <td className="py-1">Voltage</td>
                    <td className="py-1">{voltage} V</td>
                </tr>
                <tr className="border-b border-gray-700">
                    <td className="py-1">RPMs</td>
                    <td className="py-1">{rpms}</td>
                </tr>
                <tr className="border-b border-gray-700">
                    <td className="py-1">Total Consumption</td>
                    <td className="py-1">{totalConsumption} Wh</td>
                </tr>
                <tr className="border-b border-gray-700">
                    <td className="py-1">Efficiency</td>
                    <td className="py-1">{efficiency} km/kWh</td>
                </tr>
                <tr>
                    <td className="py-1">Distance</td>
                    <td className="py-1">{distance} km</td>
                </tr>
                </tbody>
            </table>
        </div>
    );
};

export default PerformanceTable;