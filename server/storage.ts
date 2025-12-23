import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import type { 
  InsertUser, User, 
  InsertHubspotAccount, HubspotAccount,
  InsertConversation, Conversation,
  InsertMessage, Message,
  InsertLearnedContext, LearnedContext,
  InsertReport, Report,
  InsertHubspotForm, HubspotForm
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
  
  // HubSpot Accounts
  getHubspotAccountsByUser(userId: string): Promise<HubspotAccount[]>;
  getHubspotAccountById(id: string): Promise<HubspotAccount | undefined>;
  createHubspotAccount(account: InsertHubspotAccount): Promise<HubspotAccount>;
  deleteHubspotAccount(id: string): Promise<void>;
  updateHubspotAccountPortalId(id: string, portalId: string): Promise<void>;
  
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
  
  // HubSpot Forms
  getFormsByAccount(hubspotAccountId: string): Promise<HubspotForm[]>;
  createForm(form: InsertHubspotForm): Promise<HubspotForm>;
  deleteForm(id: string): Promise<void>;
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

  // HubSpot Accounts
  async getHubspotAccountsByUser(userId: string): Promise<HubspotAccount[]> {
    return await db.select()
      .from(schema.hubspotAccounts)
      .where(eq(schema.hubspotAccounts.userId, userId))
      .orderBy(desc(schema.hubspotAccounts.createdAt));
  }

  async getHubspotAccountById(id: string): Promise<HubspotAccount | undefined> {
    const result = await db.select()
      .from(schema.hubspotAccounts)
      .where(eq(schema.hubspotAccounts.id, id))
      .limit(1);
    return result[0];
  }

  async createHubspotAccount(account: InsertHubspotAccount): Promise<HubspotAccount> {
    const result = await db.insert(schema.hubspotAccounts).values(account).returning();
    return result[0];
  }

  async deleteHubspotAccount(id: string): Promise<void> {
    await db.delete(schema.hubspotAccounts).where(eq(schema.hubspotAccounts.id, id));
  }

  async updateHubspotAccountPortalId(id: string, portalId: string): Promise<void> {
    await db.update(schema.hubspotAccounts)
      .set({ portalId })
      .where(eq(schema.hubspotAccounts.id, id));
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

  // HubSpot Forms
  async getFormsByAccount(hubspotAccountId: string): Promise<HubspotForm[]> {
    return await db.select()
      .from(schema.hubspotForms)
      .where(eq(schema.hubspotForms.hubspotAccountId, hubspotAccountId))
      .orderBy(desc(schema.hubspotForms.createdAt));
  }

  async createForm(form: InsertHubspotForm): Promise<HubspotForm> {
    const result = await db.insert(schema.hubspotForms).values(form).returning();
    return result[0];
  }

  async deleteForm(id: string): Promise<void> {
    await db.delete(schema.hubspotForms).where(eq(schema.hubspotForms.id, id));
  }
}

export const storage = new Storage();
