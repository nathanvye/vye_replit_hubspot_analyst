import { Client } from '@hubspot/api-client';

// Configuration for pagination
const PAGINATION_CONFIG = {
  pageSize: 100,       // Max per HubSpot API
  maxRecords: 5000,    // Safety cap to prevent infinite loops
  retryDelayMs: 1000,  // Initial delay for rate limit retries
  maxRetries: 3        // Max retries on 429 errors
};

// Create a HubSpot client with a user-provided API key (private app access token)
export function createHubSpotClient(apiKey: string) {
  return new Client({ accessToken: apiKey });
}

// Sleep utility for rate limiting
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Generic paginated fetch for HubSpot CRM objects
async function fetchAllPaginated<T>(
  fetchPage: (after?: string) => Promise<{ results: T[]; paging?: { next?: { after: string } } }>,
  maxRecords: number = PAGINATION_CONFIG.maxRecords
): Promise<T[]> {
  const allResults: T[] = [];
  let after: string | undefined = undefined;
  let retries = 0;

  while (allResults.length < maxRecords) {
    try {
      const response = await fetchPage(after);
      allResults.push(...response.results);

      // Check if there's more data
      if (!response.paging?.next?.after) {
        break; // No more pages
      }

      after = response.paging.next.after;
      retries = 0; // Reset retries on success
    } catch (error: any) {
      // Handle rate limiting (429 errors)
      if (error.code === 429 || error.response?.status === 429) {
        if (retries >= PAGINATION_CONFIG.maxRetries) {
          console.warn('Max retries reached for rate limiting, returning partial results');
          break;
        }
        const delay = PAGINATION_CONFIG.retryDelayMs * Math.pow(2, retries);
        console.log(`Rate limited, waiting ${delay}ms before retry...`);
        await sleep(delay);
        retries++;
        continue;
      }
      throw error;
    }
  }

  if (allResults.length >= maxRecords) {
    console.log(`Reached max records limit (${maxRecords}), stopping pagination`);
  }

  return allResults;
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

// Fetch ALL deals with pagination
export async function getDeals(apiKey: string, maxRecords = PAGINATION_CONFIG.maxRecords) {
  const client = createHubSpotClient(apiKey);
  
  const properties = [
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
  ];

  const deals = await fetchAllPaginated(
    async (after) => {
      const response = await client.crm.deals.basicApi.getPage(
        PAGINATION_CONFIG.pageSize,
        after,
        properties
      );
      return response;
    },
    maxRecords
  );
  
  console.log(`Fetched ${deals.length} deals total`);
  return deals;
}

// Fetch deals with owner names resolved
export async function getDealsWithOwners(apiKey: string, maxRecords = PAGINATION_CONFIG.maxRecords) {
  const [deals, ownerMap] = await Promise.all([
    getDeals(apiKey, maxRecords),
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

// Fetch ALL contacts with pagination
export async function getContacts(apiKey: string, maxRecords = PAGINATION_CONFIG.maxRecords) {
  const client = createHubSpotClient(apiKey);
  
  const properties = [
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
  ];

  const contacts = await fetchAllPaginated(
    async (after) => {
      const response = await client.crm.contacts.basicApi.getPage(
        PAGINATION_CONFIG.pageSize,
        after,
        properties
      );
      return response;
    },
    maxRecords
  );
  
  console.log(`Fetched ${contacts.length} contacts total`);
  return contacts;
}

// Fetch contacts with owner names resolved
export async function getContactsWithOwners(apiKey: string, maxRecords = PAGINATION_CONFIG.maxRecords) {
  const [contacts, ownerMap] = await Promise.all([
    getContacts(apiKey, maxRecords),
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

// Fetch ALL companies with pagination
export async function getCompanies(apiKey: string, maxRecords = PAGINATION_CONFIG.maxRecords) {
  const client = createHubSpotClient(apiKey);
  
  const properties = [
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
  ];

  const companies = await fetchAllPaginated(
    async (after) => {
      const response = await client.crm.companies.basicApi.getPage(
        PAGINATION_CONFIG.pageSize,
        after,
        properties
      );
      return response;
    },
    maxRecords
  );
  
  console.log(`Fetched ${companies.length} companies total`);
  return companies;
}

// Fetch all forms from HubSpot
export async function getAllForms(apiKey: string): Promise<{ id: string; name: string; createdAt: string }[]> {
  const client = createHubSpotClient(apiKey);
  const forms: { id: string; name: string; createdAt: string }[] = [];
  
  try {
    let after: string | undefined;
    
    do {
      const httpResponse: any = await client.apiRequest({
        method: 'GET',
        path: '/marketing/v3/forms',
        qs: { limit: 100, ...(after ? { after } : {}) }
      });
      
      // apiRequest returns a fetch Response object - need to parse JSON
      const response = await httpResponse.json();
      
      const results = response?.results || [];
      console.log(`Found ${results.length} forms in this page`);
      
      for (const form of results) {
        forms.push({
          id: form.id,
          name: form.name || 'Unnamed Form',
          createdAt: form.createdAt || ''
        });
      }
      
      after = response?.paging?.next?.after;
    } while (after);
    
    console.log(`Total forms fetched: ${forms.length}`);
    
    // Sort by name
    forms.sort((a, b) => a.name.localeCompare(b.name));
    
  } catch (error: any) {
    console.error('Error fetching all forms:', error.body?.message || error.message);
  }
  
  return forms;
}

// Look up a form by its GUID and return the form name
export async function getFormByGuid(apiKey: string, formGuid: string): Promise<{ formGuid: string; name: string; error?: string } | { error: string }> {
  const client = createHubSpotClient(apiKey);
  
  try {
    const httpResponse: any = await client.apiRequest({
      method: 'GET',
      path: `/marketing/v3/forms/${formGuid}`
    });
    
    // apiRequest returns a fetch Response object - need to parse JSON
    const response = await httpResponse.json();
    
    return {
      formGuid: response.id || formGuid,
      name: response.name || 'Unknown Form'
    };
  } catch (error: any) {
    const status = error.code || error.response?.status || error.statusCode;
    const message = error.body?.message || error.message || 'Unknown error';
    
    console.error(`Error fetching form by GUID (${status}):`, message);
    
    if (status === 404) {
      return { error: 'Form not found. Please check the form GUID is correct.' };
    } else if (status === 401 || status === 403) {
      return { error: 'Access denied. Your HubSpot API key may not have forms access.' };
    } else if (status === 429) {
      return { error: 'Rate limited. Please try again in a moment.' };
    } else {
      return { error: `Failed to lookup form: ${message}` };
    }
  }
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

// Get form submissions for 2025 with quarterly breakdown
export async function getFormSubmissions2025Quarterly(
  apiKey: string, 
  formGuid: string
): Promise<{ Q1: number; Q2: number; Q3: number; Q4: number; total: number }> {
  const client = createHubSpotClient(apiKey);
  
  // Quarter boundaries for 2025 (UTC timestamps in milliseconds)
  const quarters = {
    Q1: { start: Date.UTC(2025, 0, 1), end: Date.UTC(2025, 3, 1) },   // Jan 1 - Mar 31
    Q2: { start: Date.UTC(2025, 3, 1), end: Date.UTC(2025, 6, 1) },   // Apr 1 - Jun 30
    Q3: { start: Date.UTC(2025, 6, 1), end: Date.UTC(2025, 9, 1) },   // Jul 1 - Sep 30
    Q4: { start: Date.UTC(2025, 9, 1), end: Date.UTC(2026, 0, 1) }    // Oct 1 - Dec 31
  };
  
  const jan1_2025 = quarters.Q1.start;
  const jan1_2026 = quarters.Q4.end;
  
  const results = { Q1: 0, Q2: 0, Q3: 0, Q4: 0, total: 0 };
  
  try {
    let after: string | undefined;
    let totalFetched = 0;
    let foundOlderThan2025 = false;
    
    // Paginate through submissions using cursor-based pagination
    // API returns submissions in reverse chronological order (newest first)
    while (!foundOlderThan2025) {
      const qs: any = { limit: 50 };
      if (after) {
        qs.after = after;
      }
      
      const httpResponse: any = await client.apiRequest({
        method: 'GET',
        path: `/form-integrations/v1/submissions/forms/${formGuid}`,
        qs
      });
      
      const response = await httpResponse.json();
      const submissions = response.results || [];
      
      if (submissions.length === 0) break;
      
      for (const sub of submissions) {
        const ts = sub.submittedAt;
        
        // Skip future submissions (shouldn't happen but be safe)
        if (ts >= jan1_2026) continue;
        
        // If we've gone past 2025, we can stop paginating
        if (ts < jan1_2025) {
          foundOlderThan2025 = true;
          break;
        }
        
        // Count by quarter
        if (ts >= quarters.Q1.start && ts < quarters.Q1.end) {
          results.Q1++;
        } else if (ts >= quarters.Q2.start && ts < quarters.Q2.end) {
          results.Q2++;
        } else if (ts >= quarters.Q3.start && ts < quarters.Q3.end) {
          results.Q3++;
        } else if (ts >= quarters.Q4.start && ts < quarters.Q4.end) {
          results.Q4++;
        }
      }
      
      totalFetched += submissions.length;
      
      // Check for next page using cursor
      after = response.paging?.next?.after;
      if (!after) break;
      
      // Safety cap
      if (totalFetched >= 10000) {
        console.log(`Form ${formGuid}: reached 10000 submissions, stopping`);
        break;
      }
    }
    
    results.total = results.Q1 + results.Q2 + results.Q3 + results.Q4;
    console.log(`Form ${formGuid}: Q1=${results.Q1}, Q2=${results.Q2}, Q3=${results.Q3}, Q4=${results.Q4}, Total=${results.total}`);
    
  } catch (error: any) {
    console.error(`Error fetching form submissions for ${formGuid}:`, error.body?.message || error.message);
  }
  
  return results;
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

// Get contacts created in 2025 with quarterly breakdown
export async function getContacts2025Quarterly(apiKey: string): Promise<{ Q1: number; Q2: number; Q3: number; Q4: number; total: number }> {
  const client = createHubSpotClient(apiKey);
  
  // Define quarter boundaries for 2025 (UTC timestamps in milliseconds)
  const quarters = {
    Q1: { start: Date.UTC(2025, 0, 1), end: Date.UTC(2025, 3, 1) },   // Jan 1 - Mar 31
    Q2: { start: Date.UTC(2025, 3, 1), end: Date.UTC(2025, 6, 1) },   // Apr 1 - Jun 30
    Q3: { start: Date.UTC(2025, 6, 1), end: Date.UTC(2025, 9, 1) },   // Jul 1 - Sep 30
    Q4: { start: Date.UTC(2025, 9, 1), end: Date.UTC(2026, 0, 1) }    // Oct 1 - Dec 31
  };
  
  const jan1_2025 = quarters.Q1.start;
  const jan1_2026 = quarters.Q4.end;
  
  const results = { Q1: 0, Q2: 0, Q3: 0, Q4: 0, total: 0 };
  
  try {
    let after: string | undefined = undefined;
    let totalFetched = 0;
    let foundOlderThan2025 = false;
    
    // Paginate through all contacts (no date filter to ensure we get everything)
    while (!foundOlderThan2025) {
      const pageConfig: any = {
        limit: 100,
        properties: ['createdate']
      };
      
      if (after) {
        pageConfig.after = after;
      }
      
      const response = await client.crm.contacts.basicApi.getPage(
        pageConfig.limit,
        after,
        pageConfig.properties
      );
      
      const contacts = response.results || [];
      if (contacts.length === 0) break;
      
      for (const contact of contacts) {
        const createDateStr = contact.properties?.createdate;
        if (!createDateStr) continue;
        
        const ts = parseInt(createDateStr, 10);
        if (isNaN(ts)) continue;
        
        // Skip future submissions (shouldn't happen but be safe)
        if (ts >= jan1_2026) continue;
        
        // If we've gone past 2025, we can stop paginating
        if (ts < jan1_2025) {
          foundOlderThan2025 = true;
          break;
        }
        
        // Count by quarter
        if (ts >= quarters.Q1.start && ts < quarters.Q1.end) {
          results.Q1++;
        } else if (ts >= quarters.Q2.start && ts < quarters.Q2.end) {
          results.Q2++;
        } else if (ts >= quarters.Q3.start && ts < quarters.Q3.end) {
          results.Q3++;
        } else if (ts >= quarters.Q4.start && ts < quarters.Q4.end) {
          results.Q4++;
        }
      }
      
      totalFetched += contacts.length;
      
      // Check for next page
      after = response.paging?.next?.after;
      if (!after) break;
      
      // Safety cap
      if (totalFetched >= 50000) {
        console.log(`Contacts: reached 50000 total contacts, stopping`);
        break;
      }
    }
    
    results.total = results.Q1 + results.Q2 + results.Q3 + results.Q4;
    console.log(`2025 Contacts: Q1=${results.Q1}, Q2=${results.Q2}, Q3=${results.Q3}, Q4=${results.Q4}, Total=${results.total}`);
    
  } catch (error: any) {
    console.error(`Error fetching 2025 contacts:`, error.body?.message || error.message);
  }
  
  return results;
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

// Comprehensive data fetch for analysis (with full pagination)
export async function getComprehensiveData(apiKey: string, maxRecords = PAGINATION_CONFIG.maxRecords) {
  console.log('Starting comprehensive data fetch with pagination...');
  
  const [deals, contacts, companies, ownerMap, stageMap, contacts2025Quarterly] = await Promise.all([
    getDeals(apiKey, maxRecords).catch(e => { console.error('Deals fetch error:', e.body?.message || e.message); return []; }),
    getContacts(apiKey, maxRecords).catch(e => { console.error('Contacts fetch error:', e.body?.message || e.message); return []; }),
    getCompanies(apiKey, maxRecords).catch(e => { console.error('Companies fetch error:', e.body?.message || e.message); return []; }),
    getOwners(apiKey),
    getPipelineStages(apiKey),
    getContacts2025Quarterly(apiKey).catch(e => { console.error('2025 contacts fetch error:', e.body?.message || e.message); return { Q1: 0, Q2: 0, Q3: 0, Q4: 0, total: 0 }; })
  ]);
  
  console.log(`Comprehensive fetch complete: ${deals.length} deals, ${contacts.length} contacts, ${companies.length} companies, ${contacts2025Quarterly.total} contacts in 2025`);
  
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
  
  // Calculate quarterly breakdowns for 2025
  const currentYear = new Date().getFullYear();
  const getQuarter = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (date.getFullYear() !== currentYear) return null;
    const month = date.getMonth();
    if (month < 3) return 'Q1';
    if (month < 6) return 'Q2';
    if (month < 9) return 'Q3';
    return 'Q4';
  };

  // Use 2025 quarterly contacts from search API (accurate server-side filtering)
  const contactsByQuarter = {
    Q1: contacts2025Quarterly.Q1,
    Q2: contacts2025Quarterly.Q2,
    Q3: contacts2025Quarterly.Q3,
    Q4: contacts2025Quarterly.Q4
  };

  // Deals by quarter (based on create date)
  const dealsByQuarter = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
  const dealValueByQuarter = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
  for (const deal of enrichedDeals) {
    const q = getQuarter(deal.createDate);
    if (q) {
      dealsByQuarter[q]++;
      dealValueByQuarter[q] += deal.amount;
    }
  }

  // Companies by quarter
  const companiesByQuarter = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
  for (const company of enrichedCompanies) {
    const q = getQuarter(company.createDate);
    if (q) companiesByQuarter[q]++;
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
      owners: Array.from(ownerMap.entries()).map(([id, name]) => ({ id, name })),
      quarterly: {
        year: currentYear,
        contacts: contactsByQuarter,
        deals: dealsByQuarter,
        dealValue: dealValueByQuarter,
        companies: companiesByQuarter
      }
    }
  };
}
