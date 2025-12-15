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

export const MOCK_REPORT_DATA = {
  title: "October 2025 Report",
  subtitle: "Key Insights & Findings",
  kpiData: [
    { metric: "Website Sessions", projection: "74,050", q1: "21,360", q1_actual: "18,256", q2: "22,500", q2_actual: "17,473", q3: "23,000", q3_actual: "17,549", q4: "22,000", q4_actual: "9,656", goal: "88,860" },
    { metric: "New Contacts", projection: "1,169", q1: "330", q1_actual: "273", q2: "360", q2_actual: "266", q3: "350", q3_actual: "369", q4: "340", q4_actual: "243", goal: "1,380" },
    { metric: "PQL Sample Requests", projection: "1,266", q1: "360", q1_actual: "350", q2: "400", q2_actual: "462", q3: "400", q3_actual: "469", q4: "360", q4_actual: "226", goal: "1,520" },
    { metric: "New Grower Program Inquiries", projection: "97", q1: "22", q1_actual: "23", q2: "30", q2_actual: "3", q3: "30", q3_actual: "7", q4: "30", q4_actual: "7", goal: "112" },
    { metric: "Soy Sample Request Form", projection: "42", q1: "10", q1_actual: "2", q2: "12", q2_actual: "2", q3: "12", q3_actual: "3", q4: "10", q4_actual: "3", goal: "44" },
  ],
  revenueInsights: [
    "YTD 81 closed-won deals worth $9,219,646.61 can be attributed back to marketing.",
    "4 of these worth $725,893 closed in Q4 so far.",
    "3 of these Q4 deals were PPI & Starch worth $257,893",
    "Though we are not even halfway through Q4 this is a 120% YoY increase in closed-won revenue.",
    "When looking back at the closed deals attributed to marketing, cereal and pasta are the most profitable categories with $5.8 and $1.5 million in revenue in the last 365 days",
    "There are currently 33 open deals worth $1,705,606.38 that can be attributed back to marketing.",
    "45 total ClearP deals created this quarter (excluding samples) worth $98,303.06 in potential revenue."
  ],
  leadGenInsights: [
    "21 sample requests attributed to marketing",
    "72 ClearP sample requests in Q4 so far. November exceeded October already.",
    "17 of these can be directly attributed back to marketing",
    "31% increase in proteins sample requests MoM",
    "33% increase in 2.0 ingredient report downloads",
    "The product identifier quiz was the second-most submitted form on the site in October - right after the Contact Us form (64 form fills). We will continue to monitor to see what deals arise from the form fills."
  ],
  recommendations: [
    "Continue to monitor the product identifier quiz. If conversion rates drop, consider on-page CRO as well as a renewed email blast or evergreen auto-responder for those who view the page but do not submit the form.",
    "Launch nurturing campaigns to those who purchased for smaller bulk or test runs",
    "Consistency in using SKU-specific line items will help us more more nuanced insight about profitability as well as allow us to easier segment these deals for future nurturing.",
    "Consider segmenting between one-time and repeat or evangelical buyers to nurture existing customers toward larger more profitable or reliable engagements.",
    "55% of protein sample request submitters are existing customers - consider an interaction of the sample request forms with progressive form fills."
  ]
};
