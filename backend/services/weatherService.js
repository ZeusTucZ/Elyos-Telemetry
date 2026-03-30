import { fetchWeatherApi } from "openmeteo";

const roundToMaxTwoDecimals = (value) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return value;
  }

  return Number(numericValue.toFixed(2));
};

const DEFAULT_PARAMS = {
  latitude: 39.79215,
  longitude: -86.23871,
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
  const current = response.current();

  return {
    metadata: {
      latitude: roundToMaxTwoDecimals(response.latitude()),
      longitude: roundToMaxTwoDecimals(response.longitude()),
      elevation: roundToMaxTwoDecimals(response.elevation()),
      timezone: response.timezone(),
      timezoneAbbreviation: response.timezoneAbbreviation(),
    },
    current: {
      time: new Date(Number(current.time()) * 1000).toISOString(),
      temperature_2m: roundToMaxTwoDecimals(current.variables(0).value()),
      relative_humidity_2m: roundToMaxTwoDecimals(current.variables(1).value()),
      weather_code: roundToMaxTwoDecimals(current.variables(2).value()),
    },
  };
};
