import React from "react";
import ReactSpeedometer from "react-d3-speedometer";

const Speedometer = ({ value = 40, maxValue = 80 }) => {
    return (
        <ReactSpeedometer 
            value={value}
            maxValue={maxValue}
            segments={5}
            needleColor="white"
            startColor="#374151"
            endColor="#dc2626"
            textColor="white"
            ringWidth={30}
            height={200}
            width={300}
            currentValueText={`${value} km/h`}

        />
    );
}

export default Speedometer;