

const IMUdata = ({ roll = 0, pitch = 0, yaw = 0, accel_x = 0, accel_y = 0}) => {
    return (
        <div className="h-full w-full rounded-xl border border-slate-700/60 bg-[#0D1526] p-4 text-white shadow-[0_18px_40px_rgba(2,6,23,0.45)]">
            <div className="mb-4">
                <h2 className="text-xl font-semibold text-center">IMU Data</h2>
                <p className="text-center text-xs uppercase tracking-[0.22em] text-slate-400">Motion Sensors</p>
            </div>
            <table className="w-full text-left table-auto">
                <thead>
                <tr className="border-b border-slate-700">
                    <th className="py-1 text-left">Gyroscope</th>
                </tr>
                </thead>
                <tbody>
                <tr className="border-b border-slate-700/80">
                    <td className="py-1">Roll</td>
                    <td className="py-1">{Number(roll).toFixed(1)} °</td>
                </tr>
                <tr className="border-b border-slate-700/80">
                    <td className="py-1">Pitch</td>
                    <td className="py-1">{Number(pitch).toFixed(1)} °</td>
                </tr>
                <tr className="border-b border-slate-700/80">
                    <td className="py-1">Yaw</td>
                    <td className="py-1">{Number(yaw).toFixed(1)} °</td>
                </tr>
                </tbody>
                <thead>
                <tr className="border-b border-slate-700">
                    <th className="py-1 text-left">Accelerations</th>
                </tr>
                </thead>
                <tbody>
                <tr className="border-b border-slate-700/80">
                    <td className="py-1 whitespace-nowrap w-1">Accel_x</td>
                    <td className="py-1 w-full text-right">{Number(accel_x).toFixed(1)} m/s2</td>
                </tr>
                <tr className="border-b border-slate-700/80">
                    <td className="py-1 whitespace-nowrap w-1">Accel_y</td>
                    <td className="py-1 w-full text-right">{Number(accel_y).toFixed(1)} m/s2</td>
                </tr>
                </tbody>
            </table>
        </div>
    )
};

export default IMUdata;
