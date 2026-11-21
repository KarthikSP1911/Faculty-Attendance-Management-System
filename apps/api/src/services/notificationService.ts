import { prisma } from '../db';

export const notify = (userId: string, type: string, title: string, message: string) =>
  prisma.notification.create({ data: { userId, type, title, message } });
