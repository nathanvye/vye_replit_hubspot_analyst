import { encrypt, decrypt } from './encryption';

interface GBPBusinessInfo {
  businessName: string;
  address: string;
  phone: string;
  website: string;
  categories: string[];
  hours: { day: string; hours: string }[];
  averageRating: number;
  totalReviewCount: number;
  mapsUri: string;
}

interface GBPLocation {
  name: string;
  title: string;
  storefrontAddress?: {
    addressLines?: string[];
    locality?: string;
    administrativeArea?: string;
    postalCode?: string;
  };
}

interface GBPAccount {
  name: string;
  accountName: string;
  type: string;
}

const GBP_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/business.manage',
];

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GBP_API_BASE = 'https://mybusinessbusinessinformation.googleapis.com/v1';
const GBP_ACCOUNT_API_BASE = 'https://mybusinessaccountmanagement.googleapis.com/v1';

export function getGBPAuthUrl(clientId: string, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GBP_OAUTH_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state: state,
  });
  
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number } | null> {
  try {
    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token exchange failed:', errorText);
      return null;
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    return null;
  }
}

export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<{ accessToken: string; expiresIn: number } | null> {
  try {
    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Token refresh failed:', errorText);
      return null;
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    };
  } catch (error) {
    console.error('Error refreshing access token:', error);
    return null;
  }
}

export async function listGBPAccounts(accessToken: string): Promise<GBPAccount[]> {
  try {
    const response = await fetch(`${GBP_ACCOUNT_API_BASE}/accounts`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to list GBP accounts:', errorText);
      return [];
    }

    const data = await response.json();
    return (data.accounts || []).map((account: any) => ({
      name: account.name,
      accountName: account.accountName,
      type: account.type,
    }));
  } catch (error) {
    console.error('Error listing GBP accounts:', error);
    return [];
  }
}

export async function listGBPLocations(accessToken: string, accountId: string): Promise<GBPLocation[]> {
  try {
    const response = await fetch(`${GBP_API_BASE}/${accountId}/locations?readMask=name,title,storefrontAddress`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to list GBP locations:', errorText);
      return [];
    }

    const data = await response.json();
    return (data.locations || []).map((location: any) => ({
      name: location.name,
      title: location.title,
      storefrontAddress: location.storefrontAddress,
    }));
  } catch (error) {
    console.error('Error listing GBP locations:', error);
    return [];
  }
}

export async function getGBPBusinessInfo(accessToken: string, locationName: string): Promise<GBPBusinessInfo | null> {
  try {
    const readMask = 'name,title,storefrontAddress,phoneNumbers,websiteUri,categories,regularHours';
    const locationResponse = await fetch(
      `${GBP_API_BASE}/${locationName}?readMask=${readMask}`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );

    if (!locationResponse.ok) {
      const errorText = await locationResponse.text();
      console.error('Failed to get location details:', errorText);
      return null;
    }

    const location = await locationResponse.json();

    let averageRating = 0;
    let totalReviewCount = 0;
    let mapsUri = '';

    try {
      const reviewsResponse = await fetch(
        `https://mybusiness.googleapis.com/v4/${locationName}/reviews`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      
      if (reviewsResponse.ok) {
        const reviewsData = await reviewsResponse.json();
        averageRating = reviewsData.averageRating || 0;
        totalReviewCount = reviewsData.totalReviewCount || 0;
      }
    } catch (reviewError) {
      console.log('Reviews API not available or error:', reviewError);
    }

    try {
      const attributesResponse = await fetch(
        `${GBP_API_BASE}/${locationName}:getGoogleUpdated`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      
      if (attributesResponse.ok) {
        const attributesData = await attributesResponse.json();
        mapsUri = attributesData.metadata?.mapsUri || '';
        if (!averageRating && attributesData.metadata?.averageRating) {
          averageRating = attributesData.metadata.averageRating;
        }
        if (!totalReviewCount && attributesData.metadata?.totalReviewCount) {
          totalReviewCount = attributesData.metadata.totalReviewCount;
        }
      }
    } catch (attrError) {
      console.log('getGoogleUpdated not available:', attrError);
    }

    const address = location.storefrontAddress
      ? [
          ...(location.storefrontAddress.addressLines || []),
          location.storefrontAddress.locality,
          location.storefrontAddress.administrativeArea,
          location.storefrontAddress.postalCode,
        ].filter(Boolean).join(', ')
      : '';

    const categories: string[] = [];
    if (location.categories?.primaryCategory?.displayName) {
      categories.push(location.categories.primaryCategory.displayName);
    }
    if (location.categories?.additionalCategories) {
      for (const cat of location.categories.additionalCategories) {
        if (cat.displayName) categories.push(cat.displayName);
      }
    }

    const hours: { day: string; hours: string }[] = [];
    if (location.regularHours?.periods) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const groupedHours: Record<string, string[]> = {};
      
      for (const period of location.regularHours.periods) {
        const day = dayNames[period.openDay] || period.openDay;
        const openTime = period.openTime?.hours 
          ? `${period.openTime.hours}:${String(period.openTime.minutes || 0).padStart(2, '0')}`
          : '00:00';
        const closeTime = period.closeTime?.hours
          ? `${period.closeTime.hours}:${String(period.closeTime.minutes || 0).padStart(2, '0')}`
          : '23:59';
        
        if (!groupedHours[day]) groupedHours[day] = [];
        groupedHours[day].push(`${openTime} - ${closeTime}`);
      }

      for (const day of dayNames) {
        if (groupedHours[day]) {
          hours.push({ day, hours: groupedHours[day].join(', ') });
        }
      }
    }

    return {
      businessName: location.title || '',
      address,
      phone: location.phoneNumbers?.primaryPhone || '',
      website: location.websiteUri || '',
      categories,
      hours,
      averageRating,
      totalReviewCount,
      mapsUri,
    };
  } catch (error) {
    console.error('Error getting GBP business info:', error);
    return null;
  }
}

export function isGBPConfigured(): boolean {
  return !!(process.env.GBP_CLIENT_ID && process.env.GBP_CLIENT_SECRET);
}

export function getGBPClientCredentials(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.GBP_CLIENT_ID;
  const clientSecret = process.env.GBP_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    return null;
  }
  
  return { clientId, clientSecret };
}
