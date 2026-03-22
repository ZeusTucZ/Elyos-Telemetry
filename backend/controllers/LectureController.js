import pool from '../config/dbConfig.js';
import { getCurrentLapNumber } from '../raceStateStore.js';
import { getIngestionEnabled } from '../dataIngestion.js';
import { getIsRunning } from '../isRunning.js';
import { getLatestLecture, setLatestLecture } from '../liveTelemetryStore.js';
import { getCurrentSessionId } from '../currentSessionStore.js';
import { addConsumptionSample, getTotalConsumption } from '../totalConsumptionStore.js';
import { emitSocketEvent } from '../socketBus.js';

const toNull = (v) => v !== undefined ? v : null;

export const getAllLectures = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM lectures ORDER BY timestamp');
    const dbLectures = result.rows;
    const latestLiveLecture = getLatestLecture();

    if (!latestLiveLecture) {
      return res.json(dbLectures);
    }

    if (dbLectures.length === 0) {
      return res.json([latestLiveLecture]);
    }

    const latestDbLecture = dbLectures[dbLectures.length - 1];
    if (
      latestLiveLecture.id !== null &&
      latestLiveLecture.id !== undefined &&
      latestDbLecture.id === latestLiveLecture.id
    ) {
      return res.json(dbLectures);
    }

    res.json([...dbLectures, latestLiveLecture]);
  } catch (err) {
    res.status(500).json({ error: `Error retrieving lectures: ${err}` });
  }
};

export const getBySessionId = async (req, res) => {
  const { sessionId } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM lectures WHERE session_id = $1 ORDER BY timestamp',
      [sessionId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error retrieving lectures by session' });
  }
};

export const getLectureById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM lectures WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Lecture not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error retrieving lecture by ID' });
  }
};

export const createLecture = async (req, res) => {
  const {
    session_id,
    lap_number,
    timestamp,
    voltage_battery,
    current,
    latitude,
    longitude,
    acceleration_x,
    acceleration_y,
    acceleration_z,
    orientation_x,
    orientation_y,
    orientation_z,
    rpm_motor,
    velocity_x,
    velocity_y,
    ambient_temp,
    steering_direction,
    altitude_m,
    num_sats,
    air_speed,
    accelPct
  } = req.body;

  let normalizedTimestamp = null;
  if (timestamp !== undefined && timestamp !== null && timestamp !== '') {
    const parsedTimestamp = new Date(timestamp);
    if (Number.isNaN(parsedTimestamp.getTime())) {
      return res.status(400).json({ error: 'timestamp must be a valid ISO date value' });
    }
    normalizedTimestamp = parsedTimestamp.toISOString();
  }

  let normalizedLapNumber = getCurrentLapNumber();
  if (lap_number !== undefined && lap_number !== null && lap_number !== '') {
    const parsedLapNumber = Number(lap_number);
    if (!Number.isInteger(parsedLapNumber) || parsedLapNumber <= 0) {
      return res.status(400).json({ error: 'lap_number must be a positive integer' });
    }
    normalizedLapNumber = parsedLapNumber;
  }

  const normalizedSessionId = toNull(session_id ?? getCurrentSessionId());
  const normalizedTotalConsumption = getIsRunning()
    ? addConsumptionSample({
        voltage: voltage_battery,
        current,
        dtSeconds: 1
      })
    : getTotalConsumption();

  const serverReceivedAtMs = Date.now();
  const liveLecture = {
    id: null,
    session_id: normalizedSessionId,
    lap_number: normalizedLapNumber,
    timestamp: normalizedTimestamp,
    voltage_battery: toNull(voltage_battery),
    current: toNull(current),
    latitude: toNull(latitude),
    longitude: toNull(longitude),
    acceleration_x: toNull(acceleration_x),
    acceleration_y: toNull(acceleration_y),
    acceleration_z: toNull(acceleration_z),
    orientation_x: toNull(orientation_x),
    orientation_y: toNull(orientation_y),
    orientation_z: toNull(orientation_z),
    rpm_motor: toNull(rpm_motor),
    velocity_x: toNull(velocity_x),
    velocity_y: toNull(velocity_y),
    ambient_temp: toNull(ambient_temp),
    steering_direction: toNull(steering_direction),
    altitude_m: toNull(altitude_m),
    num_sats: toNull(num_sats),
    air_speed: toNull(air_speed),
    accelPct: toNull(accelPct),
    total_consumption: toNull(normalizedTotalConsumption),

    server_received_at_ms: serverReceivedAtMs
  };

  setLatestLecture(liveLecture);

  if (!getIngestionEnabled() || !getIsRunning()) {
    emitSocketEvent("telemetry:new-lecture", liveLecture);

    return res.status(200).json({
      message: 'Lecture accepted for live mode (not persisted)',
      persisted: false,
      lecture: liveLecture
    });
  }


  try {
    const result = await pool.query(
      `INSERT INTO lectures (
        session_id, lap_number, timestamp, voltage_battery, current, latitude, longitude,
        acceleration_x, acceleration_y, acceleration_z,
        orientation_x, orientation_y, orientation_z,
        rpm_motor, velocity_x, velocity_y, ambient_temp, steering_direction,
        altitude_m, num_sats, air_speed, accelPct, total_consumption
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10,
        $11, $12, $13,
        $14, $15, $16, $17, $18,
        $19, $20, $21, $22, $23
      ) RETURNING *`,
      [
        normalizedSessionId, normalizedLapNumber, normalizedTimestamp, toNull(voltage_battery), toNull(current), toNull(latitude), toNull(longitude),
        toNull(acceleration_x), toNull(acceleration_y), toNull(acceleration_z),
        toNull(orientation_x), toNull(orientation_y), toNull(orientation_z),
        toNull(rpm_motor), toNull(velocity_x), toNull(velocity_y), toNull(ambient_temp), toNull(steering_direction),
        toNull(altitude_m), toNull(num_sats), toNull(air_speed), toNull(accelPct), normalizedTotalConsumption
      ]
    );

    const persistedLectures = {
      ...result.rows[0],
      server_received_at_ms: serverReceivedAtMs
    };

    setLatestLecture(persistedLectures);
    emitSocketEvent("telemetry:new-lecture", persistedLectures);
    res.status(201).json(persistedLectures);
    
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creating lecture' });
  }
};
