import express, { Express, Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { AppDataSource } from './data-source';
import userRoutes from './route/userRoute';
import authRoutes from "./route/authRoutes";

import * as dotenv from 'dotenv';
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import {loggingMiddleware} from "./middleware/loggingMiddleware";

dotenv.config();

const app: Express = express();
const port = process.env.PORT;

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 хвилин
    max: 3,
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false,
});


app.use('/api/', apiLimiter);
app.use(loggingMiddleware);

app.set('view engine', 'ejs');
app.set('views', './src/views');

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);


const errorHandler: ErrorRequestHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
    console.error('Global Error Handler:', err.stack);
    const statusCode = (res.statusCode && res.statusCode !== 200) ? res.statusCode : 500;
    res.status(statusCode);


    res.json({
        message: err.message || 'Internal Server Error',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
};

app.use(errorHandler);

AppDataSource.initialize()
    .then(() => {
        console.log('Database connected successfully');
        app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });
    })
    .catch((error) => console.log('Database connection error: ', error));