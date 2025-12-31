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
  getListById
} from "./hubspot-client";
import { analyzeWithAI, generateReport, extractLearning } from "./ai-service";
import { encrypt, decrypt } from "./encryption";
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
  
  // Auth - Login/Create User
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email || !email.endsWith("@vye.agency")) {
        return res.status(401).json({ error: "Invalid email. Must be @vye.agency" });
      }

      let user = await storage.getUserByEmail(email);
      if (!user) {
        const name = email.split("@")[0].split(".").map((n: string) => 
          n.charAt(0).toUpperCase() + n.slice(1)
        ).join(" ");
        
        user = await storage.createUser({ email, name });
      }

      req.session.userId = user.id;
      res.json({ user });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

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
      console.error("Error fetching available forms:", error);
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
      if ('error' in listInfo && !('name' in listInfo)) {
        return res.status(400).json({ error: listInfo.error });
      }

      // Save the list
      const list = await storage.createList({
        hubspotAccountId: accountId,
        listId: (listInfo as any).listId,
        listName: (listInfo as any).name
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
      const { conversationId, hubspotAccountId, year } = req.body;
      const reportYear = year || new Date().getFullYear();

      const apiKey = await getApiKeyForAccount(hubspotAccountId);
      
      if (!apiKey) {
        return res.status(400).json({ error: "HubSpot account not configured or API key missing" });
      }

      // Use comprehensive data with pre-calculated summaries for the specified year
      const hubspotData = await getComprehensiveData(apiKey, undefined, reportYear);
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
      }> = [];
      
      for (const form of savedForms) {
        const submissions = await getFormSubmissionsQuarterly(apiKey, form.formGuid, reportYear);
        formSubmissionsData.push({
          formName: form.formName,
          formGuid: form.formGuid,
          ...submissions
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
          console.warn(`Failed to fetch list details for ${list.listId}:`, listDetails.error);
          listsData.push({
            listId: list.listId,
            listName: list.listName,
            memberCount: 0
          });
        }
      }
      
      const reportData = await generateReport(hubspotData, learnedContext);
      
      // Add form submissions and lists to report data
      (reportData as any).formSubmissions = formSubmissionsData;
      (reportData as any).hubspotLists = listsData;

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

  return httpServer;
}
