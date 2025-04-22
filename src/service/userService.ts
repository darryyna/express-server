import {Raw, Repository} from 'typeorm';
import {User, UserRole} from "../model/User";
import {AppDataSource} from '../data-source';
import * as bcrypt from 'bcrypt';
import * as crypto from "node:crypto";

export interface RegisterUserDto extends Omit<User,
    'id' | 'password' | 'role' | 'resetPasswordToken' | 'resetPasswordExpires'>
{
    email: string;
    password: string;
    role?: UserRole;
}

export interface UpdateUserDto extends Partial<Omit<User, 'id'>> {
    email?: string;
    password?: string;
    role?: UserRole;
}

export class UserService {
    private readonly userRepository: Repository<User>;
    private readonly saltRounds = 10;

    constructor() {
        this.userRepository = AppDataSource.getRepository(User);
    }

    async getAllUsers(): Promise<User[]> {
        return this.userRepository.find({ select: ['id', 'firstName', 'lastName', 'age', 'email', 'role'] });
    }

    async getUserById(id: number): Promise<User | null> {
        return await this.userRepository.findOne({
            where: {id},
            select: ['id', 'firstName', 'lastName', 'age', 'email', 'role']
        });
    }

    async registerUser(userData: RegisterUserDto): Promise<User> {
        const existingUser = await this.userRepository.findOneBy({ email: userData.email });
        if (existingUser) {
            throw new Error('User with this email already exists');
        }

        const hashedPassword = await bcrypt.hash(userData.password, this.saltRounds);

        const newUser = this.userRepository.create({
            ...userData,
            password: hashedPassword,
            role: userData.role ?? UserRole.User
        });

        return this.userRepository.save(newUser);
    }

    async findUserByEmail(email: string): Promise<User | null> {
        return this.userRepository.findOneBy({ email });
    }

    async updateUser(id: number, userData: UpdateUserDto): Promise<User | null> {
        const userToUpdate = await this.userRepository.findOneBy({ id });

        if (!userToUpdate) {
            return null;
        }

        if (userData.password) {
            userData.password = await bcrypt.hash(userData.password, this.saltRounds);
        }

        this.userRepository.merge(userToUpdate, userData);

        await this.userRepository.save(userToUpdate);

        return await this.getUserById(id);
    }


    async deleteUser(id: number): Promise<boolean> {
        const result = await this.userRepository.delete(id);
        return result.affected ? result.affected > 0 : false;
    }

    async findUsersByQuery(query: {
        firstName?: string;
        lastName?: string;
        age?: number;
        email?: string;
        role?: UserRole;
    }): Promise<User[]> {
        const { firstName, lastName, age, email, role } = query;

        return this.userRepository.find({
            where: {
                ...(firstName && { firstName: Raw(alias => `${alias} ILIKE :value`, { value: `%${firstName}%` }) }),
                ...(lastName && { lastName: Raw(alias => `${alias} ILIKE :value`, { value: `%${lastName}%` }) }),
                ...(email && { email: Raw(alias => `${alias} ILIKE :value`, { value: `%${email}%` }) }),
                ...(age !== undefined && { age }),
                ...(role && { role }),
            },
            order: { id: 'ASC' },
            select: ['id', 'firstName', 'lastName', 'age', 'email', 'role']
        });
    }

    async generatePasswordResetToken(email: string): Promise<string | null> {
        const user = await this.userRepository.findOneBy({ email });

        if (!user) {
            return null;
        }

        const resetToken = crypto.randomBytes(32).toString('hex');

        const expiryDate = new Date();
        expiryDate.setHours(expiryDate.getHours() + 1);

        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = expiryDate;

        await this.userRepository.save(user);

        return resetToken;
    }

    async findUserByResetToken(token: string): Promise<User | null> {
        const user = await this.userRepository.findOne({
            where: {
                resetPasswordToken: token,
                resetPasswordExpires: Raw(alias => `${alias} > :now`, { now: new Date() })
            }
        });
        if (!user) {
            return null;
        }

        return user;
    }

    async resetUserPassword(userId: number, newPassword: string): Promise<User | null> {
        const user = await this.userRepository.findOneBy({ id: userId });

        if (!user) {
            return null;
        }

        user.password = await bcrypt.hash(newPassword, this.saltRounds);
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;

        await this.userRepository.save(user);

        return await this.getUserById(user.id);
    }
}