import OpenAI from 'openai';
import type { LearnedContext, Message } from '@shared/schema';

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface AnalysisContext {
  conversationHistory: Message[];
  learnedContext: LearnedContext[];
  hubspotData?: any;
  hubspotError?: string | null;
  userQuery: string;
}

export async function analyzeWithAI(context: AnalysisContext): Promise<string> {
  const { conversationHistory, learnedContext, hubspotData, hubspotError, userQuery } = context;

  // Build system prompt with learned context
  const learnedContextPrompt = learnedContext.length > 0
    ? `\n\nLearned Context and Custom Terminology:\n${learnedContext.map(lc => 
        `- ${lc.contextType}: "${lc.key}" = ${lc.value}`
      ).join('\n')}`
    : '';

  const systemPrompt = `You are an expert HubSpot data analyst for Vye Agency. You are directly connected to the user's HubSpot CRM via API and can pull real-time data to answer their questions.

IMPORTANT: You have direct API access to HubSpot. Do NOT ask users to export data or manually look things up. When you receive HubSpot data in your context, analyze it directly and provide insights.

When users teach you new terminology or definitions (e.g., "we call X deals Y instead"), acknowledge that you've learned it and will use it going forward.

Your capabilities:
- Pull and analyze deal pipelines, revenue trends, and conversion rates directly from HubSpot
- Access contact and company data from the CRM
- Identify bottlenecks and opportunities
- Generate actionable recommendations
- Remember custom terminology and context specific to this account

Always provide specific, data-driven insights. When you identify a pattern or trend, quantify it.
${learnedContextPrompt}`;

  // Build messages array with conversation history
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt }
  ];

  // Add conversation history (limited to last 10 messages to avoid token limits)
  const recentHistory = conversationHistory.slice(-10);
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    });
  }

  // Add current query with HubSpot data context if available
  let userContent = userQuery;
  if (hubspotData && Object.keys(hubspotData).length > 0) {
    userContent += `\n\n[HUBSPOT DATA - Analyze this directly]:\n${JSON.stringify(hubspotData, null, 2)}`;
  } else if (hubspotError) {
    userContent += `\n\n[HUBSPOT API ERROR]: ${hubspotError}\nPlease inform the user about this configuration issue and explain how to fix it.`;
  }
  
  messages.push({ role: 'user', content: userContent });

  // Call OpenAI
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
    temperature: 0.7,
    max_tokens: 1500,
  });

  return response.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response.';
}

export async function generateReport(hubspotData: any, context: LearnedContext[]): Promise<any> {
  const learnedContextPrompt = context.length > 0
    ? `\n\nUse these custom definitions:\n${context.map(lc => 
        `- ${lc.key}: ${lc.value}`
      ).join('\n')}`
    : '';

  const prompt = `Analyze the following HubSpot data and generate a comprehensive monthly report with these sections:

1. KPI Performance (format as table with projections vs actuals)
2. Revenue Generation insights
3. Lead Generation & Nurturing insights
4. Recommendations

HubSpot Data:
${JSON.stringify(hubspotData, null, 2)}
${learnedContextPrompt}

Return the response as a JSON object with this structure:
{
  "title": "Month Year Report",
  "subtitle": "Key Insights & Findings",
  "kpiData": [...],
  "revenueInsights": [...],
  "leadGenInsights": [...],
  "recommendations": [...]
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { 
        role: 'system', 
        content: 'You are a data analyst creating structured reports from HubSpot CRM data. Always return valid JSON.' 
      },
      { role: 'user', content: prompt }
    ],
    temperature: 0.5,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Failed to generate report');
  }

  return JSON.parse(content);
}

// Detect if user is teaching new context
export function extractLearning(userMessage: string, aiResponse: string): { 
  detected: boolean; 
  contextType?: string; 
  key?: string; 
  value?: string; 
} {
  const lowerMessage = userMessage.toLowerCase();
  
  // Pattern: "call X Y" or "we call X Y" or "refer to X as Y"
  const callPattern = /(we\s+)?(call|refer to)\s+(.+?)\s+(as\s+)?["']?([^"']+)["']?/i;
  const match = userMessage.match(callPattern);
  
  if (match) {
    return {
      detected: true,
      contextType: 'terminology',
      key: match[3].trim(),
      value: match[5].trim()
    };
  }

  // Pattern: "X means Y" or "X is Y"
  const meansPattern = /["']?([^"']+)["']?\s+(means?|is)\s+["']?([^"']+)["']?/i;
  const meansMatch = userMessage.match(meansPattern);
  
  if (meansMatch) {
    return {
      detected: true,
      contextType: 'definition',
      key: meansMatch[1].trim(),
      value: meansMatch[3].trim()
    };
  }

  return { detected: false };
}
