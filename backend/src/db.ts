import { PrismaClient } from '@prisma/client';
import { seedMemoryDb } from './memoryStore';

export let prisma: PrismaClient;
export let isDbConnected = false;

export async function connectDb() {
  try {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    });
    // Attempt a lightweight test query
    await prisma.$connect();
    isDbConnected = true;
    console.log('⚡️ Successfully connected to PostgreSQL database via Prisma');
  } catch (error) {
    console.warn('⚠️ PostgreSQL unreachable via Prisma. Booting SENTRA in-memory state engine.');
    isDbConnected = false;
    seedMemoryDb();
  }
}
