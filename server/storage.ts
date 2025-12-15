import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import type { 
  InsertUser, User, 
  InsertConversation, Conversation,
  InsertMessage, Message,
  InsertLearnedContext, LearnedContext,
  InsertReport, Report
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
});

export const db = drizzle(pool, { schema });

export interface IStorage {
  // Users
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Conversations
  getConversationsByUser(userId: string): Promise<Conversation[]>;
  getConversationById(id: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversationTitle(id: string, title: string): Promise<void>;
  
  // Messages
  getMessagesByConversation(conversationId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  
  // Learned Context
  getLearnedContextByAccount(hubspotAccountId: string): Promise<LearnedContext[]>;
  getLearnedContextByConversation(conversationId: string): Promise<LearnedContext[]>;
  createLearnedContext(context: InsertLearnedContext): Promise<LearnedContext>;
  
  // Reports
  getReportsByAccount(hubspotAccountId: string): Promise<Report[]>;
  createReport(report: InsertReport): Promise<Report>;
}

class Storage implements IStorage {
  // Users
  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(schema.users).values(user).returning();
    return result[0];
  }

  // Conversations
  async getConversationsByUser(userId: string): Promise<Conversation[]> {
    return await db.select()
      .from(schema.conversations)
      .where(eq(schema.conversations.userId, userId))
      .orderBy(desc(schema.conversations.updatedAt));
  }

  async getConversationById(id: string): Promise<Conversation | undefined> {
    const result = await db.select().from(schema.conversations).where(eq(schema.conversations.id, id)).limit(1);
    return result[0];
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const result = await db.insert(schema.conversations).values(conversation).returning();
    return result[0];
  }

  async updateConversationTitle(id: string, title: string): Promise<void> {
    await db.update(schema.conversations)
      .set({ title, updatedAt: new Date() })
      .where(eq(schema.conversations.id, id));
  }

  // Messages
  async getMessagesByConversation(conversationId: string): Promise<Message[]> {
    return await db.select()
      .from(schema.messages)
      .where(eq(schema.messages.conversationId, conversationId))
      .orderBy(schema.messages.timestamp);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const result = await db.insert(schema.messages).values(message).returning();
    return result[0];
  }

  // Learned Context
  async getLearnedContextByAccount(hubspotAccountId: string): Promise<LearnedContext[]> {
    return await db.select()
      .from(schema.learnedContext)
      .where(eq(schema.learnedContext.hubspotAccountId, hubspotAccountId))
      .orderBy(desc(schema.learnedContext.createdAt));
  }

  async getLearnedContextByConversation(conversationId: string): Promise<LearnedContext[]> {
    return await db.select()
      .from(schema.learnedContext)
      .where(eq(schema.learnedContext.conversationId, conversationId))
      .orderBy(desc(schema.learnedContext.createdAt));
  }

  async createLearnedContext(context: InsertLearnedContext): Promise<LearnedContext> {
    const result = await db.insert(schema.learnedContext).values(context).returning();
    return result[0];
  }

  // Reports
  async getReportsByAccount(hubspotAccountId: string): Promise<Report[]> {
    return await db.select()
      .from(schema.reports)
      .where(eq(schema.reports.hubspotAccountId, hubspotAccountId))
      .orderBy(desc(schema.reports.generatedAt));
  }

  async createReport(report: InsertReport): Promise<Report> {
    const result = await db.insert(schema.reports).values(report).returning();
    return result[0];
  }
}

export const storage = new Storage();
