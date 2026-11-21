import { PrismaClient } from '@prisma/client';

/** Single shared PrismaClient instance. */
export const prisma = new PrismaClient();
