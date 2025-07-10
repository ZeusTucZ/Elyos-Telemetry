const express = require("express");
const app = express();
const PORT = 5050;

const cors = require("cors");
app.use(cors());

// Simulated variables
let currentSpeed = 0;
let current = 0;
let voltage = 0;
let rpms = 0;
let totalConsumption = 0;
let efficiency = 0;
let distance = 0;

let roll = 0;
let pitch = 0;
let yaw = 0;
let accel_x = 0;
let accel_y = 0;
let accel_z = 0;

// Posición inicial: Guadalajara
let latitude = 20.6597;
let longitude = -103.3496;

const dataLectures = [];

setInterval(() => {
  currentSpeed = Math.floor(Math.random() * 81); // km/h
  current = +(Math.random() * 50).toFixed(2);
  voltage = +(Math.random() * 24 + 36).toFixed(2);
  rpms = Math.floor(Math.random() * 6000);
  totalConsumption += (current * voltage) / 1000;
  efficiency = +(Math.random() * 6 + 2).toFixed(2);
  distance += currentSpeed / 3600;

  // IMU data
  roll = +(Math.random() * 360 - 180).toFixed(2);
  pitch = +(Math.random() * 180 - 90).toFixed(2);
  yaw = +(Math.random() * 360 - 180).toFixed(2);
  accel_x = +(Math.random() * 2 - 1).toFixed(3);
  accel_y = +(Math.random() * 2 - 1).toFixed(3);
  accel_z = +(Math.random() * 2 - 1).toFixed(3);

  // Simulación de coordenadas
  const metersPerSecond = currentSpeed / 3.6;
  const movement = metersPerSecond / 111000; // grados por segundo (~lat/lng)

  // Desplazamiento suave en dirección aleatoria (norte-sur, este-oeste)
  const angle = Math.random() * 2 * Math.PI;
  latitude += movement * Math.cos(angle);
  longitude += movement * Math.sin(angle);

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
    position: {
      lat: +latitude.toFixed(6),
      lng: +longitude.toFixed(6),
    },
  };

  dataLectures.push(newData);
}, 1000);

app.get("/", (req, res) => {
  res.json(dataLectures);
});

app.listen(PORT, () => {
  console.log(`Simulated data is running on http://localhost:${PORT}`);
});
