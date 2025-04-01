import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "./model/User";

export const AppDataSource = new DataSource({
    type: "postgres",
    host: "localhost",
    port: 5439,
    username: "user",
    password: "12345",
    database: "users",
    synchronize: false,
    logging: true,
    entities: [User],
    migrations: ["./src/migrations/*.ts"],
    subscribers: [],
});

AppDataSource.initialize()
    .then(() => {
        console.log("Data Source has been initialized!")
    })
    .catch((err) => {
        console.error("Error during Data Source initialization:", err)
    })