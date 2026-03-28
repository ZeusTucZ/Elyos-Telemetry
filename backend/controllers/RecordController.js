import { setIsRunning, getIsRunning } from '../isRunning.js';
import { getCurrentLapNumber } from '../raceStateStore.js';
import { getIngestionEnabled, setIngestionEnabled } from '../dataIngestion.js';
import pool from '../config/dbConfig.js';
import buildLecturesXlsxBuffer from '../excel/export.js';
import {
    getCurrentSessionId,
    setCurrentSessionId,
    clearCurrentSessionId
} from '../currentSessionStore.js';
import { resetTotalConsumption } from '../totalConsumptionStore.js';
import {
    clearRecordingStartTime,
    getRecordingStartTime,
    setRecordingStartTime
} from '../recordingTimeStore.js';
import { buildCurrentWeatherPayload } from '../services/weatherService.js';

let lastMessage = "";
let lastWeather = null;

// Start recording
export const startRecording = async (req, res) => {
    const { session_id } = req.body ?? {};

    if (session_id !== undefined && session_id !== null && session_id !== '') {
        const parsedSessionId = Number(session_id);
        if (!Number.isInteger(parsedSessionId) || parsedSessionId <= 0) {
            return res.status(400).json({ error: 'session_id must be a positive integer' });
        }

        setCurrentSessionId(parsedSessionId);
    }

    resetTotalConsumption();
    setIsRunning(true);
    setRecordingStartTime(Date.now());
    res.json({
        message: 'Recording started',
        session_id: getCurrentSessionId(),
        recording_start_time_ms: getRecordingStartTime()
    });
};

// Stop recording
export const stopRecording = async (req, res) => {
    const { clearSession = false } = req.body ?? {};

    setIsRunning(false);
    resetTotalConsumption();
    clearRecordingStartTime();
    if (clearSession) {
        clearCurrentSessionId();
    }

    res.json({ message: 'Recording stopped', session_id: getCurrentSessionId() });
};

// Status recording
export const statusRecording = async (req, res) => {
    res.json({
        isRunning: getIsRunning(),
        session_id: getCurrentSessionId(),
        currentLap: getCurrentLapNumber(),
        recording_start_time_ms: getRecordingStartTime()
    });
};

// Ingestion status
export const ingestionStatus = async (req, res) => {
    res.json({ ingestionEnabled: getIngestionEnabled() });
};

// Toggle ingestion
export const setIngestionStatus = async (req, res) => {
    const { ingestionEnabled } = req.body;

    if (typeof ingestionEnabled !== 'boolean') {
        return res.status(400).json({ error: 'ingestionEnabled must be a boolean' });
    }

    setIngestionEnabled(ingestionEnabled);
    res.json({ ingestionEnabled: getIngestionEnabled() });
};

// Create a new lap
export const createNewLap = async (req, res) => {
    if (!getIsRunning()) {
        return res.status(409).json({ error: 'Cannot create a new lap while recording is stopped' });
    }

    // The lap increment is handled by Socket.IO "NEW_LAP" action in server.js.
    res.status(200).json({ message: 'New lap accepted' });
};

// Send message
export const sendMessage = async (req, res) => {
    const { message } = req.body;

    console.log("Received message: " + message);

    lastMessage = message;

    res.status(200).json({ 
    status: 'success', 
    msg: 'Mensaje registrado correctamente',
    data: message 
  });
}

// Get message
export const getMessage = async (req, res) => {
    res.status(200).json({ 
    message: lastMessage,
  });
}

// Save recording
export const saveRecording = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM lectures');
        const lectures = result.rows;
        const buffer = buildLecturesXlsxBuffer(lectures);

        res.set({
        'Content-Type':
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="lectures.xlsx"',
        'Content-Length': buffer.length,
        'Cache-Control': 'no-store',
        });
        res.send(buffer);
    } catch (err) {
        next(err);
    }
};

export const postWeather = async (req, res) => {
    try {
        // El destructuring busca req.body.weather
        const { weather } = req.body;

        if (!weather) {
            return res.status(400).json({
                status: 'error',
                msg: 'No weather data provided in request body'
            });
        }

        console.log("Weather received and stored successfully");
        lastWeather = weather;

        res.status(200).json({ 
            status: 'success', 
            msg: 'Clima registrado correctamente',
            data: lastWeather 
        });
    } catch (error) {
        console.error("Error in postWeather:", error);
        res.status(500).json({ status: 'error', msg: error.message });
    }
};

export const getWeather = async (req, res) => {
    try {
        if (!lastWeather) {
            return res.status(404).json({
                status: 'error',
                msg: 'There is no weather data'
            });
        }
        res.status(200).json({ status: 'success', data: lastWeather });
    } catch (error) {
        res.status(500).json({ status: 'error', msg: error.message });
    }
};

export const fetchAndStoreCurrentWeather = async (req, res) => {
    try {
        const latitude = Number(req.body?.latitude);
        const longitude = Number(req.body?.longitude);

        const weather = await buildCurrentWeatherPayload({
            latitude: Number.isFinite(latitude) ? latitude : undefined,
            longitude: Number.isFinite(longitude) ? longitude : undefined
        });

        lastWeather = weather;

        res.status(200).json({
            status: 'success',
            msg: 'Current weather fetched and stored',
            data: lastWeather
        });
    } catch (error) {
        console.error('Error in fetchAndStoreCurrentWeather:', error);
        res.status(500).json({ status: 'error', msg: error.message });
    }
};
