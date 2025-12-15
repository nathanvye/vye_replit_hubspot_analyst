import { Client } from '@hubspot/api-client';

// Create a HubSpot client with a user-provided API key (private app access token)
export function createHubSpotClient(apiKey: string) {
  return new Client({ accessToken: apiKey });
}

// Validate an API key by fetching account info
export async function validateApiKeyAndGetAccountInfo(apiKey: string): Promise<{
  valid: boolean;
  portalId?: string;
  accountName?: string;
  error?: string;
}> {
  try {
    const client = createHubSpotClient(apiKey);
    const response: any = await client.apiRequest({
      method: 'GET',
      path: '/account-info/v3/details',
    });
    
    return {
      valid: true,
      portalId: response.portalId?.toString(),
      accountName: response.companyName || response.accountType || `Portal ${response.portalId}`
    };
  } catch (error: any) {
    console.error('API key validation error:', error);
    return {
      valid: false,
      error: error.message || 'Invalid API key'
    };
  }
}

// HubSpot data fetching utilities - all functions now require an API key
export async function getDeals(apiKey: string, limit = 100) {
  const client = createHubSpotClient(apiKey);
  
  const response = await client.crm.deals.basicApi.getPage(limit, undefined, [
    'dealname',
    'amount',
    'dealstage',
    'pipeline',
    'closedate',
    'createdate',
    'hs_lastmodifieddate'
  ]);
  
  return response.results;
}

export async function getContacts(apiKey: string, limit = 100) {
  const client = createHubSpotClient(apiKey);
  
  const response = await client.crm.contacts.basicApi.getPage(limit, undefined, [
    'firstname',
    'lastname',
    'email',
    'company',
    'phone',
    'createdate',
    'lastmodifieddate'
  ]);
  
  return response.results;
}

export async function getCompanies(apiKey: string, limit = 100) {
  const client = createHubSpotClient(apiKey);
  
  const response = await client.crm.companies.basicApi.getPage(limit, undefined, [
    'name',
    'domain',
    'industry',
    'numberofemployees',
    'annualrevenue',
    'createdate'
  ]);
  
  return response.results;
}

export async function searchDeals(apiKey: string, filters: any) {
  const client = createHubSpotClient(apiKey);
  
  const searchRequest = {
    filterGroups: filters.filterGroups || [],
    sorts: filters.sorts || [],
    properties: filters.properties || ['dealname', 'amount', 'dealstage', 'closedate'],
    limit: filters.limit || 100,
  };
  
  const response = await client.crm.deals.searchApi.doSearch(searchRequest);
  return response.results;
}
