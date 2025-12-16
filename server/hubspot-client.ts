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

// Fetch HubSpot owners (users who own deals/contacts)
export async function getOwners(apiKey: string): Promise<Map<string, string>> {
  const client = createHubSpotClient(apiKey);
  const ownerMap = new Map<string, string>();
  
  try {
    const response: any = await client.apiRequest({
      method: 'GET',
      path: '/crm/v3/owners',
      qs: { limit: 100 }
    });
    
    for (const owner of response.results || []) {
      const name = [owner.firstName, owner.lastName].filter(Boolean).join(' ') || owner.email || 'Unknown';
      ownerMap.set(owner.id, name);
    }
  } catch (error: any) {
    console.error('Error fetching owners:', error.body?.message || error.message);
  }
  
  return ownerMap;
}

// Fetch deals with enriched properties
export async function getDeals(apiKey: string, limit = 100) {
  const client = createHubSpotClient(apiKey);
  
  const response = await client.crm.deals.basicApi.getPage(limit, undefined, [
    'dealname',
    'amount',
    'dealstage',
    'pipeline',
    'closedate',
    'createdate',
    'hs_lastmodifieddate',
    'hubspot_owner_id',
    'hs_deal_stage_probability',
    'deal_currency_code',
    'notes_last_updated',
    'num_associated_contacts',
    'hs_forecast_amount',
    'hs_closed_amount'
  ]);
  
  return response.results;
}

// Fetch deals with owner names resolved
export async function getDealsWithOwners(apiKey: string, limit = 100) {
  const [deals, ownerMap] = await Promise.all([
    getDeals(apiKey, limit),
    getOwners(apiKey)
  ]);
  
  return deals.map(deal => {
    const ownerId = deal.properties.hubspot_owner_id;
    const ownerName = ownerId ? ownerMap.get(ownerId) || 'Unknown Owner' : 'Unassigned';
    return {
      ...deal,
      properties: {
        ...deal.properties,
        owner_name: ownerName
      }
    };
  });
}

// Fetch contacts with enriched properties
export async function getContacts(apiKey: string, limit = 100) {
  const client = createHubSpotClient(apiKey);
  
  const response = await client.crm.contacts.basicApi.getPage(limit, undefined, [
    'firstname',
    'lastname',
    'email',
    'company',
    'phone',
    'createdate',
    'lastmodifieddate',
    'hubspot_owner_id',
    'lifecyclestage',
    'hs_lead_status',
    'jobtitle',
    'city',
    'state',
    'country',
    'recent_conversion_event_name',
    'first_conversion_event_name',
    'num_conversion_events'
  ]);
  
  return response.results;
}

// Fetch contacts with owner names resolved
export async function getContactsWithOwners(apiKey: string, limit = 100) {
  const [contacts, ownerMap] = await Promise.all([
    getContacts(apiKey, limit),
    getOwners(apiKey)
  ]);
  
  return contacts.map(contact => {
    const ownerId = contact.properties.hubspot_owner_id;
    const ownerName = ownerId ? ownerMap.get(ownerId) || 'Unknown Owner' : 'Unassigned';
    return {
      ...contact,
      properties: {
        ...contact.properties,
        owner_name: ownerName
      }
    };
  });
}

// Fetch companies with enriched properties
export async function getCompanies(apiKey: string, limit = 100) {
  const client = createHubSpotClient(apiKey);
  
  const response = await client.crm.companies.basicApi.getPage(limit, undefined, [
    'name',
    'domain',
    'industry',
    'numberofemployees',
    'annualrevenue',
    'createdate',
    'hubspot_owner_id',
    'lifecyclestage',
    'city',
    'state',
    'country',
    'type'
  ]);
  
  return response.results;
}

// Fetch form submissions
export async function getFormSubmissions(apiKey: string, limit = 50): Promise<any[]> {
  const client = createHubSpotClient(apiKey);
  const submissions: any[] = [];
  
  try {
    // First get all forms
    const formsResponse: any = await client.apiRequest({
      method: 'GET',
      path: '/marketing/v3/forms',
      qs: { limit: 50 }
    });
    
    const forms = formsResponse.results || [];
    
    // Get submissions for each form (limited to avoid rate limits)
    for (const form of forms.slice(0, 10)) {
      try {
        const subResponse: any = await client.apiRequest({
          method: 'GET',
          path: `/form-integrations/v1/submissions/forms/${form.id}`,
          qs: { limit: Math.min(limit, 20) }
        });
        
        submissions.push({
          formId: form.id,
          formName: form.name,
          submissionCount: subResponse.results?.length || 0,
          recentSubmissions: (subResponse.results || []).slice(0, 5)
        });
      } catch (e: any) {
        // Form submissions may require additional scopes
        submissions.push({
          formId: form.id,
          formName: form.name,
          submissionCount: 'Access denied - needs forms scope',
          recentSubmissions: []
        });
      }
    }
  } catch (error: any) {
    console.error('Error fetching forms:', error.body?.message || error.message);
  }
  
  return submissions;
}

// Search deals with filters
export async function searchDeals(apiKey: string, filters: any) {
  const client = createHubSpotClient(apiKey);
  
  const searchRequest = {
    filterGroups: filters.filterGroups || [],
    sorts: filters.sorts || [],
    properties: filters.properties || ['dealname', 'amount', 'dealstage', 'closedate', 'hubspot_owner_id'],
    limit: filters.limit || 100,
  };
  
  const response = await client.crm.deals.searchApi.doSearch(searchRequest);
  return response.results;
}

// Get pipeline stages for mapping stage IDs to names
export async function getPipelineStages(apiKey: string): Promise<Map<string, { label: string; probability: number }>> {
  const client = createHubSpotClient(apiKey);
  const stageMap = new Map<string, { label: string; probability: number }>();
  
  try {
    const response: any = await client.apiRequest({
      method: 'GET',
      path: '/crm/v3/pipelines/deals'
    });
    
    for (const pipeline of response.results || []) {
      for (const stage of pipeline.stages || []) {
        stageMap.set(stage.id, {
          label: stage.label,
          probability: stage.metadata?.probability ? parseFloat(stage.metadata.probability) : 0
        });
      }
    }
  } catch (error: any) {
    console.error('Error fetching pipelines:', error.body?.message || error.message);
  }
  
  return stageMap;
}

// Comprehensive data fetch for analysis
export async function getComprehensiveData(apiKey: string) {
  const [deals, contacts, companies, ownerMap, stageMap] = await Promise.all([
    getDeals(apiKey, 100).catch(e => { console.error('Deals fetch error:', e.body?.message || e.message); return []; }),
    getContacts(apiKey, 100).catch(e => { console.error('Contacts fetch error:', e.body?.message || e.message); return []; }),
    getCompanies(apiKey, 50).catch(e => { console.error('Companies fetch error:', e.body?.message || e.message); return []; }),
    getOwners(apiKey),
    getPipelineStages(apiKey)
  ]);
  
  // Enrich deals with owner names and stage labels
  const enrichedDeals = deals.map(deal => {
    const ownerId = deal.properties.hubspot_owner_id;
    const stageId = deal.properties.dealstage;
    const stageInfo = stageId ? stageMap.get(stageId) : null;
    
    return {
      id: deal.id,
      name: deal.properties.dealname || 'Unnamed Deal',
      amount: parseFloat(deal.properties.amount || '0'),
      stage: stageInfo?.label || deal.properties.dealstage || 'Unknown',
      stageProbability: stageInfo?.probability || 0,
      pipeline: deal.properties.pipeline || 'default',
      owner: ownerId ? ownerMap.get(ownerId) || 'Unknown' : 'Unassigned',
      ownerId: ownerId || null,
      closeDate: deal.properties.closedate,
      createDate: deal.properties.createdate,
      lastModified: deal.properties.hs_lastmodifieddate
    };
  });
  
  // Enrich contacts with owner names
  const enrichedContacts = contacts.map(contact => {
    const ownerId = contact.properties.hubspot_owner_id;
    
    return {
      id: contact.id,
      firstName: contact.properties.firstname || '',
      lastName: contact.properties.lastname || '',
      fullName: [contact.properties.firstname, contact.properties.lastname].filter(Boolean).join(' ') || 'Unknown',
      email: contact.properties.email || '',
      company: contact.properties.company || '',
      phone: contact.properties.phone || '',
      owner: ownerId ? ownerMap.get(ownerId) || 'Unknown' : 'Unassigned',
      lifecycleStage: contact.properties.lifecyclestage || '',
      leadStatus: contact.properties.hs_lead_status || '',
      jobTitle: contact.properties.jobtitle || '',
      createDate: contact.properties.createdate,
      lastModified: contact.properties.lastmodifieddate,
      conversionEvents: parseInt(contact.properties.num_conversion_events || '0'),
      firstConversion: contact.properties.first_conversion_event_name || '',
      recentConversion: contact.properties.recent_conversion_event_name || ''
    };
  });
  
  // Enrich companies
  const enrichedCompanies = companies.map(company => ({
    id: company.id,
    name: company.properties.name || 'Unknown',
    domain: company.properties.domain || '',
    industry: company.properties.industry || '',
    employees: parseInt(company.properties.numberofemployees || '0'),
    revenue: parseFloat(company.properties.annualrevenue || '0'),
    createDate: company.properties.createdate,
    lifecycleStage: company.properties.lifecyclestage || ''
  }));
  
  // Build owner summary
  const ownerSummary: Record<string, { deals: number; totalValue: number }> = {};
  for (const deal of enrichedDeals) {
    const owner = deal.owner;
    if (!ownerSummary[owner]) {
      ownerSummary[owner] = { deals: 0, totalValue: 0 };
    }
    ownerSummary[owner].deals++;
    ownerSummary[owner].totalValue += deal.amount;
  }
  
  // Build stage summary
  const stageSummary: Record<string, { count: number; totalValue: number }> = {};
  for (const deal of enrichedDeals) {
    const stage = deal.stage;
    if (!stageSummary[stage]) {
      stageSummary[stage] = { count: 0, totalValue: 0 };
    }
    stageSummary[stage].count++;
    stageSummary[stage].totalValue += deal.amount;
  }
  
  return {
    deals: enrichedDeals,
    contacts: enrichedContacts,
    companies: enrichedCompanies,
    summary: {
      totalDeals: enrichedDeals.length,
      totalDealValue: enrichedDeals.reduce((sum, d) => sum + d.amount, 0),
      totalContacts: enrichedContacts.length,
      totalCompanies: enrichedCompanies.length,
      byOwner: ownerSummary,
      byStage: stageSummary,
      owners: Array.from(ownerMap.entries()).map(([id, name]) => ({ id, name }))
    }
  };
}
