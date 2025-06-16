import React, { useState, useEffect } from "react";
import ReactSpeedometer from "react-d3-speedometer";

const Speedometer = ({ maxValue = 80 }) => {
    const [speed, setSpeed] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            fetch("http://localhost:5050/")
                .then((res) => res.json())
                .then((data) => {
                    if (Array.isArray(data) && data.length > 0) {
                        const latest = data[data.length - 1];
                        setSpeed(latest.speed);
                    }
                })
                .catch((err) => console.error("Error fetching speed:", err));
        }, 1000);

        return () => clearInterval(interval);
    }, []);
 
    return (
        <ReactSpeedometer 
            value={speed}
            maxValue={maxValue}
            segments={5}
            needleColor="white"
            startColor="#374151"
            endColor="#dc2626"
            textColor="white"
            ringWidth={30}
            height={200}
            width={300}
            currentValueText={`${speed} km/h`}

        />
    );
}

export default Speedometer;