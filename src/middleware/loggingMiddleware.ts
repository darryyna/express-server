import { Request, Response, NextFunction } from 'express';

export const loggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    next();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`LOG: ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    });
};