import express, { Express, Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { AppDataSource } from './data-source';
import userRoutes from './route/userRoute';
import authRoutes from "./route/authRoutes";

import * as dotenv from 'dotenv';
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import {loggingMiddleware} from "./middleware/loggingMiddleware";
import {verifyToken} from "./middleware/authMiddleware";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 20,
    message: 'Too many requests from this IP, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false,
});


app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.set('view engine', 'ejs');
app.set('views', './src/views');

app.get('/', (req: Request, res: Response) => {
    res.redirect('/login');
});

app.get('/login', (req: Request, res: Response) => {
    const message = req.cookies.loginError;
    res.clearCookie('loginError');
    res.render('login', { message });
});


app.post('/login', async (req: Request, res: Response, next: NextFunction) => {
    try {

        const { AuthController } = await import('./controller/authController');
        const authController = new AuthController();
        await authController.login(req, res, next);
    } catch (error) {
        next(error);
    }
});

app.get('/profile', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userPayload = req.user;

        if (!userPayload) {
            return res.redirect('/login');
        }

        const { UserService } = await import('./service/userService');
        const userService = new UserService();

        const user = await userService.getUserById(userPayload.id);

        if (!user) {
            res.clearCookie('token');
            return res.redirect('/login');
        }

        res.render('profile', { user });

    } catch (error) {
        next(error);
    }
});

app.post('/logout', (req: Request, res: Response) => {
    res.clearCookie('token');
    res.redirect('/login');
});


app.use('/api/', apiLimiter);
app.use(loggingMiddleware);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);


const errorHandler: ErrorRequestHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
    console.error('Global Error Handler:', err.stack);
    if (req.headers['accept']?.includes('text/html') && !req.originalUrl.startsWith('/api')) {
        res.status(500).send('Internal Server Error');

    } else {
        const statusCode = (res.statusCode && res.statusCode !== 200) ? res.statusCode : 500;
        res.status(statusCode);
        res.json({
            message: err.message || 'Internal Server Error',
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
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