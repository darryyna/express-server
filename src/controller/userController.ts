import { Request, Response, NextFunction } from 'express';
import { UserService, UpdateUserDto, RegisterUserDto } from '../service/userService';
import { UserRole} from "../model/User";

export class UserController {
    private readonly userService: UserService;

    constructor() {
        this.userService = new UserService();
    }

    getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const users = await this.userService.getAllUsers();
            return res.status(200).json(users);
        } catch (error) {
            next(error);
        }
    };

    getUserById = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid user ID' });
            }

            const user = await this.userService.getUserById(id);

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            return res.status(200).json(user);
        } catch (error) {
            next(error);
        }
    };

    createUser = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const userData: RegisterUserDto = req.body;
            const { email, firstName, lastName, age, password, role } = userData;

            if (!email || !firstName || !lastName || age === undefined || !password) {
                return res.status(400).json({ message: 'All required fields (email, firstName, lastName, age, password) must be provided for user creation' });
            }

            if (role && !Object.values(UserRole).includes(role)) {
                return res.status(400).json({ message: `Invalid role provided. Accepted roles are ${Object.values(UserRole).join(', ')}.` });
            }

            const roleToAssign = role ?? UserRole.User;

            const newUser = await this.userService.registerUser({
                email, firstName, lastName, age, password, role: roleToAssign
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

    updateUser = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid user ID' });
            }

            const userData: UpdateUserDto = req.body;

            if (userData.role && !Object.values(UserRole).includes(userData.role)) {
                return res.status(400).json({ message: `Invalid role value. Accepted roles are ${Object.values(UserRole).join(', ')}.` });
            }


            const updatedUser = await this.userService.updateUser(id, userData);

            if (!updatedUser) {
                return res.status(404).json({ message: 'User not found' });
            }

            return res.status(200).json(updatedUser);
        } catch (error) {
            next(error);
        }
    };

    deleteUser = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = parseInt(req.params.id);
            if (isNaN(id)) {
                return res.status(400).json({ message: 'Invalid user ID' });
            }

            const deleted = await this.userService.deleteUser(id);

            if (!deleted) {
                return res.status(404).json({ message: 'User not found' });
            }

            return res.status(204).send();
        } catch (error) {
            next(error);
        }
    };

    findUsers = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const firstName = req.query['firstName'] as string | undefined;
            const lastName = req.query['lastName'] as string | undefined;
            const ageQuery = req.query['age'] as string | undefined;
            const age = ageQuery ? parseInt(ageQuery, 10) : undefined;
            if (ageQuery !== undefined && isNaN(age as number)) {
                return res.status(400).json({ message: 'Invalid age format' });
            }

            const email = req.query['email'] as string | undefined;
            const roleQuery = req.query['role'] as string | undefined;

            const role = roleQuery && Object.values(UserRole).includes(roleQuery as UserRole) ? roleQuery as UserRole : undefined;
            if (roleQuery !== undefined && role === undefined) {
                return res.status(400).json({ message: `Invalid role value. Accepted roles are ${Object.values(UserRole).join(', ')}.` });
            }


            const users = await this.userService.findUsersByQuery({ firstName, lastName, age, email, role });

            return res.status(200).json(users);
        } catch (error) {
            next(error);
        }
    };
}