"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const data_source_1 = require("./data-source");
const userRoute_1 = __importDefault(require("./route/userRoute"));
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.use(express_1.default.json());
app.use('/api/users', userRoute_1.default);
const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
};
app.use(errorHandler);
data_source_1.AppDataSource.initialize()
    .then(() => {
    console.log('Database connected successfully');
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
})
    .catch((error) => console.log('Database connection error: ', error));
