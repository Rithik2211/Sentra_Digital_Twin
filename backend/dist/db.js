"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDbConnected = exports.prisma = void 0;
exports.connectDb = connectDb;
const client_1 = require("@prisma/client");
const memoryStore_1 = require("./memoryStore");
exports.isDbConnected = false;
async function connectDb() {
    try {
        exports.prisma = new client_1.PrismaClient({
            datasources: {
                db: {
                    url: process.env.DATABASE_URL
                }
            }
        });
        // Attempt a lightweight test query
        await exports.prisma.$connect();
        exports.isDbConnected = true;
        console.log('⚡️ Successfully connected to PostgreSQL database via Prisma');
    }
    catch (error) {
        console.warn('⚠️ PostgreSQL unreachable via Prisma. Booting SENTRA in-memory state engine.');
        exports.isDbConnected = false;
        (0, memoryStore_1.seedMemoryDb)();
    }
}
