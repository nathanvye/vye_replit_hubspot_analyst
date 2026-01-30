import OpenAI from "openai";
import type { LearnedContext, Message } from "@shared/schema";

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
  const {
    conversationHistory,
    learnedContext,
    hubspotData,
    hubspotError,
    userQuery,
  } = context;

  // Build learned context prompt
  const learnedContextPrompt =
    learnedContext.length > 0
      ? `\n\nLearned Context and Custom Terminology:\n${learnedContext
          .map((lc) => `- ${lc.contextType}: "${lc.key}" = ${lc.value}`)
          .join("\n")}`
      : "";

  // Build data summary for system prompt
  let dataSummaryPrompt = "";
  if (hubspotData?.summary) {
    const s = hubspotData.summary;
    dataSummaryPrompt = `\n\nAVAILABLE DATA SUMMARY (use these exact numbers):
- Total Deals: ${s.totalDeals}
- Total Deal Value: $${s.totalDealValue.toFixed(2)}
- Total Contacts: ${s.totalContacts}
- Total Companies: ${s.totalCompanies}
- Deals by Owner: ${
      Object.entries(s.byOwner || {})
        .map(
          ([owner, data]: [string, any]) =>
            `${owner}: ${data.deals} deals ($${data.totalValue.toFixed(2)})`,
        )
        .join(", ") || "No data"
    }
- Deals by Stage: ${
      Object.entries(s.byStage || {})
        .map(
          ([stage, data]: [string, any]) =>
            `${stage}: ${data.count} deals ($${data.totalValue.toFixed(2)})`,
        )
        .join(", ") || "No data"
    }`;
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
    { role: "system", content: systemPrompt },
  ];

  // Add conversation history
  const recentHistory = conversationHistory.slice(-10);
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role as "user" | "assistant",
      content: msg.content,
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

  messages.push({ role: "user", content: userContent });

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    temperature: 0.5,
    max_tokens: 2000,
  });

  return (
    response.choices[0]?.message?.content ||
    "I apologize, but I was unable to generate a response."
  );
}

function getQuarterFromDate(date: Date): 1 | 2 | 3 | 4 {
  return (Math.floor(date.getMonth() / 3) + 1) as 1 | 2 | 3 | 4;
}

// Helper to format currency with commas
function formatCurrency(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Helper to format number with commas
function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

interface ReportOptions {
  showNewDeals?: boolean;
  lifecycleSettings?: {
    mqlStage?: string | null;
    sqlStage?: string | null;
  };
}

function countLifecycleDealsByQuarter(
  deals: any[],
  contacts: any[],
  lifecycleStage: string | null | undefined,
  year: number,
  quarter: 1 | 2 | 3 | 4,
): number {
  if (!lifecycleStage) return 0;

  const contactMap = new Map(contacts.map((c: any) => [c.id, c]));
  let count = 0;

  for (const deal of deals) {
    const contactIds =
      deal.associations?.contacts?.results?.map((c: any) => c.id) || [];

    const matches = contactIds.some((id: string) => {
      const contact = contactMap.get(id);
      if (!contact) return false;

      const stage = contact.properties?.lifecyclestage;
      const stageDateRaw =
        contact.properties?.[`hs_lifecyclestage_${stage}_date`];

      if (stage !== lifecycleStage || !stageDateRaw) return false;

      const stageDate = new Date(stageDateRaw);
      return (
        stageDate.getFullYear() === year &&
        getQuarterFromDate(stageDate) === quarter
      );
    });

    if (matches) count++;
  }

  return count;
}

export async function generateReport(
  hubspotData: any,
  context: LearnedContext[],
  gaData?: { pageViews: any; channels: any[] },
  focusAreas?: string,
  options?: ReportOptions,
): Promise<any> {
  const learnedContextPrompt =
    context.length > 0
      ? `\n\nCustom terminology:\n${context.map((lc) => `- ${lc.key}: ${lc.value}`).join("\n")}`
      : "";

  const focusAreasPrompt = focusAreas
    ? `\n\nUSER FOCUS AREAS (prioritize these in your analysis, but still provide comprehensive insights):\n${focusAreas}`
    : "";

  const lifecycleSettings = options?.lifecycleSettings;

  // Use pre-calculated summary from comprehensive data
  const summary = hubspotData.summary || {};
  const dealCount = summary.totalDeals || 0;
  const contactCount = summary.totalContacts || 0;
  const companyCount = summary.totalCompanies || 0;
  const totalDealValue = summary.totalDealValue || 0;

  // Google Analytics data
  const gaPageViews = gaData?.pageViews || {
    Q1: 0,
    Q2: 0,
    Q3: 0,
    Q4: 0,
    total: 0,
  };
  const gaChannels = gaData?.channels || [];
  const gaChannelDesc = gaChannels
    .map((c) => `${c.channel}: ${c.sessions} sessions (${c.percentage}%)`)
    .join(", ");

  // SERVER-SIDE: Build stage breakdown arrays (not from AI)
  const dealsByStage = Object.entries(summary.byStage || {}).map(
    ([stage, data]: [string, any]) => ({
      stage,
      count: data.count,
      value: data.totalValue,
    }),
  );

  // SERVER-SIDE: Build owner breakdown arrays (not from AI)
  const dealsByOwner = Object.entries(summary.byOwner || {}).map(
    ([owner, data]: [string, any]) => ({
      owner,
      count: data.deals,
      value: data.totalValue,
    }),
  );

  // SERVER-SIDE: Calculate closed won deals
  const closedWonDeals = (hubspotData.deals || []).filter(
    (d: any) =>
      d.stage?.toLowerCase().includes("closed") ||
      d.stage?.toLowerCase().includes("won"),
  );
  const closedWonValue = closedWonDeals.reduce(
    (sum: number, d: any) => sum + (d.amount || 0),
    0,
  );

  // SERVER-SIDE: Calculate open deals
  const openDeals = (hubspotData.deals || []).filter(
    (d: any) =>
      !d.stage?.toLowerCase().includes("closed") &&
      !d.stage?.toLowerCase().includes("lost"),
  );
  const openDealsValue = openDeals.reduce(
    (sum: number, d: any) => sum + (d.amount || 0),
    0,
  );

  const deals = hubspotData.deals || [];
  const contacts = hubspotData.contacts || [];

  const currentMonth = new Date().toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  // Build text descriptions for AI to analyze (AI only generates narratives)
  // Sort by value descending to highlight top stages
  const stagesSorted = [...dealsByStage].sort((a, b) => b.value - a.value);
  const stageDescription = stagesSorted
    .map(
      (s) =>
        `${s.stage} (${formatNumber(s.count)} deals, ${formatCurrency(s.value)})`,
    )
    .join("\n- ");
  const ownerDescription = dealsByOwner
    .map(
      (o) =>
        `${o.owner}: ${formatNumber(o.count)} deals, ${formatCurrency(o.value)}`,
    )
    .join(", ");

  // Build quarterly description for AI context
  const quarterlyDesc = summary.quarterly
    ? `Q1: ${summary.quarterly.contacts.Q1} contacts, ${summary.quarterly.deals.Q1} deals ($${summary.quarterly.dealValue.Q1.toFixed(0)}). ` +
      `Q2: ${summary.quarterly.contacts.Q2} contacts, ${summary.quarterly.deals.Q2} deals ($${summary.quarterly.dealValue.Q2.toFixed(0)}). ` +
      `Q3: ${summary.quarterly.contacts.Q3} contacts, ${summary.quarterly.deals.Q3} deals ($${summary.quarterly.dealValue.Q3.toFixed(0)}). ` +
      `Q4: ${summary.quarterly.contacts.Q4} contacts, ${summary.quarterly.deals.Q4} deals ($${summary.quarterly.dealValue.Q4.toFixed(0)}).`
    : "No quarterly data available";

  const gaQuarterlyDesc = `Page Views: Q1: ${gaPageViews.Q1}, Q2: ${gaPageViews.Q2}, Q3: ${gaPageViews.Q3}, Q4: ${gaPageViews.Q4}. Total: ${gaPageViews.total}`;

  // Get current year and quarter
  const now = new Date();
  const reportYear = summary.quarterly?.year ?? now.getFullYear();
  const mqlByQuarter = {
    Q1: countLifecycleDealsByQuarter(
      deals,
      contacts,
      lifecycleSettings?.mqlStage,
      reportYear,
      1,
    ),
    Q2: countLifecycleDealsByQuarter(
      deals,
      contacts,
      lifecycleSettings?.mqlStage,
      reportYear,
      2,
    ),
    Q3: countLifecycleDealsByQuarter(
      deals,
      contacts,
      lifecycleSettings?.mqlStage,
      reportYear,
      3,
    ),
    Q4: countLifecycleDealsByQuarter(
      deals,
      contacts,
      lifecycleSettings?.mqlStage,
      reportYear,
      4,
    ),
  };

  const sqlByQuarter = {
    Q1: countLifecycleDealsByQuarter(
      deals,
      contacts,
      lifecycleSettings?.sqlStage,
      reportYear,
      1,
    ),
    Q2: countLifecycleDealsByQuarter(
      deals,
      contacts,
      lifecycleSettings?.sqlStage,
      reportYear,
      2,
    ),
    Q3: countLifecycleDealsByQuarter(
      deals,
      contacts,
      lifecycleSettings?.sqlStage,
      reportYear,
      3,
    ),
    Q4: countLifecycleDealsByQuarter(
      deals,
      contacts,
      lifecycleSettings?.sqlStage,
      reportYear,
      4,
    ),
  };
  const prompt = `Analyze this HubSpot CRM and Google Analytics data and write detailed insights in a SPECIFIC FORMAT.

VERIFIED DATA (use these exact numbers - do NOT invent statistics):
- Total Deals: ${formatNumber(dealCount)}
- Total Deal Value: ${formatCurrency(totalDealValue)}
- Closed/Won Deals (YTD): ${formatNumber(closedWonDeals.length)} worth ${formatCurrency(closedWonValue)}
- Open Deals in Pipeline: ${formatNumber(openDeals.length)} worth ${formatCurrency(openDealsValue)}
- Total Contacts: ${formatNumber(contactCount)}
- Total Companies: ${formatNumber(companyCount)}
- Website Traffic (Page Views): ${gaQuarterlyDesc}
- Traffic Channels: ${gaChannelDesc || "No channel data available"}
- Deals by Stage (sorted by value):
- ${stageDescription || "None"}
- Deals by Owner: ${ownerDescription || "None"}
- Quarterly HubSpot Breakdown (${reportYear}): ${quarterlyDesc}
${learnedContextPrompt}${focusAreasPrompt}

Return JSON with insights formatted like these examples:

REVENUE GENERATION EXAMPLES (reference exact data with commas):
- "YTD ${formatNumber(closedWonDeals.length)} closed-won deals with ${formatCurrency(closedWonValue)} can be attributed back to marketing."
- "${formatNumber(openDeals.length)} marketing attributed deals worth ${formatCurrency(openDealsValue)} is still open in the pipeline."

LEAD GENERATION EXAMPLES (reference exact data with commas):
- "YTD ${formatNumber(contactCount)} new contacts created in HubSpot."
- "Website traffic reached ${formatNumber(gaPageViews.total)} page views YTD, with top channels being ${gaChannels
    .slice(0, 2)
    .map((c) => c.channel)
    .join(" and ")}."
- Mention QoQ trends if quarterly data shows patterns
- Reference specific stage names and deal counts (not IDs)

{
  "revenueInsights": ["4-6 bullet points about revenue/deals using EXACT numbers with commas from verified data"],
  "leadGenInsights": ["4-6 bullet points about contacts/leads/website-traffic using EXACT numbers with commas"],
  "recommendations": ["5-7 specific, actionable recommendations"]
}

RECOMMENDATIONS SHOULD BE SPECIFIC AND ACTIONABLE like these examples:
- "Lean into [top stage/product] to drive profitability. Could support with sales enablement messaging, battle cards, sell sheets, etc."
- "Contact growth patterns and traffic from [Channel] suggest a content offer or webinar specifically for [audience segment] may prove worthwhile."

CRITICAL: Every number you mention MUST include commas and come from the VERIFIED DATA above. Use stage names not IDs. Do not invent statistics. Recommendations should reference actual patterns in the data.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "You are a marketing analyst. Write narrative insights referencing ONLY the provided numbers. Return valid JSON with only revenueInsights, leadGenInsights, and recommendations arrays.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Failed to generate report");
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
    websiteSessionsStatus: undefined as string | undefined,
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
      openDealsValue: openDealsValue,
      pageViews: gaPageViews.total,
    },
    // Quarterly KPI data for the table (SERVER calculated)
    kpiTable: {
      year: quarterly.year,
      rows: [
        {
          metric: "New Contacts",
          subtext: `Contacts created in HubSpot (${quarterly.year} only)`,
          yearEndProjection:
            quarterly.contacts.Q1 +
            quarterly.contacts.Q2 +
            quarterly.contacts.Q3 +
            quarterly.contacts.Q4,
          q1: { projection: "-", actual: quarterly.contacts.Q1 },
          q2: { projection: "-", actual: quarterly.contacts.Q2 },
          q3: { projection: "-", actual: quarterly.contacts.Q3 },
          q4: { projection: "-", actual: quarterly.contacts.Q4 },
          goal: "",
        },
        {
          metric: "Page Views",
          subtext: `Website traffic from Google Analytics (${quarterly.year})`,
          yearEndProjection: gaPageViews.total,
          q1: { projection: "-", actual: gaPageViews.Q1 },
          q2: { projection: "-", actual: gaPageViews.Q2 },
          q3: { projection: "-", actual: gaPageViews.Q3 },
          q4: { projection: "-", actual: gaPageViews.Q4 },
          goal: "",
        },
        {
          metric: "MQLs",
          subtext: `Deals created in ${quarterly.year} with contacts reaching MQL lifecycle stage`,
          yearEndProjection:
            mqlByQuarter.Q1 +
            mqlByQuarter.Q2 +
            mqlByQuarter.Q3 +
            mqlByQuarter.Q4,
          q1: { projection: "-", actual: mqlByQuarter.Q1 },
          q2: { projection: "-", actual: mqlByQuarter.Q2 },
          q3: { projection: "-", actual: mqlByQuarter.Q3 },
          q4: { projection: "-", actual: mqlByQuarter.Q4 },
          goal: "",
        },
        {
          metric: "SQLs",
          subtext: `Deals created in ${quarterly.year} with contacts reaching SQL lifecycle stage`,
          yearEndProjection:
            sqlByQuarter.Q1 +
            sqlByQuarter.Q2 +
            sqlByQuarter.Q3 +
            sqlByQuarter.Q4,
          q1: { projection: "-", actual: sqlByQuarter.Q1 },
          q2: { projection: "-", actual: sqlByQuarter.Q2 },
          q3: { projection: "-", actual: sqlByQuarter.Q3 },
          q4: { projection: "-", actual: sqlByQuarter.Q4 },
          goal: "",
        },
        ...(options?.showNewDeals !== false
          ? [
              {
                metric: "New Deals",
                subtext: `Deals created in HubSpot (${quarterly.year})`,
                yearEndProjection:
                  (quarterly.newDeals?.Q1 || 0) +
                  (quarterly.newDeals?.Q2 || 0) +
                  (quarterly.newDeals?.Q3 || 0) +
                  (quarterly.newDeals?.Q4 || 0),
                q1: { projection: "-", actual: `${quarterly.newDeals?.Q1 || 0} ($${((quarterly.newDealValue?.Q1 || 0) / 1000).toFixed(0)}k)` },
                q2: { projection: "-", actual: `${quarterly.newDeals?.Q2 || 0} ($${((quarterly.newDealValue?.Q2 || 0) / 1000).toFixed(0)}k)` },
                q3: { projection: "-", actual: `${quarterly.newDeals?.Q3 || 0} ($${((quarterly.newDealValue?.Q3 || 0) / 1000).toFixed(0)}k)` },
                q4: { projection: "-", actual: `${quarterly.newDeals?.Q4 || 0} ($${((quarterly.newDealValue?.Q4 || 0) / 1000).toFixed(0)}k)` },
                goal: "",
              },
            ]
          : []),
      ],
    },
    // Stage/owner breakdowns come from SERVER calculations
    dealsByStage,
    dealsByOwner,
    gaChannels,
    gaPageViews,
    // Only narrative text comes from AI (hallucination is tolerable here)
    revenueInsights: aiInsights.revenueInsights || [],
    leadGenInsights: aiInsights.leadGenInsights || [],
    recommendations: aiInsights.recommendations || [],
  };

  return reportData;
}

// Answer questions about a generated report
export async function answerReportQuestion(
  question: string,
  reportContext: any,
  hubspotData: any,
  year: number,
): Promise<string> {
  const summary = hubspotData?.summary || reportContext?.verifiedData || {};

  const dataContext = `
REPORT DATA FOR YEAR ${year}:
- Total Deals: ${formatNumber(summary.totalDeals || 0)}
- Total Deal Value: ${formatCurrency(summary.totalDealValue || 0)}
- Closed Won Deals: ${formatNumber(summary.closedWonDeals || 0)}
- Closed Won Value: ${formatCurrency(summary.closedWonValue || 0)}
- Open Deals: ${formatNumber(summary.openDeals || 0)}
- Open Pipeline Value: ${formatCurrency(summary.openDealsValue || 0)}
- Total Contacts: ${formatNumber(summary.totalContacts || 0)}
- Total Companies: ${formatNumber(summary.totalCompanies || 0)}
- Page Views: ${formatNumber(summary.pageViews || 0)}

${reportContext?.dealsByStage ? `DEALS BY STAGE:\n${reportContext.dealsByStage.map((s: any) => `- ${s.stage}: ${s.count} deals (${formatCurrency(s.value)})`).join("\n")}` : ""}

${reportContext?.dealsByOwner ? `DEALS BY OWNER:\n${reportContext.dealsByOwner.map((o: any) => `- ${o.owner}: ${o.count} deals (${formatCurrency(o.value)})`).join("\n")}` : ""}

${reportContext?.revenueInsights ? `REVENUE INSIGHTS FROM REPORT:\n${reportContext.revenueInsights.map((i: string) => `- ${i}`).join("\n")}` : ""}

${reportContext?.leadGenInsights ? `LEAD GEN INSIGHTS FROM REPORT:\n${reportContext.leadGenInsights.map((i: string) => `- ${i}`).join("\n")}` : ""}

${reportContext?.kpiTable ? `KPI DATA:\n${JSON.stringify(reportContext.kpiTable, null, 2)}` : ""}
`;

  const systemPrompt = `You are a helpful data analyst assistant. You have access to a generated HubSpot report and its underlying data.

Your job is to answer follow-up questions about the report data clearly and accurately.

CRITICAL RULES:
- Use ONLY the data provided - never invent or estimate numbers
- If you don't have the data to answer a question, say so clearly
- When discussing attribution, explain what information is available and what limitations exist
- Be specific about what data sources the numbers come from (HubSpot deals, contacts, etc.)
- Format numbers with commas for readability

${dataContext}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: question },
    ],
    temperature: 0.3,
    max_tokens: 1500,
  });

  return (
    response.choices[0]?.message?.content ||
    "I apologize, but I was unable to answer that question."
  );
}

// Detect if user is teaching new context
export function extractLearning(
  userMessage: string,
  aiResponse: string,
): {
  detected: boolean;
  contextType?: string;
  key?: string;
  value?: string;
} {
  // Pattern: "call X Y" or "we call X Y" or "refer to X as Y"
  const callPattern =
    /(we\s+)?(call|refer to)\s+(.+?)\s+(as\s+)?["']?([^"']+)["']?/i;
  const match = userMessage.match(callPattern);

  if (match) {
    return {
      detected: true,
      contextType: "terminology",
      key: match[3].trim(),
      value: match[5].trim(),
    };
  }

  // Pattern: "X means Y" or "X is Y"
  const meansPattern =
    /["']?([^"']+)["']?\s+(means|is defined as|refers to)\s+["']?([^"']+)["']?/i;
  const meansMatch = userMessage.match(meansPattern);

  if (meansMatch) {
    return {
      detected: true,
      contextType: "definition",
      key: meansMatch[1].trim(),
      value: meansMatch[3].trim(),
    };
  }

  return { detected: false };
}
