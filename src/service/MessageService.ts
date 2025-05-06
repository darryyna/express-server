import { Repository, IsNull } from "typeorm";
import {Message} from "../model/Message";
import {AppDataSource} from "../data-source";

export class MessageService {
    private readonly messageRepository: Repository<Message>;

    constructor() {
        this.messageRepository = AppDataSource.getRepository(Message);
    }

    async saveMessage(senderId: number, content: string, recipientId: number | null = null): Promise<Message> {
        const newMessage = this.messageRepository.create({
            senderId,
            content,
            recipientId,
        });
        return await this.messageRepository.save(newMessage);
    }

    async getPublicMessages(limit = 100): Promise<Message[]> {
        return this.messageRepository.find({
            where: { recipientId: IsNull() },
            order: { timestamp: 'ASC' },
            take: limit,
            relations: ['sender'],
        });
    }

    async getPrivateMessages(userId1: number, userId2: number, limit = 100): Promise<Message[]> {
        return this.messageRepository.find({
            where: [
                { senderId: userId1, recipientId: userId2 },
                { senderId: userId2, recipientId: userId1 },
            ],
            order: { timestamp: 'ASC' },
            take: limit,
            relations: ['sender', 'recipient'],
        });
    }
}