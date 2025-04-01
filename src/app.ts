import express, { Express, Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { AppDataSource } from './data-source';
import userRoutes from './route/userRoute';

const app: Express = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.use('/api/users', userRoutes);

const errorHandler: ErrorRequestHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
    console.error(err.stack);
    res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
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
