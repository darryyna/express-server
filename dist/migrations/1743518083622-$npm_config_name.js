"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.$npmConfigName1743518083622 = void 0;
class $npmConfigName1743518083622 {
    constructor() {
        this.name = ' $npmConfigName1743518083622';
    }
    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "users" ("id" SERIAL NOT NULL, "firstName" character varying NOT NULL, "lastName" character varying NOT NULL, "age" integer NOT NULL, CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "users"`);
    }
}
exports.$npmConfigName1743518083622 = $npmConfigName1743518083622;
