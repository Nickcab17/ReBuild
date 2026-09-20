import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export interface AuthRequest extends Request {
  user?: { userId: string; email: string };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token de autenticación requerido.' });
  }

  try {
    const token = header.replace('Bearer ', '');
    const payload = jwt.verify(token, config.jwtSecret) as { userId: string; email: string };
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ message: 'Token inválido o expirado.' });
  }
}
