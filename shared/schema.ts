import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User accounts (authenticated vye.agency users)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// HubSpot accounts - stores account info and API key (encrypted for internal tool use)
export const hubspotAccounts = pgTable("hubspot_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // Display name for the account
  portalId: text("portal_id"), // HubSpot portal ID (fetched from API)
  secretKeyName: text("secret_key_name").notNull(), // Unique key name for the encrypted API key
  createdAt: timestamp("created_at").defaultNow().notNull(),
  apiKey: text("api_key").notNull(), // Private App access token (encrypted)
});

export const insertHubspotAccountSchema = createInsertSchema(hubspotAccounts).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertHubspotAccount = z.infer<typeof insertHubspotAccountSchema>;
export type HubspotAccount = typeof hubspotAccounts.$inferSelect;

// Conversations - represents a chat session with context about a specific HubSpot account
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  hubspotAccountId: text("hubspot_account_id").notNull(), // References hubspot_accounts.id (database ID)
  hubspotAccountName: text("hubspot_account_name").notNull(),
  title: text("title"), // Auto-generated summary of conversation
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

// Messages in a conversation
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull().$type<"user" | "assistant">(),
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({ 
  id: true, 
  timestamp: true 
});
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Learned context - stores custom terminology and definitions that the AI learns
export const learnedContext = pgTable("learned_context", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").references(() => conversations.id, { onDelete: "cascade" }),
  hubspotAccountId: text("hubspot_account_id"), // References hubspot_accounts.id (database ID)
  contextType: text("context_type").notNull(), // "terminology", "deal_stage", "custom_field", etc.
  key: text("key").notNull(), // The term or field name
  value: text("value").notNull(), // The definition or mapping
  metadata: jsonb("metadata"), // Additional context (e.g., examples, synonyms)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLearnedContextSchema = createInsertSchema(learnedContext).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertLearnedContext = z.infer<typeof insertLearnedContextSchema>;
export type LearnedContext = typeof learnedContext.$inferSelect;

// Generated reports
export const reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").references(() => conversations.id, { onDelete: "cascade" }),
  hubspotAccountId: text("hubspot_account_id").notNull(),
  title: text("title").notNull(),
  reportData: jsonb("report_data").notNull(), // Structured report data
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
});

export const insertReportSchema = createInsertSchema(reports).omit({ 
  id: true, 
  generatedAt: true 
});
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reports.$inferSelect;

// HubSpot Forms - stores form GUIDs and names for report tracking
export const hubspotForms = pgTable("hubspot_forms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hubspotAccountId: varchar("hubspot_account_id").notNull().references(() => hubspotAccounts.id, { onDelete: "cascade" }),
  formGuid: text("form_guid").notNull(),
  formName: text("form_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertHubspotFormSchema = createInsertSchema(hubspotForms).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertHubspotForm = z.infer<typeof insertHubspotFormSchema>;
export type HubspotForm = typeof hubspotForms.$inferSelect;

// HubSpot Lists - stores list IDs and names for report tracking
export const hubspotLists = pgTable("hubspot_lists", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  hubspotAccountId: varchar("hubspot_account_id").notNull().references(() => hubspotAccounts.id, { onDelete: "cascade" }),
  listId: text("list_id").notNull(),
  listName: text("list_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertHubspotListSchema = createInsertSchema(hubspotLists).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertHubspotList = z.infer<typeof insertHubspotListSchema>;
export type HubspotList = typeof hubspotLists.$inferSelect;
