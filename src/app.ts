import "reflect-metadata";
import express, { Express, Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import * as http from 'http';
import { Server, Socket } from 'socket.io';
import { AppDataSource } from './data-source';
import userRoutes from './route/userRoute';
import authRoutes from "./route/authRoutes";

import * as dotenv from 'dotenv';
import cookieParser from "cookie-parser";
import jwt from 'jsonwebtoken';
import path from 'path';
import { loggingMiddleware } from "./middleware/loggingMiddleware";
import { verifyToken } from "./middleware/authMiddleware";
import { UserService } from "./service/userService";
import { MessageService } from "./service/MessageService";
import {UserRole} from "./model/User";


dotenv.config();

const app: Express = express();
const server = http.createServer(app);
const port = process.env.PORT;

const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL ?? "*",
        methods: ["GET", "POST"],
        credentials: true
    },
});

const userService = new UserService();
const messageService = new MessageService();

interface AuthenticatedSocket extends Socket {
    user?: { id: number; email: string; role: UserRole; firstName?: string; lastName?: string };
}

io.use(async (socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token as string;

    if (!token) {
        console.log('Socket.IO connection rejected: No token provided');
        return next(new Error('Authentication failed: No token provided.'));
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
        console.error('JWT_SECRET is not defined in environment variables');
        return next(new Error('Server configuration error. JWT secret not set.'));
    }

    try {
        const userPayload = jwt.verify(token, jwtSecret) as { id: number; email: string; role: UserRole };
        const user = await userService.getUserById(userPayload.id);
        if (!user) {
            console.log(`Socket.IO connection rejected: User not found for ID ${userPayload.id}`);
            return next(new Error('Authentication failed: User not found.'));
        }

        socket.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName
        };
        console.log(`Socket.IO user authenticated: ${user.email} (Socket ID: ${socket.id})`);

        next();
    } catch (error: any) {
        console.error('Socket.IO authentication error:', error.message);
        next(new Error('Authentication failed: Invalid or expired token.'));
    }
});

const userSockets: { [userId: number]: string[] } = {};
const socketUserMap: { [socketId: string]: number } = {};


io.on('connection', async (socket: AuthenticatedSocket) => {
    const user = socket.user;
    if (!user) {
        console.error(`Socket ID ${socket.id} connected without authenticated user?`);
        socket.disconnect(true);
        return;
    }

    const userId = user.id;
    socketUserMap[socket.id] = userId;
    if (!userSockets[userId]) {
        userSockets[userId] = [];
    }
    userSockets[userId].push(socket.id);

    console.log(`User ${user.email} connected. Total sessions: ${userSockets[userId].length}`);

    socket.join(`user_${userId}`);
    socket.join('public');
    socket.broadcast.emit('user connected', { userId: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName });

    const onlineUsersList = Object.keys(userSockets).map(id => parseInt(id, 10));
    socket.emit('online users list', onlineUsersList);
    try {
        const publicHistory = await messageService.getPublicMessages();
        socket.emit('public message history', publicHistory);
    } catch (error) {
        console.error('Error fetching public message history for new connection:', error);
        socket.emit('error', 'Failed to load public message history.');
    }

    socket.on('message', async (msg: { content: string }) => {
        if (!msg.content || msg.content.trim() === '') {
            return;
        }

        console.log(`User ${user.email} sent public message: "${msg.content}"`);

        try {
            const savedMessage = await messageService.saveMessage(userId, msg.content);
            io.to('public').emit('message', {
                id: savedMessage.id,
                content: savedMessage.content,
                timestamp: savedMessage.timestamp,
                sender: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email } // Відправляємо лише безпечні дані користувача
            });
        } catch (error) {
            console.error('Error saving or broadcasting public message:', error);
            socket.emit('error', 'Failed to send message.');
        }
    });

    socket.on('private message', async (msg: { recipientId: number, content: string }) => {
        if (!msg.content || msg.content.trim() === '' || !msg.recipientId) {
            console.warn(`Invalid private message from user ${user.email}:`, msg);
            return;
        }

        if (msg.recipientId === userId) {
            console.warn(`User ${user.email} attempted to send a private message to self.`);
            socket.emit('error', 'Cannot send private message to yourself.');
            return;
        }


        console.log(`User ${user.email} sending private message to user ID ${msg.recipientId}: "${msg.content}"`);

        try {
            const recipientUser = await userService.getUserById(msg.recipientId);
            if (!recipientUser) {
                console.warn(`Attempted to send private message to non-existent user ID: ${msg.recipientId} by user ${user.email}`);
                socket.emit('error', `User with ID ${msg.recipientId} not found.`);
                return;
            }

            const savedMessage = await messageService.saveMessage(userId, msg.content, msg.recipientId);

            const messageData = {
                id: savedMessage.id,
                content: savedMessage.content,
                timestamp: savedMessage.timestamp,
                sender: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email },
                recipient: { id: recipientUser.id, firstName: recipientUser.firstName, lastName: recipientUser.lastName, email: recipientUser.email },
                isPrivate: true
            };

            userSockets[userId]?.forEach(socketId => {
                io.to(socketId).emit('private message', messageData);
            });


            io.to(`user_${msg.recipientId}`).emit('private message', messageData);


        } catch (error) {
            console.error('Error saving or sending private message:', error);
            socket.emit('error', 'Failed to send private message.');
        }
    });

    socket.on('get private message history', async (data: { userId1: number, userId2: number }) => {
        if (user.id !== data.userId1 && user.id !== data.userId2) {
            console.warn(`User ${user.email} (ID ${user.id}) attempted to fetch private chat history between ${data.userId1} and ${data.userId2} they are not part of.`);
            socket.emit('error', 'Unauthorized to view this chat history.');
            return;
        }

        console.log(`User ${user.email} requesting private chat history between ${data.userId1} and ${data.userId2}`);

        try {
            const history = await messageService.getPrivateMessages(data.userId1, data.userId2);
            socket.emit('private message history', history);
        } catch (error) {
            console.error('Error fetching private message history:', error);
            socket.emit('error', 'Failed to load private message history.');
        }
    });


    socket.on('disconnect', (reason) => {
        const disconnectedUserId = socketUserMap[socket.id];

        if (disconnectedUserId) {
            userSockets[disconnectedUserId] = userSockets[disconnectedUserId]?.filter(id => id !== socket.id) || [];

            if (userSockets[disconnectedUserId].length === 0) {
                delete userSockets[disconnectedUserId];
                console.log(`User ${user.email} disconnected (all sessions closed). Socket ID: ${socket.id}. Reason: ${reason}`);
                socket.broadcast.emit('user disconnected', { userId: disconnectedUserId, email: user.email });
            } else {
                console.log(`User ${user.email} disconnected one session. Socket ID: ${socket.id}. Reason: ${reason}. Remaining sessions: ${userSockets[disconnectedUserId].length}`);
            }

            delete socketUserMap[socket.id];

        } else {
            console.log(`Socket disconnected: ${socket.id}. Reason: ${reason} (user not mapped)`);
        }

    });

    socket.on('error', (err) => {
        console.error(`Socket error for user ${user?.email || 'unknown'} (Socket ID: ${socket.id}):`, err.message);
        socket.emit('server error', 'На сервері сталася помилка, спробуйте пізніше.');
    });
});



// const apiLimiter = rateLimit({
//     windowMs: 1 * 60 * 1000, // 1 хвилина
//     max: 20, // Максимум 20 запитів на хвилину з однієї IP
//     message: 'Занадто багато запитів з цієї IP, спробуйте пізніше.',
//     standardHeaders: true,
//     legacyHeaders: false,
// });

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


app.use(express.static(path.join(__dirname, 'public')));

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
            res.clearCookie('token');
            return res.redirect('/login');
        }

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


app.get('/chat', verifyToken, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userPayload = req.user;

        if (!userPayload) {
            res.clearCookie('token');
            return res.redirect('/login');
        }

        const currentUser = await userService.getUserById(userPayload.id);

        if (!currentUser) {
            res.clearCookie('token');
            console.error(`Authenticated user ID ${userPayload.id} not found in DB for chat page.`);
            return res.redirect('/login');
        }
        const allUsers = await userService.getAllUsers();
        res.render('chat', {
            loggedInUser: {
                id: currentUser.id,
                email: currentUser.email,
                firstName: currentUser.firstName,
                lastName: currentUser.lastName,
                role: currentUser.role
            },
            allUsers: allUsers.map(u => ({
                id: u.id,
                firstName: u.firstName,
                lastName: u.lastName,
                email: u.email
            })),
            jwtToken: req.cookies.token
        });

    } catch (error) {
        console.error('Error rendering chat page:', error);
        next(error);
    }
});


//app.use('/api/', apiLimiter);
app.use(loggingMiddleware);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);


const errorHandler: ErrorRequestHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
    console.error('Global Error Handler caught:', err.stack);

    if (req.headers['accept']?.includes('text/html') && !req.originalUrl.startsWith('/api')) {
        if (!res.headersSent) {
            res.status(500).render('errorPage', { message: 'Internal Server Error', error: process.env.NODE_ENV === 'development' ? err : {} });
        } else {
            res.end();
        }

    } else {
        const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
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
        server.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });
    })
    .catch((error) => {
        console.error('Database connection error: ', error);
        process.exit(1);
    });