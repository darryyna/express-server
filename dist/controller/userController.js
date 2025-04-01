"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const userService_1 = require("../service/userService");
class UserController {
    constructor() {
        this.getAllUsers = async (req, res, next) => {
            try {
                const users = await this.userService.getAllUsers();
                return res.status(200).json(users);
            }
            catch (error) {
                next(error);
            }
        };
        this.getUserById = async (req, res, next) => {
            try {
                const id = parseInt(req.params.id);
                const user = await this.userService.getUserById(id);
                if (!user) {
                    return res.status(404).json({ message: 'User not found' });
                }
                return res.status(200).json(user);
            }
            catch (error) {
                next(error);
            }
        };
        this.createUser = async (req, res, next) => {
            try {
                const { firstName, lastName, age } = req.body;
                if (!firstName || !lastName || age === undefined) {
                    return res.status(400).json({ message: 'All fields are required' });
                }
                const newUser = await this.userService.createUser({ firstName, lastName, age });
                return res.status(201).json(newUser);
            }
            catch (error) {
                next(error);
            }
        };
        this.updateUser = async (req, res, next) => {
            try {
                const id = parseInt(req.params.id);
                const { firstName, lastName, age } = req.body;
                const updatedUser = await this.userService.updateUser(id, { firstName, lastName, age });
                if (!updatedUser) {
                    return res.status(404).json({ message: 'User not found' });
                }
                return res.status(200).json(updatedUser);
            }
            catch (error) {
                next(error);
            }
        };
        this.deleteUser = async (req, res, next) => {
            try {
                const id = parseInt(req.params.id);
                const deleted = await this.userService.deleteUser(id);
                if (!deleted) {
                    return res.status(404).json({ message: 'User not found' });
                }
                return res.status(204).send();
            }
            catch (error) {
                next(error);
            }
        };
        this.userService = new userService_1.UserService();
    }
}
exports.UserController = UserController;
