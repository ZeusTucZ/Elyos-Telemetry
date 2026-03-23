const RaceStats = ({
    canControl,
    onStart,
    onPauseToggle,
    isPaused = false,
    onReset,
    onSave,
    onNewLap,
    onDeleteLastLap,
    maxLaps = 5,
    onMaxLapsChange,
    maxLapOptions = [5],
    canCreateNewLap = true,
    canDeleteLastLap = false,
    onNewConfig,
    onNewMssage,
    onToggleIngestion,
    ingestionEnabled = true,
    ingestionLoading = false,
    running_time = 0,
    currentLapTime = 0,
    laps,
    average_time = 0,
    target_time = 0,
    current_lap = 1,
    remaining_time = 0,
    altitude = 0,
    num_sats = 0,
    airSpeed = 0
}) => {
    return (
        <div className='text-white p-2 rounded-xl w-full mx-auto h-full flex flex-col md:flex-row'>
            <div className="md:basis-[40%] rounded-xl border border-slate-700/60 bg-[#0D1526] m-1 p-3 min-w-0 shadow-[0_18px_40px_rgba(2,6,23,0.45)]">
                {/* Time control */}
                <h2 className="text-xl font-semibold text-center m-4">Time Control</h2>
                <table className="w-full text-left table-auto">
                    <tbody>
                    <tr className="border-b border-slate-700/80">
                        <td className="py-1">Running time</td>
                        <td className="py-1">{running_time}</td>
                    </tr>
                    <tr className="border-b border-slate-700/80">
                        <td className="py-1">Average Time/Lap</td>
                        <td className="py-1">{average_time}</td>
                    </tr>
                    <tr className="border-b border-slate-700/80">
                        <td className="py-1">Target Time/Lap</td>
                        <td className="py-1">{target_time}</td>
                    </tr>
                    <tr className="border-b border-slate-700/80">
                        <td className="py-1">Current Lap</td>
                        <td className="py-1">{current_lap}</td>
                    </tr>
                    <tr className="border-b border-slate-700/80">
                        <td className="py-1">Remaining time</td>
                        <td className="py-1">{remaining_time}</td>
                    </tr>
                    </tbody>
                </table>
                <h2 className="text-xl font-semibold text-center m-2">Extra Data</h2>
                <table className="w-full text-left table-auto">
                    <tbody>
                    <tr className="border-b border-slate-700/80">
                        <td className="py-1">Altitude</td>
                        <td className="py-1">{altitude}</td>
                    </tr>
                    <tr className="border-b border-slate-700/80">
                        <td className="py-1">Number of satellites</td>
                        <td className="py-1">{num_sats}</td>
                    </tr>
                    <tr className="border-b border-slate-700/80">
                        <td className="py-1">Air speed</td>
                        <td className="py-1">{airSpeed}</td>
                    </tr>
                    </tbody>
                </table>
            </div>
            <div className="md:basis-[40%] rounded-xl border border-slate-700/60 bg-[#0D1526] m-1 p-3 min-w-0 shadow-[0_18px_40px_rgba(2,6,23,0.45)]">
                {/* Race progress */}
                <h2 className="text-xl font-semibold text-center m-4">Race Progress</h2>
                <div className="mb-3 flex items-center gap-2">
                    <label htmlFor="max-laps" className="text-sm text-gray-300">Max laps</label>
                    <select
                        id="max-laps"
                        value={maxLaps}
                        onChange={(event) => onMaxLapsChange?.(Number(event.target.value))}
                        className="rounded-md border border-slate-600 bg-[#162133] px-3 py-1 text-sm text-white"
                    >
                        {maxLapOptions.map((option) => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                </div>
                <div>
                    {laps.map((lap, idx) => (
                        <div key={idx}>
                        Lap {idx + 1}: {Math.floor(lap / 60)}:{('0' + (lap % 60)).slice(-2)} s
                        </div>
                    ))}
                    </div>
                <div>Current Lap Time: {currentLapTime}</div>
            </div>
            {canControl && (
                <div className="rounded-xl border border-slate-700/60 bg-[#0D1526] p-4 flex flex-col items-center gap-3 shadow-[0_18px_40px_rgba(2,6,23,0.45)] m-1 min-w-0">
                    <button onClick={onStart} className="w-full rounded-lg border border-cyan-400/20 bg-[#162133] px-4 py-2 text-sm font-bold text-cyan-200">Start</button>
                    <button onClick={onPauseToggle} className="w-full rounded-lg border border-amber-400/20 bg-[#162133] px-4 py-2 text-sm text-amber-200">{isPaused ? 'Resume' : 'Pause'}</button>
                    <button
                        onClick={onNewLap}
                        disabled={!canCreateNewLap}
                        className={`w-full rounded-lg px-4 py-2 text-sm ${canCreateNewLap ? 'border border-slate-600 bg-[#162133] text-white' : 'bg-[#101827] text-gray-500 cursor-not-allowed'}`}
                    >
                        New Lap
                    </button>
                    <button
                        onClick={onDeleteLastLap}
                        disabled={!canDeleteLastLap}
                        className={`w-full rounded-lg px-4 py-2 text-sm ${canDeleteLastLap ? 'border border-rose-400/20 bg-[#162133] text-rose-200' : 'bg-[#101827] text-gray-500 cursor-not-allowed'}`}
                    >
                        Delete Last Lap
                    </button>
                    <button onClick={onReset} className="w-full rounded-lg border border-slate-600 bg-[#162133] px-4 py-2 text-sm text-white">Reset</button>
                    <button onClick={onSave} className="w-full rounded-lg border border-slate-600 bg-[#162133] px-4 py-2 text-sm text-white">Save</button>
                    <button onClick={onNewConfig} className="w-full rounded-lg border border-slate-600 bg-[#162133] px-4 py-2 text-sm text-white">Config car</button>
                    <button onClick={onNewMssage} className="w-full rounded-lg border border-slate-600 bg-[#162133] px-4 py-2 text-sm text-white">Send message</button>
                    <button
                        onClick={onToggleIngestion}
                        disabled={ingestionLoading}
                        className={`px-4 py-2 rounded-lg w-full text-sm font-semibold ${ingestionEnabled ? 'bg-green-600 text-white' : 'bg-red-600 text-white'} ${ingestionLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                        DB: {ingestionEnabled ? 'ON' : 'OFF'}
                    </button>
                </div>
            )}
        </div>
    )
}

export default RaceStats;
