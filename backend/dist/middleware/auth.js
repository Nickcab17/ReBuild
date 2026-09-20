import jwt from 'jsonwebtoken';
import { config } from '../config.js';
export function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Token de autenticación requerido.' });
    }
    try {
        const token = header.replace('Bearer ', '');
        const payload = jwt.verify(token, config.jwtSecret);
        req.user = payload;
        next();
    }
    catch {
        return res.status(401).json({ message: 'Token inválido o expirado.' });
    }
}
