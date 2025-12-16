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

  // Build learned context prompt
  const learnedContextPrompt = learnedContext.length > 0
    ? `\n\nLearned Context and Custom Terminology:\n${learnedContext.map(lc => 
        `- ${lc.contextType}: "${lc.key}" = ${lc.value}`
      ).join('\n')}`
    : '';

  // Build data summary for system prompt
  let dataSummaryPrompt = '';
  if (hubspotData?.summary) {
    const s = hubspotData.summary;
    dataSummaryPrompt = `\n\nAVAILABLE DATA SUMMARY (use these exact numbers):
- Total Deals: ${s.totalDeals}
- Total Deal Value: $${s.totalDealValue.toFixed(2)}
- Total Contacts: ${s.totalContacts}
- Total Companies: ${s.totalCompanies}
- Deals by Owner: ${Object.entries(s.byOwner || {}).map(([owner, data]: [string, any]) => `${owner}: ${data.deals} deals ($${data.totalValue.toFixed(2)})`).join(', ') || 'No data'}
- Deals by Stage: ${Object.entries(s.byStage || {}).map(([stage, data]: [string, any]) => `${stage}: ${data.count} deals ($${data.totalValue.toFixed(2)})`).join(', ') || 'No data'}`;
  }

  const systemPrompt = `You are an expert HubSpot data analyst for Vye Agency. You have direct access to pre-fetched HubSpot CRM data.

CRITICAL RULES:
- Use ONLY the data provided - never invent or estimate numbers
- Reference the DATA SUMMARY for exact totals - these are pre-calculated and accurate
- When asked about owners, use the owner names from the data
- When asked about stages, use the stage names from the data
- If data is missing or unavailable, say so clearly
- NEVER say "let me fetch" or promise to get more data
- Do NOT ask users to export or look things up manually

When users teach you new terminology (e.g., "we call X deals Y instead"), acknowledge and use it.
${dataSummaryPrompt}
${learnedContextPrompt}`;

  // Build messages array
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt }
  ];

  // Add conversation history
  const recentHistory = conversationHistory.slice(-10);
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    });
  }

  // Add current query with data context
  let userContent = userQuery;
  if (hubspotData) {
    // Include deal details for specific queries
    if (hubspotData.deals?.length > 0) {
      userContent += `\n\n[DEALS DATA]:\n${JSON.stringify(hubspotData.deals, null, 2)}`;
    }
    if (hubspotData.contacts?.length > 0) {
      userContent += `\n\n[CONTACTS DATA]:\n${JSON.stringify(hubspotData.contacts.slice(0, 50), null, 2)}`;
    }
    if (hubspotData.companies?.length > 0) {
      userContent += `\n\n[COMPANIES DATA]:\n${JSON.stringify(hubspotData.companies.slice(0, 30), null, 2)}`;
    }
  } else if (hubspotError) {
    userContent += `\n\n[HUBSPOT API ERROR]: ${hubspotError}\nPlease inform the user about this configuration issue and explain how to fix it.`;
  }
  
  messages.push({ role: 'user', content: userContent });

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
    temperature: 0.5,
    max_tokens: 2000,
  });

  return response.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response.';
}

export async function generateReport(hubspotData: any, context: LearnedContext[]): Promise<any> {
  const learnedContextPrompt = context.length > 0
    ? `\n\nCustom terminology:\n${context.map(lc => `- ${lc.key}: ${lc.value}`).join('\n')}`
    : '';

  // Use pre-calculated summary from comprehensive data
  const summary = hubspotData.summary || {};
  const dealCount = summary.totalDeals || 0;
  const contactCount = summary.totalContacts || 0;
  const companyCount = summary.totalCompanies || 0;
  const totalDealValue = summary.totalDealValue || 0;

  // Build stage breakdown
  const stageBreakdown = Object.entries(summary.byStage || {})
    .map(([stage, data]: [string, any]) => `${stage}: ${data.count} deals worth $${data.totalValue.toFixed(2)}`)
    .join('\n');

  // Build owner breakdown  
  const ownerBreakdown = Object.entries(summary.byOwner || {})
    .map(([owner, data]: [string, any]) => `${owner}: ${data.deals} deals worth $${data.totalValue.toFixed(2)}`)
    .join('\n');

  const prompt = `Generate a report from this HubSpot data.

VERIFIED TOTALS (use these exact numbers):
- Total Deals: ${dealCount}
- Total Deal Value: $${totalDealValue.toFixed(2)}
- Total Contacts: ${contactCount}
- Total Companies: ${companyCount}

DEALS BY STAGE:
${stageBreakdown || 'No stage data'}

DEALS BY OWNER:
${ownerBreakdown || 'No owner data'}

DEAL DETAILS:
${JSON.stringify(hubspotData.deals || [], null, 2)}

CONTACT DETAILS (sample):
${JSON.stringify((hubspotData.contacts || []).slice(0, 20), null, 2)}
${learnedContextPrompt}

CRITICAL: Only use the numbers above. Do NOT invent metrics, projections, or data not present.

Return JSON with this structure:
{
  "title": "HubSpot CRM Report",
  "subtitle": "Analysis of ${dealCount} deals and ${contactCount} contacts",
  "dataSummary": {
    "totalDeals": ${dealCount},
    "totalContacts": ${contactCount},
    "totalCompanies": ${companyCount},
    "totalDealValue": ${totalDealValue}
  },
  "dealsByStage": [{ "stage": "...", "count": X, "value": Y }],
  "dealsByOwner": [{ "owner": "...", "count": X, "value": Y }],
  "dealAnalysis": ["insight 1", "insight 2"],
  "contactAnalysis": ["insight 1", "insight 2"],
  "recommendations": ["recommendation 1", "recommendation 2"]
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { 
        role: 'system', 
        content: 'You are a data analyst. ONLY report facts from provided data. NEVER invent numbers. Return valid JSON only.' 
      },
      { role: 'user', content: prompt }
    ],
    temperature: 0.1,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Failed to generate report');
  }

  const reportData = JSON.parse(content);
  
  // Validate that the AI didn't hallucinate the key numbers
  if (reportData.dataSummary) {
    reportData.dataSummary.totalDeals = dealCount;
    reportData.dataSummary.totalContacts = contactCount;
    reportData.dataSummary.totalCompanies = companyCount;
    reportData.dataSummary.totalDealValue = totalDealValue;
  }

  return reportData;
}

// Detect if user is teaching new context
export function extractLearning(userMessage: string, aiResponse: string): { 
  detected: boolean; 
  contextType?: string; 
  key?: string; 
  value?: string; 
} {
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
  const meansPattern = /["']?([^"']+)["']?\s+(means|is defined as|refers to)\s+["']?([^"']+)["']?/i;
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
