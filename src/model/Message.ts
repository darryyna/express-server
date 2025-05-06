import {Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn} from "typeorm";
import { User } from "./User";

@Entity("messages")
export class Message {

    @PrimaryGeneratedColumn()
    id!: number;

    @Column('text')
    content!: string;

    @CreateDateColumn()
    timestamp!: Date;

    @ManyToOne(() => User, { eager: true }) // eager loading to get sender info easily
    @JoinColumn({ name: 'senderId' })
    sender!: User;

    @Column()
    senderId!: number; // foreign key

    @ManyToOne(() => User, { nullable: true, eager: true }) // eager for recipient info
    @JoinColumn({ name: 'recipientId' })
    recipient!: User | null;

    @Column({ nullable: true })
    recipientId!: number | null; // foreign key
}