import { GoogleAuth, JWT } from 'google-auth-library';

interface QuarterlyPageViews {
  Q1: number;
  Q2: number;
  Q3: number;
  Q4: number;
  total: number;
}

interface ChannelData {
  channel: string;
  sessions: number;
  percentage: number;
}

// Quarter date ranges for a given year
function getQuarterDateRanges(year: number) {
  return {
    Q1: { startDate: `${year}-01-01`, endDate: `${year}-03-31` },
    Q2: { startDate: `${year}-04-01`, endDate: `${year}-06-30` },
    Q3: { startDate: `${year}-07-01`, endDate: `${year}-09-30` },
    Q4: { startDate: `${year}-10-01`, endDate: `${year}-12-31` },
  };
}

// Get service account credentials from environment
function getServiceAccountCredentials(): any | null {
  const credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!credentialsJson) {
    return null;
  }
  
  try {
    return JSON.parse(credentialsJson);
  } catch (error) {
    console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY:', error);
    return null;
  }
}

// Cached JWT client to avoid re-parsing credentials on every request
let cachedJwtClient: JWT | null = null;

// Create an authenticated client for GA Data API
async function getAuthenticatedClient(): Promise<string | null> {
  const credentials = getServiceAccountCredentials();
  if (!credentials) {
    console.log('No Google Analytics service account configured');
    return null;
  }

  try {
    // Use cached client or create new one
    if (!cachedJwtClient) {
      cachedJwtClient = new JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
      });
    }

    // google-auth-library v10+ returns the token as a string directly
    const accessToken = await cachedJwtClient.getAccessToken();
    
    // Handle both old (object with .token) and new (string) return formats
    if (typeof accessToken === 'string') {
      return accessToken;
    } else if (accessToken && typeof accessToken === 'object' && 'token' in accessToken) {
      return accessToken.token || null;
    }
    
    console.error('Unexpected access token format:', typeof accessToken);
    return null;
  } catch (error) {
    console.error('Failed to authenticate with Google Analytics:', error);
    // Reset cached client on error
    cachedJwtClient = null;
    return null;
  }
}

// Fetch page views using GA4 Data API with service account
export async function getPageViewsQuarterly(propertyId: string, year: number): Promise<QuarterlyPageViews> {
  const accessToken = await getAuthenticatedClient();
  if (!accessToken) {
    return { Q1: 0, Q2: 0, Q3: 0, Q4: 0, total: 0 };
  }

  const quarters = getQuarterDateRanges(year);
  const results: QuarterlyPageViews = { Q1: 0, Q2: 0, Q3: 0, Q4: 0, total: 0 };

  for (const [quarter, dateRange] of Object.entries(quarters)) {
    try {
      const response = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dateRanges: [{ startDate: dateRange.startDate, endDate: dateRange.endDate }],
            metrics: [{ name: 'screenPageViews' }],
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`GA API error for ${quarter}:`, errorText);
        continue;
      }

      const data = await response.json();
      const pageViews = parseInt(data.rows?.[0]?.metricValues?.[0]?.value || '0', 10);
      console.log(`GA ${quarter} page views for ${year}:`, pageViews);
      results[quarter as keyof typeof quarters] = pageViews;
      results.total += pageViews;
    } catch (error) {
      console.error(`Error fetching ${quarter} page views:`, error);
    }
  }

  return results;
}

// Fetch channel group breakdown
export async function getChannelGroupBreakdown(propertyId: string, year: number): Promise<ChannelData[]> {
  const accessToken = await getAuthenticatedClient();
  if (!accessToken) {
    return [];
  }

  try {
    const response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: `${year}-01-01`, endDate: `${year}-12-31` }],
          dimensions: [{ name: 'sessionDefaultChannelGroup' }],
          metrics: [{ name: 'sessions' }],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GA API error for channel breakdown:', errorText);
      return [];
    }

    const data = await response.json();
    const rows = data.rows || [];
    console.log(`GA channel breakdown for ${year}: ${rows.length} channels found`);
    
    // Calculate total sessions for percentage
    const totalSessions = rows.reduce((sum: number, row: any) => {
      return sum + parseInt(row.metricValues?.[0]?.value || '0', 10);
    }, 0);

    const channelData: ChannelData[] = rows.map((row: any) => {
      const channel = row.dimensionValues?.[0]?.value || 'Unknown';
      const sessions = parseInt(row.metricValues?.[0]?.value || '0', 10);
      const percentage = totalSessions > 0 ? Math.round((sessions / totalSessions) * 100) : 0;
      
      return { channel, sessions, percentage };
    });

    return channelData;
  } catch (error) {
    console.error('Error fetching channel breakdown:', error);
    return [];
  }
}

// Check if GA is configured
export function isGoogleAnalyticsConfigured(): boolean {
  return !!getServiceAccountCredentials();
}
