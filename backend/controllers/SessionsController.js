import pool from '../config/dbConfig.js';

const toNull = (v) => v !== undefined ? v : null;

// Create session
export const createSession = async (req, res) => {
    const {
        pilot_id,
        duration,
        description,
        session_type,
        session_group_id,
        run_number
    } = req.body;

    const normalizedSessionType = session_type ?? 'real';
    if (!['test', 'real'].includes(normalizedSessionType)) {
        return res.status(400).json({ error: 'session_type must be either "test" or "real"' });
    }

    let normalizedRunNumber = null;
    if (run_number !== undefined && run_number !== null && run_number !== '') {
        const parsedRunNumber = Number(run_number);
        if (!Number.isInteger(parsedRunNumber) || parsedRunNumber <= 0) {
            return res.status(400).json({ error: 'run_number must be a positive integer' });
        }
        normalizedRunNumber = parsedRunNumber;
    }

    try {
        const result = await pool.query(
            `INSERT INTO sessions (
                pilot_id,
                date,
                duration,
                description,
                session_type,
                session_group_id,
                run_number
            ) VALUES (
             $1, NOW(), $2, $3, $4, $5, $6
            ) RETURNING *`,
            [
                toNull(pilot_id),
                toNull(duration),
                toNull(description),
                normalizedSessionType,
                toNull(session_group_id),
                normalizedRunNumber
            ]
        )

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Error creating session' });
    }
};

// Get all session
export const getAllSessions = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM sessions ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Error retrieving sessions' });
    }
};

// Get session by ID
export const getSessionById = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            `SELECT * FROM sessions WHERE id = $1`,
            [id]
        )

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Error retrieving session by id' });
    }
};

// Delete session
export const deleteSession = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            `DELETE FROM sessions WHERE id = $1 RETURNING *`,
            [id]
        )

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Error deleting the session' });
    }
}
