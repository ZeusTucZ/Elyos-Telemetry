import { fetchWeatherApi } from "openmeteo";

const params = {
	latitude: 20.737958,
	longitude: -103.4569,
	hourly: ["temperature_2m", "relative_humidity_2m", "precipitation_probability", "visibility", "weather_code"],
	current: ["temperature_2m", "relative_humidity_2m", "weather_code"],
	timezone: "auto",
	forecast_days: 1,
};
const url = "https://api.open-meteo.com/v1/forecast";
const responses = await fetchWeatherApi(url, params);

// Process first location. Add a for-loop for multiple locations or weather models
const response = responses[0];

// Attributes for timezone and location
const latitude = response.latitude();
const longitude = response.longitude();
const elevation = response.elevation();
const timezone = response.timezone();
const timezoneAbbreviation = response.timezoneAbbreviation();
const utcOffsetSeconds = response.utcOffsetSeconds();

console.log(
	`\nCoordinates: ${latitude}°N ${longitude}°E`,
	`\nElevation: ${elevation}m asl`,
	`\nTimezone: ${timezone} ${timezoneAbbreviation}`,
	`\nTimezone difference to GMT+0: ${utcOffsetSeconds}s`,
);

const current = response.current();
const hourly = response.hourly();

// Note: The order of weather variables in the URL query and the indices below need to match!
const weatherData = {
	current: {
		time: new Date((Number(current.time()) + utcOffsetSeconds) * 1000),
		temperature_2m: current.variables(0).value(),
		relative_humidity_2m: current.variables(1).value(),
		weather_code: current.variables(2).value(),
	},
	hourly: {
		time: Array.from(
			{ length: (Number(hourly.timeEnd()) - Number(hourly.time())) / hourly.interval() }, 
			(_ , i) => new Date((Number(hourly.time()) + i * hourly.interval() + utcOffsetSeconds) * 1000)
		),
		temperature_2m: hourly.variables(0).valuesArray(),
		relative_humidity_2m: hourly.variables(1).valuesArray(),
		precipitation_probability: hourly.variables(2).valuesArray(),
		visibility: hourly.variables(3).valuesArray(),
		weather_code: hourly.variables(4).valuesArray(),
	},
};

// The 'weatherData' object now contains a simple structure, with arrays of datetimes and weather information
console.log(
	`\nCurrent time: ${weatherData.current.time}\n`,
	`\nCurrent temperature_2m: ${weatherData.current.temperature_2m}`,
	`\nCurrent relative_humidity_2m: ${weatherData.current.relative_humidity_2m}`,
	`\nCurrent weather_code: ${weatherData.current.weather_code}`,
);
console.log("\nHourly data:\n", weatherData.hourly)

const formattedData = {
    metadata: {
        latitude,
        longitude,
        elevation,
        timezone,
        timezoneAbbreviation
    },
    current: weatherData.current,
    // Combinamos los arrays de hourly en un solo array de objetos
    hourly: weatherData.hourly.time.map((t, i) => ({
        time: t,
        temperature_2m: weatherData.hourly.temperature_2m[i],
        relative_humidity_2m: weatherData.hourly.relative_humidity_2m[i],
        precipitation_probability: weatherData.hourly.precipitation_probability[i],
        visibility: weatherData.hourly.visibility[i],
        weather_code: weatherData.hourly.weather_code[i]
    }))
};

async function sendWeatherToBackend(dataToSend) {
    try {
        const res = await fetch('http://localhost:8080/api/record/weather', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ weather: dataToSend }), 
        });

        if (!res.ok) {
            const errBody = await res.json();
            throw new Error(`Error ${res.status}: ${errBody.msg || 'Error desconocido'}`);
        }

        const result = await res.json();
        console.log('Success! Weather stored in backend:', result.status);
    } catch (error) {
        console.error('Error sending weather to backend:', error.message);
    }
}

// Ejecutamos el envío
await sendWeatherToBackend(formattedData);