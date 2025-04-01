import { Request, Response, NextFunction } from 'express';
import { UserService } from '../service/userService';

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
            const { firstName, lastName, age } = req.body;

            if (!firstName || !lastName || age === undefined) {
                return res.status(400).json({ message: 'All fields are required' });
            }

            const newUser = await this.userService.createUser({ firstName, lastName, age });
            return res.status(201).json(newUser);
        } catch (error) {
            next(error);
        }
    };

    updateUser = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = parseInt(req.params.id);
            const { firstName, lastName, age } = req.body;

            const updatedUser = await this.userService.updateUser(id, { firstName, lastName, age });

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
            const deleted = await this.userService.deleteUser(id);

            if (!deleted) {
                return res.status(404).json({ message: 'User not found' });
            }

            return res.status(204).send();
        } catch (error) {
            next(error);
        }
    };
}