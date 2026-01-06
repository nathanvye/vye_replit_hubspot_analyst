// API client for backend communication

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Conversation {
  id: string;
  userId: string;
  hubspotAccountId: string;
  hubspotAccountName: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface HubSpotAccount {
  id: string;
  name: string;
  portalId: string | null;
  createdAt: string;
}

export interface LearnedContext {
  id: string;
  contextType: string;
  key: string;
  value: string;
}

export const api = {
  async login(email: string): Promise<{ user: User }> {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) throw new Error("Login failed");
    return res.json();
  },

  async getHubSpotAccounts(userId: string): Promise<HubSpotAccount[]> {
    const res = await fetch(`/api/hubspot/accounts/${userId}`);
    if (!res.ok) throw new Error("Failed to fetch accounts");
    return res.json();
  },

  async addHubSpotAccount(userId: string, name: string, apiKey: string): Promise<HubSpotAccount & { accountName?: string }> {
    const res = await fetch("/api/hubspot/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, name, apiKey }),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to add account");
    }
    return res.json();
  },

  async deleteHubSpotAccount(id: string): Promise<void> {
    const res = await fetch(`/api/hubspot/accounts/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete account");
  },

  async validateHubSpotApiKey(apiKey: string): Promise<{
    valid: boolean;
    portalId?: string;
    accountName?: string;
    error?: string;
  }> {
    const res = await fetch("/api/hubspot/validate-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey }),
    });
    if (!res.ok) throw new Error("Failed to validate API key");
    return res.json();
  },

  async createConversation(userId: string, hubspotAccountId: string, hubspotAccountName: string): Promise<Conversation> {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, hubspotAccountId, hubspotAccountName }),
    });
    if (!res.ok) throw new Error("Failed to create conversation");
    return res.json();
  },

  async getMessages(conversationId: string): Promise<Message[]> {
    const res = await fetch(`/api/conversations/${conversationId}/messages`);
    if (!res.ok) throw new Error("Failed to fetch messages");
    return res.json();
  },

  async sendMessage(conversationId: string, content: string, userId: string): Promise<{
    userMessage: Message;
    assistantMessage: Message;
    learned: boolean;
  }> {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, content, userId }),
    });
    if (!res.ok) throw new Error("Failed to send message");
    return res.json();
  },

  async generateReport(conversationId: string, hubspotAccountId: string, year?: number, focusAreas?: string): Promise<any> {
    const res = await fetch("/api/reports/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId, hubspotAccountId, year, focusAreas }),
    });
    if (!res.ok) throw new Error("Failed to generate report");
    return res.json();
  },

  async askReportQuestion(hubspotAccountId: string, question: string, reportContext: any, year: number): Promise<{ answer: string }> {
    const res = await fetch("/api/reports/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hubspotAccountId, question, reportContext, year }),
    });
    if (!res.ok) throw new Error("Failed to ask question");
    return res.json();
  },

  async getReports(hubspotAccountId: string): Promise<any[]> {
    const res = await fetch(`/api/reports/${hubspotAccountId}`);
    if (!res.ok) throw new Error("Failed to fetch reports");
    return res.json();
  },

  async getLearnedContext(hubspotAccountId: string): Promise<LearnedContext[]> {
    const res = await fetch(`/api/learned-context/${hubspotAccountId}`);
    if (!res.ok) throw new Error("Failed to fetch learned context");
    return res.json();
  },
};
