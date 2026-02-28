// Check who's admin to control the buttons
export const checkControl = async (req, res) => {
    const authHeader = req.headers['authorization'];
    const bearerToken = authHeader && authHeader.split(' ')[1];
    const queryToken = typeof req.query.token === 'string' ? req.query.token : undefined;

    const token = (bearerToken || queryToken || '').trim();
    const controllerToken = (process.env.CONTROLLER_TOKEN || '').trim();

    // Comparamos el token que envió el navegador con el del .env
    if (token && controllerToken && token === controllerToken) {
        res.json({ canControl: true });
    } else {
        res.json({ canControl: false });
    }
}
