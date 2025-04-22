import { Request, Response, NextFunction } from 'express';
import { UserService, RegisterUserDto } from '../service/userService';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { UserRole } from '../model/User';

export class AuthController {
    private readonly userService: UserService;
    private readonly jwtSecret: string;

    constructor() {
        this.userService = new UserService();
        this.jwtSecret = process.env.JWT_SECRET ?? 'your_super_secret_jwt_key';
        if (this.jwtSecret === 'your_super_secret_jwt_key') {
            console.warn('WARNING: JWT_SECRET is not set in environment variables. Using default key.');
        }
    }

    register = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userData: RegisterUserDto = req.body;
            const { email, firstName, lastName, age, password, role } = userData;

            if (!email || !firstName || !lastName || age === undefined || !password) {
                return res.status(400).json({ message: 'All required fields (email, firstName, lastName, age, password) must be provided' });
            }

            if (role && !Object.values(UserRole).includes(role)) {
                return res.status(400).json({ message: `Invalid role provided. Accepted roles are ${Object.values(UserRole).join(', ')}.` });
            }

            const roleToAssign = (req as any).user?.role === UserRole.Admin && role === UserRole.Admin
                ? UserRole.Admin
                : UserRole.User;


            const newUser = await this.userService.registerUser({
                email,
                firstName,
                lastName,
                age,
                password,
                role: roleToAssign
            });

            const userResponse = { ...newUser };
            delete (userResponse as any).password;

            return res.status(201).json(userResponse);
        } catch (error: any) {
            if (error.message === 'User with this email already exists') {
                return res.status(409).json({ message: error.message });
            }
            next(error);
        }
    };

    login = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({ message: 'Email and password are required' });
            }

            const user = await this.userService.findUserByEmail(email);

            if (!user) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            const passwordMatch = await bcrypt.compare(password, user.password);

            if (!passwordMatch) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            const token = jwt.sign(
                { id: user.id, email: user.email, role: user.role },
                this.jwtSecret,
                { expiresIn: '1h' } // Час життя токена
            );

            return res.status(200).json({ token });


        } catch (error) {
            next(error);
        }
    };

    getProfile = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userPayload = req.user;


            if (!userPayload) {
                return res.status(401).json({ message: 'Unauthorized' });
            }
            const user = await this.userService.getUserById(userPayload.id);

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            return res.status(200).json(user);

        } catch (error) {
            next(error);
        }
    }

    forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({ message: 'Email is required' });
            }

            const resetToken = await this.userService.generatePasswordResetToken(email);

            if (!resetToken) {
                console.warn(`Password reset requested for non-existent email: ${email}`);
                return res.status(200).json({ message: 'If a user with that email exists, a password reset token has been generated.', token: null });
            }
            console.log(`GENERATED PASSWORD RESET TOKEN (FOR POSTMAN TESTING ONLY): ${resetToken}`);


            return res.status(200).json({
                message: 'Password reset token generated. (FOR POSTMAN TESTING ONLY - TOKEN IS IN RESPONSE)', // Додаємо попередження
                token: resetToken
            });
        } catch (error) {
            next(error);
        }
    };

    resetPassword = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { token, newPassword } = req.body;

            if (!token || !newPassword) {
                return res.status(400).json({ message: 'Token and new password are required' });
            }

            const user = await this.userService.findUserByResetToken(token);

            if (!user) {
                return res.status(400).json({ message: 'Password reset token is invalid or has expired.' });
            }

            const updatedUser = await this.userService.resetUserPassword(user.id, newPassword);

            if (!updatedUser) {
                return res.status(500).json({ message: 'Failed to update user password.' });
            }

            return res.status(200).json({ message: 'Password has been reset successfully.' });

        } catch (error) {
            next(error);
        }
    };
}