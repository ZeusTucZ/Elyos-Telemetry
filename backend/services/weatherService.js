import { fetchWeatherApi } from "openmeteo";

const DEFAULT_PARAMS = {
  latitude: 20.737958,
  longitude: -103.4569,
  current: ["temperature_2m", "relative_humidity_2m", "weather_code"],
  timezone: "auto",
  forecast_days: 1,
};

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

export const buildCurrentWeatherPayload = async ({
  latitude = DEFAULT_PARAMS.latitude,
  longitude = DEFAULT_PARAMS.longitude,
} = {}) => {
  const responses = await fetchWeatherApi(OPEN_METEO_URL, {
    ...DEFAULT_PARAMS,
    latitude,
    longitude,
  });

  const response = responses[0];
  const utcOffsetSeconds = response.utcOffsetSeconds();
  const current = response.current();

  return {
    metadata: {
      latitude: response.latitude(),
      longitude: response.longitude(),
      elevation: response.elevation(),
      timezone: response.timezone(),
      timezoneAbbreviation: response.timezoneAbbreviation(),
    },
    current: {
      time: new Date((Number(current.time()) + utcOffsetSeconds) * 1000),
      temperature_2m: current.variables(0).value(),
      relative_humidity_2m: current.variables(1).value(),
      weather_code: current.variables(2).value(),
    },
  };
};
