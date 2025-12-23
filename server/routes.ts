import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  getDeals, 
  getContacts, 
  getCompanies, 
  searchDeals,
  validateApiKeyAndGetAccountInfo,
  getComprehensiveData,
  getFormByGuid
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

      res.json({ user });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
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

  // Get forms for an account
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
  app.post("/api/hubspot/forms", async (req, res) => {
    try {
      const { accountId, formGuid } = req.body;
      
      if (!accountId || !formGuid) {
        return res.status(400).json({ error: "Account ID and form GUID are required" });
      }

      // Get API key for this account
      const apiKey = await getApiKeyForAccount(accountId);
      if (!apiKey) {
        return res.status(400).json({ error: "Could not find API key for account" });
      }

      // Look up form name from HubSpot
      const formInfo = await getFormByGuid(apiKey, formGuid);
      if (!formInfo) {
        return res.status(404).json({ error: "Form not found in HubSpot. Please check the form GUID." });
      }

      // Save the form
      const form = await storage.createForm({
        hubspotAccountId: accountId,
        formGuid: formInfo.formGuid,
        formName: formInfo.name
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
      const { conversationId, hubspotAccountId } = req.body;

      const apiKey = await getApiKeyForAccount(hubspotAccountId);
      
      if (!apiKey) {
        return res.status(400).json({ error: "HubSpot account not configured or API key missing" });
      }

      // Use comprehensive data with pre-calculated summaries
      const hubspotData = await getComprehensiveData(apiKey);
      const learnedContext = await storage.getLearnedContextByAccount(hubspotAccountId);
      const reportData = await generateReport(hubspotData, learnedContext);

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
