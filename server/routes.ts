import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getHubSpotAccounts, getDeals, getContacts, getCompanies, searchDeals } from "./hubspot-client";
import { analyzeWithAI, generateReport, extractLearning } from "./ai-service";
import { z } from "zod";

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
        // Auto-create user on first login
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

  // Get HubSpot accounts
  app.get("/api/hubspot/accounts", async (req, res) => {
    try {
      const accounts = await getHubSpotAccounts();
      res.json(accounts);
    } catch (error) {
      console.error("Error fetching HubSpot accounts:", error);
      res.status(500).json({ error: "Failed to fetch HubSpot accounts" });
    }
  });

  // Create or get conversation
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

  // Get conversation messages
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

  // Get learned context for account
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

  // Send chat message and get AI response
  app.post("/api/chat", async (req, res) => {
    try {
      const { conversationId, content, userId } = req.body;
      
      if (!content || !conversationId) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Get conversation
      const conversation = await storage.getConversationById(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }

      // Save user message
      const userMessage = await storage.createMessage({
        conversationId,
        role: "user",
        content,
      });

      // Get conversation history and learned context
      const history = await storage.getMessagesByConversation(conversationId);
      const learnedContext = await storage.getLearnedContextByAccount(conversation.hubspotAccountId);

      // Fetch relevant HubSpot data based on query
      let hubspotData = null;
      const lowerContent = content.toLowerCase();
      
      if (lowerContent.includes("deal") || lowerContent.includes("revenue") || lowerContent.includes("pipeline")) {
        try {
          hubspotData = { deals: await getDeals(50) };
        } catch (error) {
          console.error("Error fetching HubSpot deals:", error);
        }
      } else if (lowerContent.includes("contact") || lowerContent.includes("lead")) {
        try {
          hubspotData = { contacts: await getContacts(50) };
        } catch (error) {
          console.error("Error fetching HubSpot contacts:", error);
        }
      }

      // Analyze with AI
      const aiResponse = await analyzeWithAI({
        conversationHistory: history.slice(-10), // Last 10 messages for context
        learnedContext,
        hubspotData,
        userQuery: content,
      });

      // Save AI response
      const assistantMessage = await storage.createMessage({
        conversationId,
        role: "assistant",
        content: aiResponse,
      });

      // Check if user is teaching new context
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

  // Generate report
  app.post("/api/reports/generate", async (req, res) => {
    try {
      const { conversationId, hubspotAccountId } = req.body;

      // Fetch HubSpot data
      const [deals, contacts, companies] = await Promise.all([
        getDeals(100),
        getContacts(100),
        getCompanies(50),
      ]);

      const hubspotData = { deals, contacts, companies };

      // Get learned context
      const learnedContext = await storage.getLearnedContextByAccount(hubspotAccountId);

      // Generate report using AI
      const reportData = await generateReport(hubspotData, learnedContext);

      // Save report
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

  // Get reports for account
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

  // Get HubSpot deals
  app.get("/api/hubspot/deals", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const deals = await getDeals(limit);
      res.json(deals);
    } catch (error) {
      console.error("Error fetching deals:", error);
      res.status(500).json({ error: "Failed to fetch deals" });
    }
  });

  return httpServer;
}
