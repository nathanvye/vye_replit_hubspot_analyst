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

  // SERVER-SIDE: Build stage breakdown arrays (not from AI)
  const dealsByStage = Object.entries(summary.byStage || {}).map(([stage, data]: [string, any]) => ({
    stage,
    count: data.count,
    value: data.totalValue
  }));

  // SERVER-SIDE: Build owner breakdown arrays (not from AI)
  const dealsByOwner = Object.entries(summary.byOwner || {}).map(([owner, data]: [string, any]) => ({
    owner,
    count: data.deals,
    value: data.totalValue
  }));

  // SERVER-SIDE: Calculate closed won deals
  const closedWonDeals = (hubspotData.deals || []).filter((d: any) => 
    d.stage?.toLowerCase().includes('closed') || d.stage?.toLowerCase().includes('won')
  );
  const closedWonValue = closedWonDeals.reduce((sum: number, d: any) => sum + (d.amount || 0), 0);
  
  // SERVER-SIDE: Calculate open deals
  const openDeals = (hubspotData.deals || []).filter((d: any) => 
    !d.stage?.toLowerCase().includes('closed') && !d.stage?.toLowerCase().includes('lost')
  );
  const openDealsValue = openDeals.reduce((sum: number, d: any) => sum + (d.amount || 0), 0);

  const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  // Build text descriptions for AI to analyze (AI only generates narratives)
  const stageDescription = dealsByStage.map(s => `${s.stage}: ${s.count} deals worth $${s.value.toFixed(2)}`).join(', ');
  const ownerDescription = dealsByOwner.map(o => `${o.owner}: ${o.count} deals worth $${o.value.toFixed(2)}`).join(', ');

  // Build quarterly description for AI context
  const quarterlyDesc = summary.quarterly ? 
    `Q1: ${summary.quarterly.contacts.Q1} contacts, ${summary.quarterly.deals.Q1} deals ($${summary.quarterly.dealValue.Q1.toFixed(0)}). ` +
    `Q2: ${summary.quarterly.contacts.Q2} contacts, ${summary.quarterly.deals.Q2} deals ($${summary.quarterly.dealValue.Q2.toFixed(0)}). ` +
    `Q3: ${summary.quarterly.contacts.Q3} contacts, ${summary.quarterly.deals.Q3} deals ($${summary.quarterly.dealValue.Q3.toFixed(0)}). ` +
    `Q4: ${summary.quarterly.contacts.Q4} contacts, ${summary.quarterly.deals.Q4} deals ($${summary.quarterly.dealValue.Q4.toFixed(0)}).`
    : 'No quarterly data available';

  // Get current year and quarter
  const now = new Date();
  const currentYear = summary.quarterly?.year || now.getFullYear();
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
  
  // Calculate Q4 specific deals (or current quarter)
  const currentQuarterDeals = closedWonDeals.filter((d: any) => {
    if (!d.closeDate) return false;
    const closeDate = new Date(d.closeDate);
    const dealQuarter = Math.floor(closeDate.getMonth() / 3) + 1;
    return closeDate.getFullYear() === currentYear && dealQuarter === currentQuarter;
  });
  const currentQuarterValue = currentQuarterDeals.reduce((sum: number, d: any) => sum + (d.amount || 0), 0);

  const prompt = `Analyze this HubSpot CRM data and write detailed insights in a SPECIFIC FORMAT.

VERIFIED DATA (use these exact numbers - do NOT invent statistics):
- Total Deals: ${dealCount}
- Total Deal Value: $${totalDealValue.toFixed(2)}
- Closed/Won Deals (YTD): ${closedWonDeals.length} worth $${closedWonValue.toFixed(2)}
- Q${currentQuarter} Closed Deals: ${currentQuarterDeals.length} worth $${currentQuarterValue.toFixed(2)}
- Open Deals in Pipeline: ${openDeals.length} worth $${openDealsValue.toFixed(2)}
- Total Contacts: ${contactCount}
- Total Companies: ${companyCount}
- Deals by Stage: ${stageDescription || 'None'}
- Deals by Owner: ${ownerDescription || 'None'}
- Quarterly Breakdown (${currentYear}): ${quarterlyDesc}
${learnedContextPrompt}

Return JSON with insights formatted like these examples:

REVENUE GENERATION EXAMPLES (reference exact data):
- "YTD ${closedWonDeals.length} closed-won deals with $${closedWonValue.toFixed(2)} can be attributed back to marketing."
- "${currentQuarterDeals.length} of these worth $${currentQuarterValue.toFixed(2)} closed in Q${currentQuarter} so far."
- "${openDeals.length} marketing attributed deals worth $${openDealsValue.toFixed(2)} is still open in the pipeline."

LEAD GENERATION EXAMPLES (reference exact data):
- "YTD ${contactCount} new contacts created in HubSpot."
- Mention QoQ trends if quarterly data shows patterns
- Reference specific conversion activities if available

{
  "revenueInsights": ["4-6 bullet points about revenue/deals using EXACT numbers from verified data - focus on YTD totals, Q${currentQuarter} specifics, and pipeline value"],
  "leadGenInsights": ["4-6 bullet points about contacts/leads using EXACT numbers - mention QoQ trends, quarterly patterns, and contact growth"],
  "recommendations": ["5-7 specific, actionable recommendations"]
}

RECOMMENDATIONS SHOULD BE SPECIFIC AND ACTIONABLE like these examples:
- "Lean into [top product] to drive profitability. Could support with sales enablement messaging, battle cards, sell sheets, etc."
- "Consider a [product] branch of the product identifier."
- "[Product X] becoming a close runner-up to [Product Y] and often with larger deals. Lean heavy into this product in the next quarter."
- "Consider repurposing webinar content across social media and email campaigns to drive TOF contacts toward lower-funnel education."
- "Contact growth patterns suggest a content offer or webinar specifically for [audience segment] may prove worthwhile."
- Suggest specific campaign ideas (holiday campaigns, EOY pushes, exclusivity angles)
- Reference specific products, deal types, or owner performance from the data

CRITICAL: Every number you mention MUST come from the VERIFIED DATA above. Do not invent statistics. Recommendations should reference actual patterns in the data.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { 
        role: 'system', 
        content: 'You are a marketing analyst. Write narrative insights referencing ONLY the provided numbers. Return valid JSON with only revenueInsights, leadGenInsights, and recommendations arrays.' 
      },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('Failed to generate report');
  }

  const aiInsights = JSON.parse(content);
  
  // Get quarterly data from summary
  const quarterly = summary.quarterly || { 
    year: new Date().getFullYear(),
    contacts: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 },
    deals: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 },
    dealValue: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 },
    companies: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 },
    websiteSessions: { Q1: 0, Q2: 0, Q3: 0, Q4: 0 },
    websiteSessionsStatus: undefined as string | undefined
  };

  // BUILD REPORT WITH SERVER-VERIFIED DATA (AI only provides narratives)
  const reportData = {
    title: `${currentMonth} Report`,
    subtitle: "Key Insights & Findings",
    // ALL metrics come from server calculations, NOT from AI
    verifiedData: {
      totalDeals: dealCount,
      totalContacts: contactCount,
      totalCompanies: companyCount,
      totalDealValue: totalDealValue,
      closedWonDeals: closedWonDeals.length,
      closedWonValue: closedWonValue,
      openDeals: openDeals.length,
      openDealsValue: openDealsValue
    },
    // Quarterly KPI data for the table (SERVER calculated)
    kpiTable: {
      year: quarterly.year,
      rows: [
        {
          metric: "New Contacts",
          subtext: `Contacts created in HubSpot (${quarterly.year} only)`,
          yearEndProjection: quarterly.contacts.Q1 + quarterly.contacts.Q2 + quarterly.contacts.Q3 + quarterly.contacts.Q4,
          q1: { projection: '-', actual: quarterly.contacts.Q1 },
          q2: { projection: '-', actual: quarterly.contacts.Q2 },
          q3: { projection: '-', actual: quarterly.contacts.Q3 },
          q4: { projection: '-', actual: quarterly.contacts.Q4 },
          goal: ''
        }
      ]
    },
    // Stage/owner breakdowns come from SERVER calculations
    dealsByStage,
    dealsByOwner,
    // Only narrative text comes from AI (hallucination is tolerable here)
    revenueInsights: aiInsights.revenueInsights || [],
    leadGenInsights: aiInsights.leadGenInsights || [],
    recommendations: aiInsights.recommendations || []
  };

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
