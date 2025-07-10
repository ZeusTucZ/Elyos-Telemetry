const express = require("express");
const app = express();
const PORT = 5050;

// Cors let you interact with other origins (frontend)
const cors = require("cors");
app.use(cors());

// Simulated variables
currentSpeed = 0;
current = 0;
voltage = 0;
rpms = 0;
totalConsumption = 0;
efficiency = 0;
distance = 0;

let roll = 0;
let pitch = 0;
let yaw = 0;
let accel_x = 0;
let accel_y = 0;
let accel_z = 0;

// Simulated data
dataLectures = []

// Simulate the data each second
setInterval(() => {
    currentSpeed = Math.floor(Math.random() * 81);
    current = +(Math.random() * 50).toFixed(2);
    voltage = +(Math.random() * 24 + 36).toFixed(2);
    rpms = Math.floor(Math.random() * 6000);
    totalConsumption += current * voltage / 1000;
    efficiency = +(Math.random() * 6 + 2).toFixed(2);
    distance += currentSpeed / 3600;

    // Simulate IMU data
    roll = +(Math.random() * 360 - 180).toFixed(2);       // Rango: -180 a 180
    pitch = +(Math.random() * 180 - 90).toFixed(2);        // Rango: -90 a 90
    yaw = +(Math.random() * 360 - 180).toFixed(2);         // Rango: -180 a 180
    accel_x = +(Math.random() * 2 - 1).toFixed(3);         // Rango: -1 a 1 (g)
    accel_y = +(Math.random() * 2 - 1).toFixed(3);
    accel_z = +(Math.random() * 2 - 1).toFixed(3);

    const newData = {
        timestamp: new Date().toISOString(),
        speed: currentSpeed,
        current,
        voltage,
        rpms,
        totalConsumption: +totalConsumption.toFixed(2),
        efficiency,
        distance: +distance.toFixed(2),
        roll,
        pitch,
        yaw,
        accel_x,
        accel_y,
        accel_z,
    };

    dataLectures.push(newData);
}, 1000);

// Route to obtain the actual velocity
app.get("/", (req, res) => {
    res.json(dataLectures);
});

app.listen(PORT, () => {
    console.log(`Simulated data is running on http://localhost:${PORT}`);
});