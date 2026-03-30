import { fetchWeatherApi } from "openmeteo";

const roundToMaxTwoDecimals = (value) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return value;
  }

  return Number(numericValue.toFixed(2));
};

const range = (start, stop, step) =>
  Array.from({ length: Math.max(0, (stop - start) / step) }, (_, index) => start + index * step);

const buildHourlySeries = (hourly, variableIndex) => {
  const timestamps = range(Number(hourly.time()), Number(hourly.timeEnd()), hourly.interval());
  const values = hourly.variables(variableIndex)?.valuesArray() ?? [];

  return timestamps.map((timestamp, index) => ({
    timestamp,
    isoTime: new Date(timestamp * 1000).toISOString(),
    value: values[index],
  }));
};

const getEntriesWithinNextHours = (series, fromTimestampSeconds, hoursAhead) => {
  const endTimestampSeconds = fromTimestampSeconds + hoursAhead * 60 * 60;

  return series.filter(({ timestamp, value }) =>
    Number.isFinite(timestamp) &&
    timestamp >= fromTimestampSeconds &&
    timestamp <= endTimestampSeconds &&
    Number.isFinite(Number(value))
  );
};

const getFirstEntryWithinNextHours = (series, fromTimestampSeconds, hoursAhead) =>
  getEntriesWithinNextHours(series, fromTimestampSeconds, hoursAhead)[0] ?? null;

const getMaxEntryWithinNextHours = (series, fromTimestampSeconds, hoursAhead) => {
  const entries = getEntriesWithinNextHours(series, fromTimestampSeconds, hoursAhead);

  if (!entries.length) {
    return null;
  }

  return entries.reduce((maxEntry, entry) =>
    Number(entry.value) > Number(maxEntry.value) ? entry : maxEntry
  );
};

const DEFAULT_PARAMS = {
  latitude: 39.79215,
  longitude: -86.23871,
  current: ["temperature_2m", "relative_humidity_2m", "weather_code"],
  hourly: ["precipitation_probability", "visibility"],
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
  const hourly = response.hourly();
  const currentTimestampSeconds = Number(current.time());
  const precipitationProbabilitySeries = hourly ? buildHourlySeries(hourly, 0) : [];
  const visibilitySeries = hourly ? buildHourlySeries(hourly, 1) : [];
  const precipitationProbabilityEntry = getMaxEntryWithinNextHours(
    precipitationProbabilitySeries,
    currentTimestampSeconds,
    2
  );
  const visibilityEntry = getFirstEntryWithinNextHours(visibilitySeries, currentTimestampSeconds, 2);

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
      precipitation_probability: precipitationProbabilityEntry
        ? roundToMaxTwoDecimals(precipitationProbabilityEntry.value)
        : null,
      precipitation_probability_time: precipitationProbabilityEntry?.isoTime ?? null,
      visibility: visibilityEntry ? roundToMaxTwoDecimals(visibilityEntry.value) : null,
      visibility_time: visibilityEntry?.isoTime ?? null,
    },
  };
};
