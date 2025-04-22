import {Column, Entity, PrimaryGeneratedColumn} from "typeorm";

export enum UserRole {
    User = 'user',
    Admin = 'admin',
}

@Entity("users")
export class User {

    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ unique: true })
    email!: string;

    @Column()
    firstName!: string;

    @Column()
    lastName!: string;

    @Column()
    age!: number;

    @Column()
    password!: string;

    @Column({
        type: "enum",
        enum: UserRole,
        default: UserRole.User
    })
    role!: UserRole;

    @Column({ nullable: true, type: "varchar" })
    resetPasswordToken!: string | null;

    @Column({ type: "timestamp", nullable: true })
    resetPasswordExpires!: Date | null;
}