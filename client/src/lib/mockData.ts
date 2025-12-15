export const MOCK_ACCOUNTS = [
  { id: "acc_123", name: "Vye Agency - Main", type: "Enterprise" },
  { id: "acc_456", name: "Client A - Marketing", type: "Professional" },
  { id: "acc_789", name: "Client B - Sales", type: "Enterprise" },
  { id: "acc_101", name: "Vye - Sandbox", type: "Starter" },
];

export const SUGGESTED_PROMPTS = [
  "Analyze Q4 deal velocity compared to Q3",
  "Which deals have been in 'Negotiation' for > 30 days?",
  "Summarize the latest interactions with Acme Corp",
  "Forecast revenue for next month based on weighted pipeline",
];

export const INITIAL_MESSAGES = [
  {
    id: "msg_1",
    role: "assistant" as const,
    content: "Hello! I'm your Vye Agency Intelligence assistant. I've connected to your HubSpot data. What would you like to analyze today?",
    timestamp: new Date().toISOString(),
  },
];
