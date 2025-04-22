import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { UserRole} from "../model/User";
import * as dotenv from 'dotenv';
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
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];

    if (token == null) {
        return res.status(401).json({ message: 'Authentication token is required' });
    }

    jwt.verify(token, jwtSecret, (err, userPayload) => {
        if (err) {
            console.error('JWT verification error:', err.message);
            return res.status(403).json({ message: 'Invalid or expired token' });
        }

        req.user = userPayload as { id: number; email: string; role: UserRole };

        next();
    });
};

export const authorizeRoles = (...allowedRoles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ message: 'User not authenticated' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Forbidden: Insufficient permissions' });
        }

        next();
    };
};