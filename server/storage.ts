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
  InsertHubspotForm, HubspotForm,
  InsertHubspotList, HubspotList,
  InsertFormGoal, FormGoal,
  InsertKpiGoal, KpiGoal,
  InsertGoogleAnalyticsConfig, GoogleAnalyticsConfig,
  InsertGoogleBusinessProfileConfig, GoogleBusinessProfileConfig,
  InsertDealDisplaySettings, DealDisplaySettings,
  InsertPipelineGoal, PipelineGoal
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
  getUserById(id: string): Promise<User | undefined>;
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
  
  // HubSpot Lists
  getListsByAccount(hubspotAccountId: string): Promise<HubspotList[]>;
  createList(list: InsertHubspotList): Promise<HubspotList>;
  deleteList(id: string): Promise<void>;
  
  // Form Goals
  getFormGoalsByForm(formId: string): Promise<FormGoal[]>;
  getFormGoalByFormAndYear(formId: string, year: number): Promise<FormGoal | undefined>;
  upsertFormGoal(goal: InsertFormGoal): Promise<FormGoal>;
  deleteFormGoalsByForm(formId: string): Promise<void>;

  // KPI Goals
  getKpiGoalsByAccount(hubspotAccountId: string): Promise<KpiGoal[]>;
  getKpiGoalByAccountMetricAndYear(hubspotAccountId: string, metric: string, year: number): Promise<KpiGoal | undefined>;
  upsertKpiGoal(goal: InsertKpiGoal): Promise<KpiGoal>;

  // Google Analytics Config
  getGoogleAnalyticsConfig(hubspotAccountId: string): Promise<GoogleAnalyticsConfig | undefined>;
  upsertGoogleAnalyticsConfig(config: InsertGoogleAnalyticsConfig): Promise<GoogleAnalyticsConfig>;

  // Google Business Profile Config
  getGoogleBusinessProfileConfig(hubspotAccountId: string): Promise<GoogleBusinessProfileConfig | undefined>;
  upsertGoogleBusinessProfileConfig(config: InsertGoogleBusinessProfileConfig): Promise<GoogleBusinessProfileConfig>;
  updateGoogleBusinessProfileTokens(hubspotAccountId: string, accessToken: string, tokenExpiry: Date): Promise<void>;
  deleteGoogleBusinessProfileConfig(hubspotAccountId: string): Promise<void>;

  // Deal Display Settings
  getDealDisplaySettings(hubspotAccountId: string): Promise<DealDisplaySettings | undefined>;
  upsertDealDisplaySettings(settings: InsertDealDisplaySettings): Promise<DealDisplaySettings>;

  // Pipeline Goals
  getPipelineGoalsByAccount(hubspotAccountId: string): Promise<PipelineGoal[]>;
  getPipelineGoalByAccountPipelineAndYear(hubspotAccountId: string, pipelineId: string, year: number): Promise<PipelineGoal | undefined>;
  upsertPipelineGoal(goal: InsertPipelineGoal): Promise<PipelineGoal>;
  deletePipelineGoal(id: string): Promise<void>;
}

class Storage implements IStorage {
  // Users
  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    return result[0];
  }

  async getUserById(id: string): Promise<User | undefined> {
    const result = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
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
    const result = await db.insert(schema.messages).values(message as any).returning();
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

  // HubSpot Lists
  async getListsByAccount(hubspotAccountId: string): Promise<HubspotList[]> {
    return await db.select()
      .from(schema.hubspotLists)
      .where(eq(schema.hubspotLists.hubspotAccountId, hubspotAccountId))
      .orderBy(desc(schema.hubspotLists.createdAt));
  }

  async createList(list: InsertHubspotList): Promise<HubspotList> {
    const result = await db.insert(schema.hubspotLists).values(list).returning();
    return result[0];
  }

  async deleteList(id: string): Promise<void> {
    await db.delete(schema.hubspotLists).where(eq(schema.hubspotLists.id, id));
  }

  // Form Goals
  async getFormGoalsByForm(formId: string): Promise<FormGoal[]> {
    return await db.select()
      .from(schema.formGoals)
      .where(eq(schema.formGoals.formId, formId))
      .orderBy(schema.formGoals.year);
  }

  async getFormGoalByFormAndYear(formId: string, year: number): Promise<FormGoal | undefined> {
    const result = await db.select()
      .from(schema.formGoals)
      .where(and(
        eq(schema.formGoals.formId, formId),
        eq(schema.formGoals.year, year)
      ))
      .limit(1);
    return result[0];
  }

  async upsertFormGoal(goal: InsertFormGoal): Promise<FormGoal> {
    const existing = await this.getFormGoalByFormAndYear(goal.formId, goal.year);
    if (existing) {
      const result = await db.update(schema.formGoals)
        .set({
          q1Goal: goal.q1Goal,
          q2Goal: goal.q2Goal,
          q3Goal: goal.q3Goal,
          q4Goal: goal.q4Goal,
        })
        .where(eq(schema.formGoals.id, existing.id))
        .returning();
      return result[0];
    }
    const result = await db.insert(schema.formGoals).values(goal).returning();
    return result[0];
  }

  async deleteFormGoalsByForm(formId: string): Promise<void> {
    await db.delete(schema.formGoals).where(eq(schema.formGoals.formId, formId));
  }

  // KPI Goals
  async getKpiGoalsByAccount(hubspotAccountId: string): Promise<KpiGoal[]> {
    return await db.select()
      .from(schema.kpiGoals)
      .where(eq(schema.kpiGoals.hubspotAccountId, hubspotAccountId))
      .orderBy(schema.kpiGoals.year);
  }

  async getKpiGoalByAccountMetricAndYear(hubspotAccountId: string, metric: string, year: number): Promise<KpiGoal | undefined> {
    const result = await db.select()
      .from(schema.kpiGoals)
      .where(and(
        eq(schema.kpiGoals.hubspotAccountId, hubspotAccountId),
        eq(schema.kpiGoals.metric, metric),
        eq(schema.kpiGoals.year, year)
      ))
      .limit(1);
    return result[0];
  }

  async upsertKpiGoal(goal: InsertKpiGoal): Promise<KpiGoal> {
    const existing = await this.getKpiGoalByAccountMetricAndYear(goal.hubspotAccountId, goal.metric, goal.year);
    if (existing) {
      const result = await db.update(schema.kpiGoals)
        .set({
          q1Goal: goal.q1Goal,
          q2Goal: goal.q2Goal,
          q3Goal: goal.q3Goal,
          q4Goal: goal.q4Goal,
        })
        .where(eq(schema.kpiGoals.id, existing.id))
        .returning();
      return result[0];
    }
    const result = await db.insert(schema.kpiGoals).values(goal).returning();
    return result[0];
  }

  // Google Analytics Config
  async getGoogleAnalyticsConfig(hubspotAccountId: string): Promise<GoogleAnalyticsConfig | undefined> {
    const result = await db.select()
      .from(schema.googleAnalyticsConfig)
      .where(eq(schema.googleAnalyticsConfig.hubspotAccountId, hubspotAccountId))
      .limit(1);
    return result[0];
  }

  async upsertGoogleAnalyticsConfig(config: InsertGoogleAnalyticsConfig): Promise<GoogleAnalyticsConfig> {
    const existing = await this.getGoogleAnalyticsConfig(config.hubspotAccountId);
    if (existing) {
      const result = await db.update(schema.googleAnalyticsConfig)
        .set({ propertyId: config.propertyId })
        .where(eq(schema.googleAnalyticsConfig.id, existing.id))
        .returning();
      return result[0];
    }
    const result = await db.insert(schema.googleAnalyticsConfig).values(config).returning();
    return result[0];
  }

  // Google Business Profile Config
  async getGoogleBusinessProfileConfig(hubspotAccountId: string): Promise<GoogleBusinessProfileConfig | undefined> {
    const result = await db.select()
      .from(schema.googleBusinessProfileConfig)
      .where(eq(schema.googleBusinessProfileConfig.hubspotAccountId, hubspotAccountId))
      .limit(1);
    return result[0];
  }

  async upsertGoogleBusinessProfileConfig(config: InsertGoogleBusinessProfileConfig): Promise<GoogleBusinessProfileConfig> {
    const existing = await this.getGoogleBusinessProfileConfig(config.hubspotAccountId);
    if (existing) {
      const result = await db.update(schema.googleBusinessProfileConfig)
        .set({
          accountId: config.accountId,
          locationId: config.locationId,
          locationName: config.locationName,
          accessToken: config.accessToken,
          refreshToken: config.refreshToken,
          tokenExpiry: config.tokenExpiry,
          updatedAt: new Date(),
        })
        .where(eq(schema.googleBusinessProfileConfig.id, existing.id))
        .returning();
      return result[0];
    }
    const result = await db.insert(schema.googleBusinessProfileConfig).values(config).returning();
    return result[0];
  }

  async updateGoogleBusinessProfileTokens(hubspotAccountId: string, accessToken: string, tokenExpiry: Date): Promise<void> {
    await db.update(schema.googleBusinessProfileConfig)
      .set({ accessToken, tokenExpiry, updatedAt: new Date() })
      .where(eq(schema.googleBusinessProfileConfig.hubspotAccountId, hubspotAccountId));
  }

  async deleteGoogleBusinessProfileConfig(hubspotAccountId: string): Promise<void> {
    await db.delete(schema.googleBusinessProfileConfig)
      .where(eq(schema.googleBusinessProfileConfig.hubspotAccountId, hubspotAccountId));
  }

  // Deal Display Settings
  async getDealDisplaySettings(hubspotAccountId: string): Promise<DealDisplaySettings | undefined> {
    const result = await db.select()
      .from(schema.dealDisplaySettings)
      .where(eq(schema.dealDisplaySettings.hubspotAccountId, hubspotAccountId))
      .limit(1);
    return result[0];
  }

  async upsertDealDisplaySettings(settings: InsertDealDisplaySettings): Promise<DealDisplaySettings> {
    const existing = await this.getDealDisplaySettings(settings.hubspotAccountId);
    if (existing) {
      const result = await db.update(schema.dealDisplaySettings)
        .set({
          showNewDeals: settings.showNewDeals,
          selectedPipelines: settings.selectedPipelines,
          updatedAt: new Date(),
        })
        .where(eq(schema.dealDisplaySettings.id, existing.id))
        .returning();
      return result[0];
    }
    const result = await db.insert(schema.dealDisplaySettings).values(settings).returning();
    return result[0];
  }

  // Pipeline Goals
  async getPipelineGoalsByAccount(hubspotAccountId: string): Promise<PipelineGoal[]> {
    return await db.select()
      .from(schema.pipelineGoals)
      .where(eq(schema.pipelineGoals.hubspotAccountId, hubspotAccountId))
      .orderBy(schema.pipelineGoals.year);
  }

  async getPipelineGoalByAccountPipelineAndYear(hubspotAccountId: string, pipelineId: string, year: number): Promise<PipelineGoal | undefined> {
    const result = await db.select()
      .from(schema.pipelineGoals)
      .where(and(
        eq(schema.pipelineGoals.hubspotAccountId, hubspotAccountId),
        eq(schema.pipelineGoals.pipelineId, pipelineId),
        eq(schema.pipelineGoals.year, year)
      ))
      .limit(1);
    return result[0];
  }

  async upsertPipelineGoal(goal: InsertPipelineGoal): Promise<PipelineGoal> {
    const existing = await this.getPipelineGoalByAccountPipelineAndYear(goal.hubspotAccountId, goal.pipelineId, goal.year);
    if (existing) {
      const result = await db.update(schema.pipelineGoals)
        .set({
          pipelineName: goal.pipelineName,
          q1Goal: goal.q1Goal,
          q2Goal: goal.q2Goal,
          q3Goal: goal.q3Goal,
          q4Goal: goal.q4Goal,
          q1ValueGoal: goal.q1ValueGoal,
          q2ValueGoal: goal.q2ValueGoal,
          q3ValueGoal: goal.q3ValueGoal,
          q4ValueGoal: goal.q4ValueGoal,
        })
        .where(eq(schema.pipelineGoals.id, existing.id))
        .returning();
      return result[0];
    }
    const result = await db.insert(schema.pipelineGoals).values(goal).returning();
    return result[0];
  }

  async deletePipelineGoal(id: string): Promise<void> {
    await db.delete(schema.pipelineGoals).where(eq(schema.pipelineGoals.id, id));
  }
}

export const storage = new Storage();
