"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const User_1 = require("../model/User");
const data_source_1 = require("../data-source");
class UserService {
    constructor() {
        this.userRepository = data_source_1.AppDataSource.getRepository(User_1.User);
    }
    async getAllUsers() {
        return this.userRepository.find();
    }
    async getUserById(id) {
        return this.userRepository.findOneBy({ id });
    }
    async createUser(userData) {
        const user = this.userRepository.create(userData);
        return this.userRepository.save(user);
    }
    async updateUser(id, userData) {
        await this.userRepository.update(id, userData);
        return this.getUserById(id);
    }
    async deleteUser(id) {
        const result = await this.userRepository.delete(id);
        return result.affected ? result.affected > 0 : false;
    }
}
exports.UserService = UserService;
