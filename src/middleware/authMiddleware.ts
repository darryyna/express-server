import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { UserRole} from "../model/User";
import * as dotenv from 'dotenv';
import { JsonWebTokenError } from 'jsonwebtoken';
dotenv.config();

declare global {
    namespace Express {
        interface Request {
            user?: { id: number; email: string; role: UserRole };
        }
    }
}

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
    throw new Error('JWT_SECRET is not defined in the environment variables');
}

export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.token;
    if (!token) {
        const authHeader = req.headers['authorization'];
        const tokenFromHeader = authHeader?.split(' ')[1];

        if (!tokenFromHeader) {
            if (!req.originalUrl.startsWith('/api')) {
                res.cookie('loginError', 'Authentication required', { httpOnly: true });
                return res.redirect('/login');
            }
            return res.status(401).json({ message: 'Authentication token is required' });
        }
        jwt.verify(tokenFromHeader, jwtSecret, (err: JsonWebTokenError | null, userPayload: any) => {
            if (err) {
                console.error('JWT verification error (header):', err.message);
                return res.status(403).json({ message: 'Invalid or expired token' });
            }
            req.user = userPayload as { id: number; email: string; role: UserRole };
            next();
        });
    } else {
        jwt.verify(token, jwtSecret, (err: JsonWebTokenError | null, userPayload: any) => {
            if (err) {
                console.error('JWT verification error (cookie):', err.message);
                res.clearCookie('token');
                return res.redirect('/login');
            }
            req.user = userPayload as { id: number; email: string; role: UserRole };
            next();
        });
    }
};

export const authorizeRoles = (...allowedRoles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            if (!req.originalUrl.startsWith('/api')) {
                res.status(403).send('Forbidden: Insufficient permissions');
            } else {
                return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
            }
        }

        next();
    };
};