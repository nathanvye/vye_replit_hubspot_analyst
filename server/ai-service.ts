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

  const systemPrompt = `You are an expert HubSpot data analyst for Vye Agency. The system provides you with HubSpot CRM data to analyze.

CRITICAL INSTRUCTIONS:
- You receive HubSpot data that has already been fetched for you
- NEVER say "let me fetch" or "I'll pull" or promise to get more data - you cannot make additional API calls
- ONLY analyze the data provided to you in this conversation
- Do NOT ask users to export data or manually look things up
- If you need fields that aren't included in the data, tell the user what information is missing

When users teach you new terminology or definitions (e.g., "we call X deals Y instead"), acknowledge that you've learned it and will use it going forward.

Your capabilities with provided data:
- Analyze deal pipelines, revenue trends, conversion rates, and deal ownership
- Review contact and company information
- Identify bottlenecks and opportunities
- Generate actionable recommendations
- Remember custom terminology and context specific to this account

Always provide specific, data-driven insights based on the actual data you receive. When you identify a pattern or trend, quantify it.
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

  // Calculate actual stats from the data
  const dealCount = hubspotData.deals?.length || 0;
  const contactCount = hubspotData.contacts?.length || 0;
  const companyCount = hubspotData.companies?.length || 0;
  const totalDealValue = hubspotData.deals?.reduce((sum: number, d: any) => sum + (parseFloat(d.properties?.amount) || 0), 0) || 0;

  const prompt = `Analyze the following HubSpot data and generate a report.

CRITICAL RULES:
- ONLY use numbers and facts from the actual data below
- DO NOT invent, estimate, or fabricate any numbers
- If the data doesn't contain certain metrics, say "Data not available" instead of making up numbers
- The actual counts are: ${dealCount} deals, ${contactCount} contacts, ${companyCount} companies, total deal value: $${totalDealValue.toFixed(2)}

HubSpot Data:
${JSON.stringify(hubspotData, null, 2)}
${learnedContextPrompt}

Generate a report with these sections based ONLY on the actual data:
1. Data Summary - exact counts and values from the data
2. Deal Analysis - analyze only the deals provided
3. Contact Analysis - analyze only the contacts provided  
4. Recommendations - based on the actual data patterns

Return as JSON:
{
  "title": "HubSpot Data Report",
  "subtitle": "Analysis of ${dealCount} deals, ${contactCount} contacts",
  "dataSummary": { "deals": ${dealCount}, "contacts": ${contactCount}, "companies": ${companyCount}, "totalDealValue": ${totalDealValue} },
  "dealAnalysis": [...],
  "contactAnalysis": [...],
  "recommendations": [...]
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { 
        role: 'system', 
        content: 'You are a data analyst. ONLY report facts from the provided data. NEVER invent or estimate numbers. If data is missing, say so. Always return valid JSON.' 
      },
      { role: 'user', content: prompt }
    ],
    temperature: 0.2,
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
