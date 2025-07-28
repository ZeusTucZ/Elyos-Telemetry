import { Router } from 'express';
import {
    startRecording,
    stopRecording,
    statusRecording
} from '../controllers/RecordController.js';

const router = Router();

// Start recording
router.post('/start', startRecording);

// Stop recording
router.post('/pause', stopRecording);

// Status recording
router.get('/status', statusRecording);

export default router;