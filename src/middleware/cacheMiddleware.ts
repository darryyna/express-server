import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';


const redisClient = new Redis({
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT ?? '6379')
});

redisClient.on('connect', () => console.log('Redis client connected'));
redisClient.on('error', (err) => console.error('Redis client error:', err));


export const cacheMiddleware = (duration: number) => { // duration - час кешування в секундах
    return async (req: Request, res: Response, next: NextFunction) => {
        const key = req.originalUrl;
        try {
            const cachedData = await redisClient.get(key);

            if (cachedData) {
                console.log(`Cache HIT for ${key}`);
                res.setHeader('X-Cache', 'HIT');
                return res.status(200).json(JSON.parse(cachedData));
            } else {
                console.log(`Cache MISS for ${key}`);
                res.setHeader('X-Cache', 'MISS');
                const originalJson = res.json;
                res.json = function (this: Response, body?: any) {
                    if (this.statusCode >= 200 && this.statusCode < 300) {
                        redisClient.set(key, JSON.stringify(body), 'EX', duration)
                            .catch(cacheError => console.error('Error setting cache:', cacheError));
                    }
                    return originalJson.call(this, body);
                }

                next();
            }
        } catch (error) {
            console.error('Redis cache error:', error);
            next();
        }
    };
};
