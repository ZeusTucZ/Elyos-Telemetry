import { buildCurrentWeatherPayload } from "./services/weatherService.js";

const formattedData = await buildCurrentWeatherPayload();
const BACKEND_ORIGIN = (process.env.BACKEND_ORIGIN || "https://elyos-telemetry-exylp.ondigitalocean.app/elyos-telemetry-backend").replace(/\/+$/, "");
const BACKEND_BASE_PATH = (process.env.BACKEND_BASE_PATH || "").replace(/\/+$/, "");
const WEATHER_ENDPOINT = `${BACKEND_ORIGIN}${BACKEND_BASE_PATH}/api/record/weather`;

console.log("Current weather data:\n", formattedData);

async function sendWeatherToBackend(dataToSend) {
  try {
    const res = await fetch(WEATHER_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weather: dataToSend }),
    });

    if (!res.ok) {
      const errBody = await res.json();
      throw new Error(`Error ${res.status}: ${errBody.msg || "Unknown error"}`);
    }

    const result = await res.json();
    console.log("Success! Weather stored in backend:", result.status);
  } catch (error) {
    console.error("Error sending weather to backend:", error.message);
  }
}

await sendWeatherToBackend(formattedData);
