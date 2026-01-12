import dotenv from 'dotenv';

dotenv.config({ path: '../env/.env' });

// Check who's admin to control the buttons
export const checkControl = async (req, res) => {
    try {
        const canControl = process.env.CONTROLLER_TOKEN === 'administrador';

        res.json({
            canControl: canControl
        })
    } catch (err) {
        res.status(500).json({ error: 'Error checking authentication' })
    }
}