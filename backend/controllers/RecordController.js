import express from 'express';
import { setIsRunning, getIsRunning } from '../isRunning.js';

// Start recording
export const startRecording = async (req, res) => {
    setIsRunning(true);
    res.json({ message: 'Recording started' });
};

// Stop recording
export const stopRecording = (req, res) => {
    setIsRunning(false);
    res.json({ message: 'Recording stopped' });
};

// Status recording
export const statusRecording = (req, res) => {
    res.json({ isRunning: getIsRunning() });
};