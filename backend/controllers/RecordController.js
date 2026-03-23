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

let lastMessage = "";

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
