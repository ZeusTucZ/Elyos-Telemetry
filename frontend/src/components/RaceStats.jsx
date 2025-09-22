

const RaceStats = ({ onStart, onPause, onReset, onSave , onNewLap, running_time = 0, currentLapTime = 0, laps, average_time = 0, target_time = 0 }) => {
    return (
        <div className='text-white p-2 rounded-xl shadow-lg w-full mx-auto h-full flex flex-row'>
            <div className="basis-[40%] bg-[#0A0F1C] rounded-xl m-1 p-1">
                {/* Time control */}
                <h2 className="text-xl font-semibold text-center m-4">Time Control</h2>
                <table className="w-full text-left table-auto">
                    <tbody>
                    <tr className="border-b border-gray-700">
                        <td className="py-1">Running time</td>
                        <td className="py-1">{running_time}</td>
                    </tr>
                    <tr className="border-b border-gray-700">
                        <td className="py-1">Average Time/Lap</td>
                        <td className="py-1">{average_time}</td>
                    </tr>
                    <tr className="border-b border-gray-700">
                        <td className="py-1">Target Time/Lap</td>
                        <td className="py-1">{target_time}</td>
                    </tr>
                    </tbody>
                </table>
            </div>
            <div className="basis-[40%] bg-[#0A0F1C] rounded-xl m-1 p-1">
                {/* Race progress */}
                <h2 className="text-xl font-semibold text-center m-4">Race Progress</h2>
                <div>
                    {laps.map((lap, idx) => (
                        <div key={idx}>
                        Lap {idx + 1}: {Math.floor(lap / 60)}:{('0' + (lap % 60)).slice(-2)} s
                        </div>
                    ))}
                    </div>
                <div>Current Lap Time: {currentLapTime}</div>
            </div>
            <div className="bg-[#0A0F1C] rounded-xl p-4 flex flex-col items-center gap-4 shadow-lg m-1">
                <button onClick={onStart} className="bg-[#A6A8B2] text-green-400 px-4 py-2 rounded-lg w-full font-bold text-sm">Start</button>
                <button onClick={onNewLap} className="bg-[#A6A8B2] text-white px-4 py-2 rounded-lg w-full text-sm">New Lap</button>
                <button onClick={onPause} className="bg-[#A6A8B2] text-white px-4 py-2 rounded-lg w-full text-sm">Pause</button>
                <button onClick={onReset} className="bg-[#A6A8B2] text-white px-4 py-2 rounded-lg w-full text-sm">Reset</button>
                <button onClick={onSave} className="bg-[#A6A8B2] text-white px-4 py-2 rounded-lg w-full text-sm">Save</button>
            </div>
        </div>
    )
}

export default RaceStats;