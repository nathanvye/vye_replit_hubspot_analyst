import { Client } from '@hubspot/api-client';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=hubspot',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('HubSpot not connected');
  }
  return accessToken;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getUncachableHubSpotClient() {
  const accessToken = await getAccessToken();
  return new Client({ accessToken });
}

// HubSpot data fetching utilities
export async function getHubSpotAccounts() {
  const client = await getUncachableHubSpotClient();
  
  // Get account info from the API
  try {
    const accountInfo: any = await client.apiRequest({
      method: 'GET',
      path: '/account-info/v3/api-usage/daily',
    });
    
    return [{
      id: accountInfo.portalId?.toString() || 'default',
      name: `HubSpot Account ${accountInfo.portalId || 'Connected'}`,
      type: 'Connected'
    }];
  } catch (error) {
    console.error('Error fetching HubSpot accounts:', error);
    return [{
      id: 'default',
      name: 'Connected HubSpot Account',
      type: 'Connected'
    }];
  }
}

export async function getDeals(limit = 100) {
  const client = await getUncachableHubSpotClient();
  
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

export async function getContacts(limit = 100) {
  const client = await getUncachableHubSpotClient();
  
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

export async function getCompanies(limit = 100) {
  const client = await getUncachableHubSpotClient();
  
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

export async function searchDeals(filters: any) {
  const client = await getUncachableHubSpotClient();
  
  const searchRequest = {
    filterGroups: filters.filterGroups || [],
    sorts: filters.sorts || [],
    properties: filters.properties || ['dealname', 'amount', 'dealstage', 'closedate'],
    limit: filters.limit || 100,
  };
  
  const response = await client.crm.deals.searchApi.doSearch(searchRequest);
  return response.results;
}
