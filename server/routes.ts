import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { passport } from "./passport";
import { 
  getDeals, 
  getContacts, 
  getCompanies, 
  searchDeals,
  validateApiKeyAndGetAccountInfo,
  getComprehensiveData,
  getFormByGuid,
  getAllForms,
  getFormSubmissionsQuarterly,
  getAllLists,
  getListById,
  getLifecycleStageBreakdown,
  getMarketingEmails,
  getMarketingEmailDetails,
  getDealPipelines
} from "./hubspot-client";
import { PROOFERBOT_SYSTEM_PROMPT, PROOFERBOT_MODEL_SETTINGS } from "../config/prooferbotRules";
import OpenAI from 'openai';
import { analyzeWithAI, generateReport, extractLearning, answerReportQuestion } from "./ai-service";
import { encrypt, decrypt } from "./encryption";
import { getPageViewsQuarterly, getChannelGroupBreakdown, isGoogleAnalyticsConfigured } from "./google-analytics-client";
import { 
  isGBPConfigured, 
  getGBPClientCredentials, 
  getGBPAuthUrl, 
  exchangeCodeForTokens, 
  refreshAccessToken,
  listGBPAccounts,
  listGBPLocations,
  getGBPBusinessInfo
} from "./google-business-profile-client";
import { z } from "zod";

// Helper to get API key for a HubSpot account
async function getApiKeyForAccount(accountId: string): Promise<string | null> {
  const account = await storage.getHubspotAccountById(accountId);
  if (!account || !account.apiKey) return null;
  try {
    return decrypt(account.apiKey);
  } catch (error) {
    console.error("Error decrypting API key:", error);
    return null;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Google OAuth routes
  app.get("/api/auth/google", passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  }));

  app.get("/api/auth/google/callback",
    passport.authenticate("google", {
      failureRedirect: "/?error=auth_failed",
    }),
    (req, res) => {
      const user = req.user as any;
      if (user) {
        req.session.userId = user.id;
      }
      res.redirect("/select-account");
    }
  );

  // Get current session user
  app.get("/api/auth/me", async (req, res) => {
    try {
      if (req.user) {
        return res.json({ user: req.user });
      }
      
      if (req.session.userId) {
        const user = await storage.getUserById(req.session.userId);
        if (user) {
          return res.json({ user });
        }
      }
      
      res.json({ user: null });
    } catch (error) {
      console.error("Session check error:", error);
      res.json({ user: null });
    }
  });

  // Logout route
  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
      }
      req.session.destroy((err) => {
        if (err) {
          console.error("Session destroy error:", err);
        }
        res.json({ success: true });
      });
    });
  });

  // ==========================================
  // HubSpot Account Management
  // ==========================================

  // Get user's HubSpot accounts
  app.get("/api/hubspot/accounts/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const accounts = await storage.getHubspotAccountsByUser(userId);
      
      // Return accounts without secret key names for security
      const safeAccounts = accounts.map(a => ({
        id: a.id,
        name: a.name,
        portalId: a.portalId,
        createdAt: a.createdAt
      }));
      
      res.json(safeAccounts);
    } catch (error) {
      console.error("Error fetching HubSpot accounts:", error);
      res.status(500).json({ error: "Failed to fetch HubSpot accounts" });
    }
  });

  // Add a new HubSpot account
  app.post("/api/hubspot/accounts", async (req, res) => {
    try {
      const { userId, name, apiKey } = req.body;
      
      if (!userId || !name || !apiKey) {
        return res.status(400).json({ error: "Missing required fields: userId, name, apiKey" });
      }

      // Validate the API key by trying to fetch account info
      const validation = await validateApiKeyAndGetAccountInfo(apiKey);
      
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error || "Invalid API key" });
      }

      // Store the account with encrypted API key
      const encryptedApiKey = encrypt(apiKey);
      const secretKeyName = `hubspot_${userId}_${Date.now()}`;
      const account = await storage.createHubspotAccount({
        userId,
        name,
        portalId: validation.portalId || null,
        secretKeyName,
        apiKey: encryptedApiKey
      });

      res.json({
        id: account.id,
        name: account.name,
        portalId: account.portalId,
        createdAt: account.createdAt,
        accountName: validation.accountName
      });
    } catch (error) {
      console.error("Error adding HubSpot account:", error);
      res.status(500).json({ error: "Failed to add HubSpot account" });
    }
  });

  // Delete a HubSpot account
  app.delete("/api/hubspot/accounts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteHubspotAccount(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting HubSpot account:", error);
      res.status(500).json({ error: "Failed to delete HubSpot account" });
    }
  });

  // Validate an API key
  app.post("/api/hubspot/validate-key", async (req, res) => {
    try {
      const { apiKey } = req.body;
      
      if (!apiKey) {
        return res.status(400).json({ error: "API key is required" });
      }

      const validation = await validateApiKeyAndGetAccountInfo(apiKey);
      res.json(validation);
    } catch (error) {
      console.error("Error validating API key:", error);
      res.status(500).json({ error: "Failed to validate API key" });
    }
  });

  // ==========================================
  // HubSpot Forms Management
  // ==========================================

  // Get all available forms from HubSpot (for picker UI)
  app.get("/api/hubspot/available-forms/:accountId", async (req, res) => {
    try {
      const { accountId } = req.params;
      
      const apiKey = await getApiKeyForAccount(accountId);
      if (!apiKey) {
        return res.status(400).json({ error: "Could not find API key for account" });
      }

      const forms = await getAllForms(apiKey);
      res.json(forms);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch available forms from HubSpot" });
    }
  });

  // Get saved forms for an account
  app.get("/api/hubspot/forms/:accountId", async (req, res) => {
    try {
      const { accountId } = req.params;
      const forms = await storage.getFormsByAccount(accountId);
      res.json(forms);
    } catch (error) {
      console.error("Error fetching forms:", error);
      res.status(500).json({ error: "Failed to fetch forms" });
    }
  });

  // Add a form by GUID (looks up form name from HubSpot)
  const addFormSchema = z.object({
    accountId: z.string().min(1, "Account ID is required"),
    formGuid: z.string().min(1, "Form GUID is required")
  });

  app.post("/api/hubspot/forms", async (req, res) => {
    try {
      const parseResult = addFormSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors[0]?.message || "Invalid request" });
      }

      const { accountId, formGuid } = parseResult.data;

      // Get API key for this account
      const apiKey = await getApiKeyForAccount(accountId);
      if (!apiKey) {
        return res.status(400).json({ error: "Could not find API key for account" });
      }

      // Look up form name from HubSpot
      const formInfo = await getFormByGuid(apiKey, formGuid);
      if ('error' in formInfo && !('name' in formInfo)) {
        return res.status(400).json({ error: formInfo.error });
      }

      // Save the form
      const form = await storage.createForm({
        hubspotAccountId: accountId,
        formGuid: (formInfo as any).formGuid,
        formName: (formInfo as any).name
      });

      res.json(form);
    } catch (error) {
      console.error("Error adding form:", error);
      res.status(500).json({ error: "Failed to add form" });
    }
  });

  // Delete a form
  app.delete("/api/hubspot/forms/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteForm(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting form:", error);
      res.status(500).json({ error: "Failed to delete form" });
    }
  });

  // ==========================================
  // HubSpot Lists Management
  // ==========================================

  // Get all available lists from HubSpot (for picker UI)
  app.get("/api/hubspot/available-lists/:accountId", async (req, res) => {
    try {
      const { accountId } = req.params;
      
      const apiKey = await getApiKeyForAccount(accountId);
      if (!apiKey) {
        return res.status(400).json({ error: "Could not find API key for account" });
      }

      const lists = await getAllLists(apiKey);
      res.json(lists);
    } catch (error) {
      console.error("Error fetching available lists:", error);
      res.status(500).json({ error: "Failed to fetch available lists from HubSpot" });
    }
  });

  // Get saved lists for an account
  app.get("/api/hubspot/lists/:accountId", async (req, res) => {
    try {
      const { accountId } = req.params;
      const lists = await storage.getListsByAccount(accountId);
      res.json(lists);
    } catch (error) {
      console.error("Error fetching lists:", error);
      res.status(500).json({ error: "Failed to fetch lists" });
    }
  });

  // Add a list by ID (looks up list name from HubSpot)
  const addListSchema = z.object({
    accountId: z.string().min(1, "Account ID is required"),
    listId: z.string().min(1, "List ID is required")
  });

  app.post("/api/hubspot/lists", async (req, res) => {
    try {
      const parseResult = addListSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors[0]?.message || "Invalid request" });
      }

      const { accountId, listId } = parseResult.data;

      // Get API key for this account
      const apiKey = await getApiKeyForAccount(accountId);
      if (!apiKey) {
        return res.status(400).json({ error: "Could not find API key for account" });
      }

      // Look up list name from HubSpot
      const listInfo = await getListById(apiKey, listId);
      let listName = "Unknown List";
      let hubspotListId = listId;

      if ('name' in listInfo) {
        listName = listInfo.name;
        hubspotListId = listInfo.listId;
      }

      // Save the list
      const list = await storage.createList({
        hubspotAccountId: accountId,
        listId: hubspotListId,
        listName: listName
      });

      res.json(list);
    } catch (error) {
      console.error("Error adding list:", error);
      res.status(500).json({ error: "Failed to add list" });
    }
  });

  // Delete a list
  app.delete("/api/hubspot/lists/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteList(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting list:", error);
      res.status(500).json({ error: "Failed to delete list" });
    }
  });

  // ==========================================
  // Form Goals
  // ==========================================

  // Get goals for a specific form
  app.get("/api/form-goals/:formId", async (req, res) => {
    try {
      const { formId } = req.params;
      const goals = await storage.getFormGoalsByForm(formId);
      res.json(goals);
    } catch (error) {
      console.error("Error fetching form goals:", error);
      res.status(500).json({ error: "Failed to fetch form goals" });
    }
  });

  // Get goal for a specific form and year
  app.get("/api/form-goals/:formId/:year", async (req, res) => {
    try {
      const { formId, year } = req.params;
      const goal = await storage.getFormGoalByFormAndYear(formId, parseInt(year));
      res.json(goal || null);
    } catch (error) {
      console.error("Error fetching form goal:", error);
      res.status(500).json({ error: "Failed to fetch form goal" });
    }
  });

  // Create or update form goals
  const formGoalSchema = z.object({
    formId: z.string().min(1, "Form ID is required"),
    year: z.number().int().min(2020).max(2100),
    q1Goal: z.number().int().min(0).optional().default(0),
    q2Goal: z.number().int().min(0).optional().default(0),
    q3Goal: z.number().int().min(0).optional().default(0),
    q4Goal: z.number().int().min(0).optional().default(0),
  });

  app.post("/api/form-goals", async (req, res) => {
    try {
      const parseResult = formGoalSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors[0]?.message || "Invalid request" });
      }

      const goal = await storage.upsertFormGoal(parseResult.data);
      res.json(goal);
    } catch (error) {
      console.error("Error saving form goal:", error);
      res.status(500).json({ error: "Failed to save form goal" });
    }
  });

  // ==========================================
  // KPI Goals
  // ==========================================

  // Get goals for an account
  app.get("/api/kpi-goals/:accountId", async (req, res) => {
    try {
      const { accountId } = req.params;
      const goals = await storage.getKpiGoalsByAccount(accountId);
      res.json(goals);
    } catch (error) {
      console.error("Error fetching KPI goals:", error);
      res.status(500).json({ error: "Failed to fetch KPI goals" });
    }
  });

  const integerOrStringSchema = z.union([z.number().int(), z.string().regex(/^\d+$/).transform(v => parseInt(v))]);

  // Create or update KPI goals
  const kpiGoalSchema = z.object({
    hubspotAccountId: z.string().min(1, "Account ID is required"),
    metric: z.string().min(1, "Metric name is required"),
    year: z.number().int().min(2020).max(2100),
    q1Goal: integerOrStringSchema.optional().default(0),
    q2Goal: integerOrStringSchema.optional().default(0),
    q3Goal: integerOrStringSchema.optional().default(0),
    q4Goal: integerOrStringSchema.optional().default(0),
  });

  // Since some KPI goals might be currency or large numbers, let's keep it simple with integers for now
  app.post("/api/kpi-goals", async (req, res) => {
    try {
      const parseResult = kpiGoalSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors[0]?.message || "Invalid request" });
      }

      const goal = await storage.upsertKpiGoal(parseResult.data);
      res.json(goal);
    } catch (error) {
      console.error("Error saving KPI goal:", error);
      res.status(500).json({ error: "Failed to save KPI goal" });
    }
  });

  // ==========================================
  // Deal Display Settings & Pipelines
  // ==========================================

  // Get available pipelines from HubSpot
  app.get("/api/hubspot/pipelines/:accountId", async (req, res) => {
    try {
      const { accountId } = req.params;
      const apiKey = await getApiKeyForAccount(accountId);
      if (!apiKey) {
        return res.status(400).json({ error: "Could not find API key for account" });
      }

      console.log(`Fetching pipelines for account ${accountId}...`);
      const pipelines = await getDealPipelines(apiKey);
      res.json(pipelines);
    } catch (error) {
      console.error("Error fetching pipelines:", error);
      res.status(500).json({ error: "Failed to fetch pipelines" });
    }
  });

  // Get deal display settings
  app.get("/api/deal-display-settings/:accountId", async (req, res) => {
    try {
      const { accountId } = req.params;
      const settings = await storage.getDealDisplaySettings(accountId);
      res.json(settings || { showNewDeals: "true", selectedPipelines: [] });
    } catch (error) {
      console.error("Error fetching deal display settings:", error);
      res.status(500).json({ error: "Failed to fetch deal display settings" });
    }
  });

  // Save deal display settings
  const dealDisplaySettingsSchema = z.object({
    hubspotAccountId: z.string().min(1, "Account ID is required"),
    showNewDeals: z.string().optional().default("true"),
    selectedPipelines: z.array(z.string()).optional().default([]),
  });

  app.post("/api/deal-display-settings", async (req, res) => {
    try {
      const parseResult = dealDisplaySettingsSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors[0]?.message || "Invalid request" });
      }

      const settings = await storage.upsertDealDisplaySettings(parseResult.data);
      res.json(settings);
    } catch (error) {
      console.error("Error saving deal display settings:", error);
      res.status(500).json({ error: "Failed to save deal display settings" });
    }
  });

  // Get pipeline goals for an account
  app.get("/api/pipeline-goals/:accountId", async (req, res) => {
    try {
      const { accountId } = req.params;
      const goals = await storage.getPipelineGoalsByAccount(accountId);
      res.json(goals);
    } catch (error) {
      console.error("Error fetching pipeline goals:", error);
      res.status(500).json({ error: "Failed to fetch pipeline goals" });
    }
  });

  // Save pipeline goal
  const pipelineGoalSchema = z.object({
    hubspotAccountId: z.string().min(1, "Account ID is required"),
    pipelineId: z.string().min(1, "Pipeline ID is required"),
    pipelineName: z.string().min(1, "Pipeline name is required"),
    year: z.number().min(2020).max(2100),
    q1Goal: integerOrStringSchema.optional().default(0),
    q2Goal: integerOrStringSchema.optional().default(0),
    q3Goal: integerOrStringSchema.optional().default(0),
    q4Goal: integerOrStringSchema.optional().default(0),
    q1ValueGoal: integerOrStringSchema.optional().default(0),
    q2ValueGoal: integerOrStringSchema.optional().default(0),
    q3ValueGoal: integerOrStringSchema.optional().default(0),
    q4ValueGoal: integerOrStringSchema.optional().default(0),
  });

  app.post("/api/pipeline-goals", async (req, res) => {
    try {
      const parseResult = pipelineGoalSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors[0]?.message || "Invalid request" });
      }

      const goal = await storage.upsertPipelineGoal(parseResult.data);
      res.json(goal);
    } catch (error) {
      console.error("Error saving pipeline goal:", error);
      res.status(500).json({ error: "Failed to save pipeline goal" });
    }
  });

  // ==========================================
  // Google Analytics
  // ==========================================

  // Check if GA service account is configured at the server level
  app.get("/api/google-analytics/status", (req, res) => {
    res.json({ 
      configured: isGoogleAnalyticsConfigured(),
      message: isGoogleAnalyticsConfigured() 
        ? "Google Analytics service account is configured" 
        : "Google Analytics service account not configured. Set GOOGLE_SERVICE_ACCOUNT_KEY environment variable."
    });
  });

  // Get GA config for an account
  app.get("/api/google-analytics/config/:accountId", async (req, res) => {
    try {
      const { accountId } = req.params;
      const config = await storage.getGoogleAnalyticsConfig(accountId);
      res.json(config || null);
    } catch (error) {
      console.error("Error fetching GA config:", error);
      res.status(500).json({ error: "Failed to fetch Google Analytics config" });
    }
  });

  // Save GA config
  const gaConfigSchema = z.object({
    hubspotAccountId: z.string().min(1, "Account ID is required"),
    propertyId: z.string().min(1, "Property ID is required"),
  });

  app.post("/api/google-analytics/config", async (req, res) => {
    try {
      const parseResult = gaConfigSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors[0]?.message || "Invalid request" });
      }

      const config = await storage.upsertGoogleAnalyticsConfig(parseResult.data);
      res.json(config);
    } catch (error) {
      console.error("Error saving GA config:", error);
      res.status(500).json({ error: "Failed to save Google Analytics config" });
    }
  });

  // Get GA page views (quarterly)
  app.get("/api/google-analytics/pageviews/:accountId/:year", async (req, res) => {
    try {
      const { accountId, year } = req.params;
      
      const config = await storage.getGoogleAnalyticsConfig(accountId);
      if (!config) {
        return res.json({ Q1: 0, Q2: 0, Q3: 0, Q4: 0, total: 0, configured: false });
      }

      const pageViews = await getPageViewsQuarterly(config.propertyId, parseInt(year));
      res.json({ ...pageViews, configured: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch page views" });
    }
  });

  // Get GA channel breakdown
  app.get("/api/google-analytics/channels/:accountId/:year", async (req, res) => {
    try {
      const { accountId, year } = req.params;
      
      const config = await storage.getGoogleAnalyticsConfig(accountId);
      if (!config) {
        return res.json({ channels: [], configured: false });
      }

      const channels = await getChannelGroupBreakdown(config.propertyId, parseInt(year));
      res.json({ channels, configured: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch channel breakdown" });
    }
  });

  // ==========================================
  // Google Business Profile
  // ==========================================

  app.get("/api/google-business-profile/status", (req, res) => {
    res.json({ 
      configured: isGBPConfigured(),
      message: isGBPConfigured() 
        ? "Google Business Profile OAuth is configured" 
        : "Google Business Profile OAuth not configured. Set GBP_CLIENT_ID and GBP_CLIENT_SECRET environment variables."
    });
  });

  app.get("/api/google-business-profile/config/:accountId", async (req, res) => {
    try {
      const { accountId } = req.params;
      const config = await storage.getGoogleBusinessProfileConfig(accountId);
      
      if (config && config.isManualEntry === "true") {
        // Manual entry mode
        res.json({
          configured: true,
          connected: true,
          isManualEntry: true,
          businessName: config.businessName || null,
          averageRating: config.averageRating || null,
          totalReviewCount: config.totalReviewCount || null,
          businessAddress: config.businessAddress || null,
          businessPhone: config.businessPhone || null,
          businessWebsite: config.businessWebsite || null,
          mapsUri: config.mapsUri || null,
        });
      } else if (config && config.accessToken) {
        res.json({
          configured: true,
          connected: !!config.locationId,
          locationName: config.locationName || null,
          locationId: config.locationId || null,
          accountId: config.accountId || null,
          hasTokens: !!config.accessToken,
          isManualEntry: false,
        });
      } else {
        res.json({ configured: false, connected: false });
      }
    } catch (error) {
      console.error("Error fetching GBP config:", error);
      res.status(500).json({ error: "Failed to fetch Google Business Profile config" });
    }
  });

  app.get("/api/google-business-profile/auth-url/:accountId", (req, res) => {
    try {
      const { accountId } = req.params;
      const credentials = getGBPClientCredentials();
      
      if (!credentials) {
        return res.status(400).json({ error: "Google Business Profile OAuth not configured" });
      }

      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : 'http://localhost:5000';
      const redirectUri = `${baseUrl}/api/google-business-profile/callback`;
      const state = Buffer.from(JSON.stringify({ accountId })).toString('base64');
      
      const authUrl = getGBPAuthUrl(credentials.clientId, redirectUri, state);
      res.json({ authUrl });
    } catch (error) {
      console.error("Error generating GBP auth URL:", error);
      res.status(500).json({ error: "Failed to generate auth URL" });
    }
  });

  // Direct OAuth initiation endpoint - redirects to Google auth
  app.get("/api/google-business-profile/auth", (req, res) => {
    try {
      const { hubspotAccountId } = req.query;
      
      if (!hubspotAccountId) {
        return res.redirect("/settings?gbp_error=missing_account");
      }

      const credentials = getGBPClientCredentials();
      
      if (!credentials) {
        return res.redirect("/settings?gbp_error=not_configured");
      }

      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : 'http://localhost:5000';
      const redirectUri = `${baseUrl}/api/google-business-profile/callback`;
      const state = Buffer.from(JSON.stringify({ accountId: hubspotAccountId })).toString('base64');
      
      const authUrl = getGBPAuthUrl(credentials.clientId, redirectUri, state);
      res.redirect(authUrl);
    } catch (error) {
      console.error("Error starting GBP auth:", error);
      res.redirect("/settings?gbp_error=auth_failed");
    }
  });

  app.get("/api/google-business-profile/callback", async (req, res) => {
    try {
      const { code, state, error } = req.query;
      
      console.log("[GBP Callback] Received callback with:", { 
        hasCode: !!code, 
        hasState: !!state, 
        error: error || "none",
        fullQuery: req.query 
      });
      
      if (error) {
        console.error("[GBP Callback] OAuth error from Google:", error);
        return res.redirect("/settings?gbp_error=auth_denied");
      }

      if (!code || !state) {
        console.log("[GBP Callback] Missing params - redirecting to error page");
        return res.redirect("/settings?gbp_error=missing_params");
      }

      const credentials = getGBPClientCredentials();
      if (!credentials) {
        return res.redirect("/settings?gbp_error=not_configured");
      }

      let stateData: { accountId: string };
      try {
        stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
      } catch (e) {
        return res.redirect("/settings?gbp_error=invalid_state");
      }

      const baseUrl = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : 'http://localhost:5000';
      const redirectUri = `${baseUrl}/api/google-business-profile/callback`;

      console.log("[GBP Callback] Exchanging code for tokens...");
      const tokens = await exchangeCodeForTokens(
        code as string,
        credentials.clientId,
        credentials.clientSecret,
        redirectUri
      );

      if (!tokens) {
        console.error("[GBP Callback] Token exchange failed");
        return res.redirect("/settings?gbp_error=token_exchange_failed");
      }
      
      console.log("[GBP Callback] Token exchange successful, saving config...");

      const encryptedAccessToken = encrypt(tokens.accessToken);
      const encryptedRefreshToken = encrypt(tokens.refreshToken);
      const tokenExpiry = new Date(Date.now() + tokens.expiresIn * 1000);

      await storage.upsertGoogleBusinessProfileConfig({
        hubspotAccountId: stateData.accountId,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiry,
      });

      res.redirect("/settings?gbp_success=true");
    } catch (error) {
      console.error("GBP OAuth callback error:", error);
      res.redirect("/settings?gbp_error=callback_failed");
    }
  });

  app.get("/api/google-business-profile/accounts/:accountId", async (req, res) => {
    try {
      const { accountId } = req.params;
      const config = await storage.getGoogleBusinessProfileConfig(accountId);
      
      if (!config || !config.accessToken || !config.refreshToken) {
        return res.status(400).json({ error: "Not connected to Google Business Profile" });
      }

      let accessToken = decrypt(config.accessToken);
      
      if (config.tokenExpiry && new Date(config.tokenExpiry) < new Date()) {
        const credentials = getGBPClientCredentials();
        if (!credentials) {
          return res.status(400).json({ error: "OAuth not configured" });
        }
        
        const newTokens = await refreshAccessToken(
          decrypt(config.refreshToken),
          credentials.clientId,
          credentials.clientSecret
        );
        
        if (!newTokens) {
          return res.status(401).json({ error: "Failed to refresh token. Please reconnect." });
        }
        
        accessToken = newTokens.accessToken;
        const newExpiry = new Date(Date.now() + newTokens.expiresIn * 1000);
        await storage.updateGoogleBusinessProfileTokens(accountId, encrypt(accessToken), newExpiry);
      }

      const accounts = await listGBPAccounts(accessToken);
      res.json({ accounts });
    } catch (error) {
      console.error("Error fetching GBP accounts:", error);
      res.status(500).json({ error: "Failed to fetch Google Business Profile accounts" });
    }
  });

  app.get("/api/google-business-profile/locations/:accountId/:gbpAccountId", async (req, res) => {
    try {
      const { accountId, gbpAccountId } = req.params;
      const config = await storage.getGoogleBusinessProfileConfig(accountId);
      
      if (!config || !config.accessToken) {
        return res.status(400).json({ error: "Not connected to Google Business Profile" });
      }

      let accessToken = decrypt(config.accessToken);
      
      if (config.tokenExpiry && new Date(config.tokenExpiry) < new Date()) {
        const credentials = getGBPClientCredentials();
        if (!credentials) {
          return res.status(400).json({ error: "OAuth not configured" });
        }
        
        const newTokens = await refreshAccessToken(
          decrypt(config.refreshToken!),
          credentials.clientId,
          credentials.clientSecret
        );
        
        if (!newTokens) {
          return res.status(401).json({ error: "Failed to refresh token. Please reconnect." });
        }
        
        accessToken = newTokens.accessToken;
        const newExpiry = new Date(Date.now() + newTokens.expiresIn * 1000);
        await storage.updateGoogleBusinessProfileTokens(accountId, encrypt(accessToken), newExpiry);
      }

      const locations = await listGBPLocations(accessToken, gbpAccountId);
      res.json({ locations });
    } catch (error) {
      console.error("Error fetching GBP locations:", error);
      res.status(500).json({ error: "Failed to fetch locations" });
    }
  });

  app.post("/api/google-business-profile/select-location", async (req, res) => {
    try {
      const { hubspotAccountId, gbpAccountId, locationId, locationName } = req.body;
      
      const config = await storage.getGoogleBusinessProfileConfig(hubspotAccountId);
      if (!config) {
        return res.status(400).json({ error: "Not connected to Google Business Profile" });
      }

      await storage.upsertGoogleBusinessProfileConfig({
        hubspotAccountId,
        accountId: gbpAccountId,
        locationId,
        locationName,
        accessToken: config.accessToken,
        refreshToken: config.refreshToken,
        tokenExpiry: config.tokenExpiry,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error selecting GBP location:", error);
      res.status(500).json({ error: "Failed to select location" });
    }
  });

  app.delete("/api/google-business-profile/disconnect/:accountId", async (req, res) => {
    try {
      const { accountId } = req.params;
      await storage.deleteGoogleBusinessProfileConfig(accountId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error disconnecting GBP:", error);
      res.status(500).json({ error: "Failed to disconnect" });
    }
  });

  // Manual entry for GBP data (workaround when API is not approved)
  app.post("/api/google-business-profile/manual-entry/:accountId", async (req, res) => {
    try {
      const { accountId } = req.params;
      const { businessName, averageRating, totalReviewCount, businessAddress, businessPhone, businessWebsite, mapsUri } = req.body;
      
      await storage.upsertGoogleBusinessProfileConfig({
        hubspotAccountId: accountId,
        isManualEntry: "true",
        businessName,
        averageRating: averageRating?.toString() || null,
        totalReviewCount: totalReviewCount?.toString() || null,
        businessAddress,
        businessPhone,
        businessWebsite,
        mapsUri,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error saving manual GBP entry:", error);
      res.status(500).json({ error: "Failed to save business profile data" });
    }
  });

  app.get("/api/google-business-profile/data/:accountId", async (req, res) => {
    try {
      const { accountId } = req.params;
      const config = await storage.getGoogleBusinessProfileConfig(accountId);
      
      if (!config) {
        return res.json({ configured: false, data: null });
      }

      // Check if this is manual entry data
      if (config.isManualEntry === "true") {
        return res.json({
          configured: true,
          isManualEntry: true,
          data: {
            name: config.businessName,
            averageRating: config.averageRating ? parseFloat(config.averageRating) : null,
            totalReviewCount: config.totalReviewCount ? parseInt(config.totalReviewCount) : null,
            address: config.businessAddress,
            phone: config.businessPhone,
            website: config.businessWebsite,
            mapsUri: config.mapsUri,
          }
        });
      }

      // API-based data requires tokens and location
      if (!config.accessToken || !config.locationId) {
        return res.json({ configured: false, data: null });
      }

      let accessToken = decrypt(config.accessToken);
      
      if (config.tokenExpiry && new Date(config.tokenExpiry) < new Date()) {
        const credentials = getGBPClientCredentials();
        if (!credentials) {
          return res.json({ configured: false, data: null, error: "OAuth not configured" });
        }
        
        const newTokens = await refreshAccessToken(
          decrypt(config.refreshToken!),
          credentials.clientId,
          credentials.clientSecret
        );
        
        if (!newTokens) {
          return res.json({ configured: false, data: null, error: "Token refresh failed" });
        }
        
        accessToken = newTokens.accessToken;
        const newExpiry = new Date(Date.now() + newTokens.expiresIn * 1000);
        await storage.updateGoogleBusinessProfileTokens(accountId, encrypt(accessToken), newExpiry);
      }

      const businessInfo = await getGBPBusinessInfo(accessToken, config.locationId);
      res.json({ configured: true, data: businessInfo });
    } catch (error) {
      console.error("Error fetching GBP data:", error);
      res.status(500).json({ error: "Failed to fetch business profile data" });
    }
  });

  // ==========================================
  // Conversations
  // ==========================================

  app.post("/api/conversations", async (req, res) => {
    try {
      const { userId, hubspotAccountId, hubspotAccountName } = req.body;
      
      const conversation = await storage.createConversation({
        userId,
        hubspotAccountId,
        hubspotAccountName,
        title: null,
      });

      res.json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.get("/api/conversations/:id/messages", async (req, res) => {
    try {
      const { id } = req.params;
      const messages = await storage.getMessagesByConversation(id);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // ==========================================
  // Learned Context
  // ==========================================

  app.get("/api/learned-context/:hubspotAccountId", async (req, res) => {
    try {
      const { hubspotAccountId } = req.params;
      const context = await storage.getLearnedContextByAccount(hubspotAccountId);
      res.json(context);
    } catch (error) {
      console.error("Error fetching learned context:", error);
      res.status(500).json({ error: "Failed to fetch learned context" });
    }
  });

  // ==========================================
  // Chat
  // ==========================================

  app.post("/api/chat", async (req, res) => {
    try {
      const { conversationId, content, userId } = req.body;
      
      if (!content || !conversationId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const conversation = await storage.getConversationById(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      // Get API key for this HubSpot account
      const apiKey = await getApiKeyForAccount(conversation.hubspotAccountId);

      const userMessage = await storage.createMessage({
        conversationId,
        role: "user",
        content,
      });

      const history = await storage.getMessagesByConversation(conversationId);
      const learnedContext = await storage.getLearnedContextByAccount(conversation.hubspotAccountId);

      // Fetch comprehensive HubSpot data if we have an API key
      let hubspotData: any = null;
      let hubspotError: string | null = null;
      
      if (apiKey) {
        try {
          hubspotData = await getComprehensiveData(apiKey);
        } catch (error: any) {
          console.error("Error fetching HubSpot data:", error);
          hubspotError = error.body?.category === 'MISSING_SCOPES'
            ? "The HubSpot Private App is missing required scopes. Please add 'crm.objects.deals.read', 'crm.objects.contacts.read', and 'crm.objects.companies.read' scopes in HubSpot Settings > Private Apps."
            : "Unable to fetch data from HubSpot: " + (error.body?.message || error.message);
        }
      } else {
        hubspotError = "No API key found for this HubSpot account.";
      }

      const aiResponse = await analyzeWithAI({
        conversationHistory: history.slice(-10),
        learnedContext,
        hubspotData,
        hubspotError,
        userQuery: content,
      });

      const assistantMessage = await storage.createMessage({
        conversationId,
        role: "assistant",
        content: aiResponse,
      });

      const learning = extractLearning(content, aiResponse);
      if (learning.detected && learning.key && learning.value) {
        await storage.createLearnedContext({
          conversationId,
          hubspotAccountId: conversation.hubspotAccountId,
          contextType: learning.contextType || "terminology",
          key: learning.key,
          value: learning.value,
          metadata: null,
        });
      }

      res.json({ 
        userMessage, 
        assistantMessage,
        learned: learning.detected 
      });
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ error: "Chat failed" });
    }
  });

  // ==========================================
  // Reports
  // ==========================================

  app.post("/api/reports/generate", async (req, res) => {
    try {
      const { conversationId, hubspotAccountId, year, focusAreas } = req.body;
      const reportYear = year || new Date().getFullYear();
      
      const sanitizedFocusAreas = typeof focusAreas === 'string' && focusAreas.length <= 2000 
        ? focusAreas.trim() 
        : undefined;

      const apiKey = await getApiKeyForAccount(hubspotAccountId);
      
      if (!apiKey) {
        return res.status(400).json({ error: "HubSpot account not configured or API key missing" });
      }

      // Load deal display settings to get pipeline filter
      const dealDisplaySettings = await storage.getDealDisplaySettings(hubspotAccountId);
      const pipelineFilter = dealDisplaySettings?.selectedPipelines || [];

      // Use comprehensive data with pre-calculated summaries for the specified year
      const hubspotData = await getComprehensiveData(apiKey, undefined, reportYear, pipelineFilter);
      const learnedContext = await storage.getLearnedContextByAccount(hubspotAccountId);
      
      // Fetch form submissions for saved forms for the specified year
      const savedForms = await storage.getFormsByAccount(hubspotAccountId);
      const formSubmissionsData: Array<{
        formName: string;
        formGuid: string;
        Q1: number;
        Q2: number;
        Q3: number;
        Q4: number;
        total: number;
        q1Goal: number;
        q2Goal: number;
        q3Goal: number;
        q4Goal: number;
        yearGoalTotal: number;
      }> = [];
      
      for (const form of savedForms) {
        const submissions = await getFormSubmissionsQuarterly(apiKey, form.formGuid, reportYear);
        
        // Fetch goals for this form and year
        const formGoal = await storage.getFormGoalByFormAndYear(form.id, reportYear);
        const q1Goal = formGoal?.q1Goal ?? 0;
        const q2Goal = formGoal?.q2Goal ?? 0;
        const q3Goal = formGoal?.q3Goal ?? 0;
        const q4Goal = formGoal?.q4Goal ?? 0;
        
        formSubmissionsData.push({
          formName: form.formName,
          formGuid: form.formGuid,
          ...submissions,
          q1Goal,
          q2Goal,
          q3Goal,
          q4Goal,
          yearGoalTotal: q1Goal + q2Goal + q3Goal + q4Goal
        });
      }
      
      // Fetch saved lists with their member counts
      const savedLists = await storage.getListsByAccount(hubspotAccountId);
      const listsData: Array<{
        listId: string;
        listName: string;
        memberCount: number;
      }> = [];
      
      for (const list of savedLists) {
        // Fetch fresh member count from HubSpot
        const listDetails = await getListById(apiKey, list.listId);
        
        // Use type guard to check for successful response
        if ('name' in listDetails && 'size' in listDetails) {
          listsData.push({
            listId: list.listId,
            listName: listDetails.name || list.listName,
            memberCount: typeof listDetails.size === 'number' ? listDetails.size : 0
          });
        } else {
          // Error response - use stored data with 0 count
          listsData.push({
            listId: list.listId,
            listName: list.listName,
            memberCount: 0
          });
        }
      }
      
      // Fetch Google Analytics data if configured
      let gaPageViews = { Q1: 0, Q2: 0, Q3: 0, Q4: 0, total: 0 };
      let gaChannels: any[] = [];
      const gaConfig = await storage.getGoogleAnalyticsConfig(hubspotAccountId);
      if (gaConfig && gaConfig.propertyId) {
        try {
          gaPageViews = await getPageViewsQuarterly(gaConfig.propertyId, reportYear);
          gaChannels = await getChannelGroupBreakdown(gaConfig.propertyId, reportYear);
        } catch (err) {
          // Silent catch for GA data errors
        }
      }

      // Fetch lifecycle stage breakdown
      let lifecycleData = await getLifecycleStageBreakdown(apiKey, reportYear);

      // Fetch Google Business Profile data if configured
      let gbpData: any = null;
      try {
        const gbpConfig = await storage.getGoogleBusinessProfileConfig(hubspotAccountId);
        if (gbpConfig && gbpConfig.accessToken && gbpConfig.locationId) {
          let accessToken = decrypt(gbpConfig.accessToken);
          
          if (gbpConfig.tokenExpiry && new Date(gbpConfig.tokenExpiry) < new Date()) {
            const credentials = getGBPClientCredentials();
            if (credentials && gbpConfig.refreshToken) {
              const newTokens = await refreshAccessToken(
                decrypt(gbpConfig.refreshToken),
                credentials.clientId,
                credentials.clientSecret
              );
              
              if (newTokens) {
                accessToken = newTokens.accessToken;
                const newExpiry = new Date(Date.now() + newTokens.expiresIn * 1000);
                await storage.updateGoogleBusinessProfileTokens(hubspotAccountId, encrypt(accessToken), newExpiry);
              }
            }
          }

          gbpData = await getGBPBusinessInfo(accessToken, gbpConfig.locationId);
        }
      } catch (err) {
        // Silent catch for GBP data errors
      }

      const showNewDeals = dealDisplaySettings?.showNewDeals === "true";
      const reportData = await generateReport(hubspotData, learnedContext, { pageViews: gaPageViews, channels: gaChannels }, sanitizedFocusAreas, { showNewDeals });
      
      // Add extra data to report object
      reportData.formSubmissions = formSubmissionsData;
      reportData.hubspotLists = listsData;
      reportData.gaChannels = gaChannels;
      reportData.gaPageViews = gaPageViews;
      reportData.lifecycleStages = lifecycleData;
      reportData.googleBusinessProfile = gbpData;

      const report = await storage.createReport({
        conversationId: conversationId || null,
        hubspotAccountId,
        title: reportData.title || "Generated Report",
        reportData,
      });

      res.json(report);
    } catch (error) {
      console.error("Report generation error:", error);
      res.status(500).json({ error: "Failed to generate report" });
    }
  });

  app.get("/api/reports/:hubspotAccountId", async (req, res) => {
    try {
      const { hubspotAccountId } = req.params;
      const reports = await storage.getReportsByAccount(hubspotAccountId);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });

  app.post("/api/reports/ask", async (req, res) => {
    try {
      const { hubspotAccountId, question, reportContext, year } = req.body;

      if (!question || !hubspotAccountId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (typeof question !== 'string' || question.length > 2000) {
        return res.status(400).json({ error: "Invalid question format or length" });
      }

      const apiKey = await getApiKeyForAccount(hubspotAccountId);
      let hubspotData = null;
      
      if (apiKey) {
        try {
          // Load deal display settings to get pipeline filter
          const dealDisplaySettings = await storage.getDealDisplaySettings(hubspotAccountId);
          const pipelineFilter = dealDisplaySettings?.selectedPipelines || [];
          hubspotData = await getComprehensiveData(apiKey, undefined, year || new Date().getFullYear(), pipelineFilter);
        } catch (err) {
          // Silent catch for HubSpot data errors in Q&A
        }
      }

      const sanitizedContext = reportContext ? {
        verifiedData: reportContext.verifiedData,
        dealsByStage: reportContext.dealsByStage,
        dealsByOwner: reportContext.dealsByOwner,
        revenueInsights: reportContext.revenueInsights,
        leadGenInsights: reportContext.leadGenInsights,
        kpiTable: reportContext.kpiTable
      } : null;

      const answer = await answerReportQuestion(
        question.trim(),
        sanitizedContext,
        hubspotData,
        year || new Date().getFullYear()
      );

      res.json({ answer });
    } catch (error) {
      console.error("Report Q&A error:", error);
      res.status(500).json({ error: "Failed to answer question" });
    }
  });

  // ==========================================
  // Lifecycle Stages
  // ==========================================

  app.get("/api/hubspot/lifecycle-stages/:accountId", async (req, res) => {
    try {
      const { accountId } = req.params;
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      
      const apiKey = await getApiKeyForAccount(accountId);
      if (!apiKey) {
        return res.status(400).json({ error: "HubSpot account not configured" });
      }
      
      const lifecycleData = await getLifecycleStageBreakdown(apiKey, year);
      res.json(lifecycleData);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch lifecycle stages" });
    }
  });

  // ==========================================
  // HubSpot Data (direct access)
  // ==========================================

  app.get("/api/hubspot/deals/:accountId", async (req, res) => {
    try {
      const { accountId } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;
      
      const apiKey = await getApiKeyForAccount(accountId);
      if (!apiKey) {
        return res.status(400).json({ error: "HubSpot account not configured" });
      }
      
      const deals = await getDeals(apiKey, limit);
      res.json(deals);
    } catch (error) {
      console.error("Error fetching deals:", error);
      res.status(500).json({ error: "Failed to fetch deals" });
    }
  });

  // ==========================================
  // ProoferBot - Email Proofreading
  // ==========================================

  // Get marketing emails for selection
  app.get("/api/prooferbot/emails/:accountId", async (req, res) => {
    try {
      const { accountId } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;

      const apiKey = await getApiKeyForAccount(accountId);
      if (!apiKey) {
        return res.status(400).json({ error: "HubSpot account not configured or API key missing" });
      }

      const emails = await getMarketingEmails(apiKey, limit);
      res.json(emails);
    } catch (error: any) {
      console.error("Error fetching marketing emails:", error);
      res.status(500).json({ error: error.message || "Failed to fetch marketing emails" });
    }
  });

  // Analyze selected emails
  app.post("/api/prooferbot/analyze", async (req, res) => {
    try {
      const { accountId, emailIds } = req.body;

      if (!accountId || !emailIds || !Array.isArray(emailIds) || emailIds.length === 0) {
        return res.status(400).json({ error: "Missing accountId or emailIds array" });
      }

      if (emailIds.length > 20) {
        return res.status(400).json({ error: "Maximum 20 emails can be analyzed at once" });
      }

      const apiKey = await getApiKeyForAccount(accountId);
      if (!apiKey) {
        return res.status(400).json({ error: "HubSpot account not configured or API key missing" });
      }

      // Fetch full details for each email
      const emailDetails = await Promise.all(
        emailIds.map(async (id: string, index: number) => {
          try {
            const details = await getMarketingEmailDetails(apiKey, id);
            
            let html = details.htmlContent;
            let contentSource = 'api_extracted';
            
            // If extracted HTML is empty or very short, try the Preview endpoint
            if (!html || html.length < 100) {
              try {
                console.log(`[ProoferBot] Fetching preview for email ${id} (extracted HTML was ${html?.length || 0} bytes)...`);
                const previewResponse = await fetch(`https://api.hubapi.com/marketing/v3/emails/${id}/preview`, {
                  method: 'POST',
                  headers: { 
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({})
                } as any);

                if (previewResponse.ok) {
                  const previewData = await previewResponse.json() as any;
                  if (previewData.html && previewData.html.length > (html?.length || 0)) {
                    html = previewData.html;
                    contentSource = 'preview_endpoint';
                    console.log(`[ProoferBot] Successfully fetched Preview HTML (${html.length} bytes)`);
                  }
                } else {
                  console.warn(`[ProoferBot] Preview fetch failed with status ${previewResponse.status}`);
                }
              } catch (err) {
                console.warn(`[ProoferBot] Preview endpoint error for ${id}:`, err);
              }
            } else {
              console.log(`[ProoferBot] Using extracted HTML for email ${id} (${html.length} bytes)`);
            }
            
            // Final fallback: Web version URL
            if ((!html || html.length < 100) && details.webversionUrl) {
              try {
                console.log(`[ProoferBot] Falling back to webversion for email ${id}: ${details.webversionUrl}`);
                const response = await fetch(details.webversionUrl, { 
                  headers: { 'User-Agent': 'ProoferBot/1.0' }
                } as any);
                if (response.ok) {
                  const webHtml = await response.text();
                  if (webHtml.length > (html?.length || 0)) {
                    html = webHtml;
                    contentSource = 'webversion';
                    console.log(`[ProoferBot] Successfully fetched webversion HTML (${html.length} bytes)`);
                  }
                }
              } catch (fetchErr) {
                console.warn(`[ProoferBot] Error fetching webversion for ${id}:`, fetchErr);
              }
            }

            // Extract links from the fetched HTML
            let extractedLinks: { text: string; url: string }[] = [];
            if (html) {
              const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1[^>]*?>(.*?)<\/a>/gi;
              let match;
              while ((match = linkRegex.exec(html)) !== null) {
                const url = match[2];
                const text = match[3].replace(/<[^>]*>?/gm, '').trim();
                if (url && !url.startsWith('mailto:') && !url.startsWith('tel:') && !url.startsWith('javascript:')) {
                  extractedLinks.push({
                    url,
                    text: text || "[Button/Image Link]"
                  });
                }
              }
            }

            console.log(`[ProoferBot] Processed email ${id}: ${extractedLinks.length} links, HTML length: ${html?.length || 0}`);

            // Truncate HTML if extremely large (>75KB)
            let htmlTruncated = false;
            if (html && html.length > 75000) {
              html = html.substring(0, 75000);
              htmlTruncated = true;
            }

            return {
              emailLabel: String.fromCharCode(65 + index), // A, B, C...
              hubspotId: details.id,
              name: details.name,
              subject: details.subject,
              previewText: details.previewText,
              html: html || null,
              plainText: details.plainTextContent || null,
              extractedLinks: extractedLinks.slice(0, 50), // Limit links
              webversionUrl: details.webversionUrl, // Pass URL to frontend
              metadata: {
                campaignName: details.campaignName || null,
                sendDate: details.sendDate || null,
                state: details.state,
                htmlTruncated,
                source: contentSource
              }
            };
          } catch (err: any) {
            return {
              emailLabel: String.fromCharCode(65 + index),
              hubspotId: id,
              error: `Failed to fetch email: ${err.message}`
            };
          }
        })
      );

      // Check if all emails failed
      const successfulEmails = emailDetails.filter(e => !('error' in e));
      if (successfulEmails.length === 0) {
        return res.status(400).json({ error: "Failed to fetch any email details" });
      }

      // Build user message for OpenAI
      const userMessage = JSON.stringify({
        emailCount: successfulEmails.length,
        emails: emailDetails
      }, null, 2);

      // Call OpenAI
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const completion = await openai.chat.completions.create({
        model: PROOFERBOT_MODEL_SETTINGS.model,
        temperature: PROOFERBOT_MODEL_SETTINGS.temperature,
        max_tokens: PROOFERBOT_MODEL_SETTINGS.maxTokens,
        messages: [
          { role: "system", content: PROOFERBOT_SYSTEM_PROMPT },
          { role: "user", content: userMessage }
        ]
      });

      const output = completion.choices[0]?.message?.content || "";

      res.json({ 
        output,
        emailCount: successfulEmails.length,
        failedEmails: emailDetails.filter(e => 'error' in e)
      });
    } catch (error: any) {
      console.error("ProoferBot analyze error:", error);
      res.status(500).json({ error: error.message || "Failed to analyze emails" });
    }
  });

  return httpServer;
}
