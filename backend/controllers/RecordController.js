import express from 'express';
import { setIsRunning, getIsRunning } from '../isRunning.js';
import pool from '../config/dbConfig.js';
import buildLecturesXlsxBuffer from '../excel/export.js';

// Start recording
export const startRecording = async (req, res) => {
    setIsRunning(true);
    res.json({ message: 'Recording started' });
};

// Stop recording
export const stopRecording = async (req, res) => {
    setIsRunning(false);
    res.json({ message: 'Recording stopped' });
};

// Status recording
export const statusRecording = async (req, res) => {
    res.json({ isRunning: getIsRunning() });
};

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