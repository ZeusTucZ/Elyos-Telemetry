

export default function DashboardPage() {
    return (
        <>
            <div className="h-[83vh] flex flex-row">
                <div className="basis-[60%] bg-[#20233d] m-2 rounded-xl flex flex-col">
                    {/* Left square */}
                    <div className="basis-[50%] m-2 flex flex-row">
                        {/* The following contains the speedometer and the performance data */}
                        <div className="bg-white basis-[65%] rounded-xl m-1">
                            {/* Speedometer */}
                        </div>
                        <div className="bg-white basis-[35%] rounded-xl m-1">
                            {/* Performance data */}
                        </div>
                    </div>

                    <div className="basis-[50%] m-2 rounded-xl flex flex-row">
                        {/* The following contains the consumption stats and the IMU data */}
                        <div className="basis-[65%] bg-white rounded-xl m-1">
                            {/* Consumption Stats */}
                        </div>
                        <div className="basis-[35%] bg-white rounded-xl m-1">
                            {/* IMU data */}
                        </div>
                    </div>
                </div>

                <div className="basis-[40%] bg-[#20233d] m-2 rounded-xl flex flex-col">
                    {/* Right square */}
                    <div className="basis-[50%] m-2 rounded-xl bg-white">
                        {/* GPS Map */}
                    </div>
                    <div className="basis-[50%] m-2 rounded-xl bg-white">
                        {/* Time and race control */}
                    </div>
                </div>
            </div>
        </>
    );
}