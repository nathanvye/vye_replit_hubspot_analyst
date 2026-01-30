import { Client } from "@hubspot/api-client";

// Configuration for pagination
const PAGINATION_CONFIG = {
  pageSize: 100, // Max per HubSpot API
  maxRecords: 100000, // Safety cap - increased to handle large datasets
  retryDelayMs: 1000, // Initial delay for rate limit retries
  maxRetries: 3, // Max retries on 429 errors
};

// Create a HubSpot client with a user-provided API key (private app access token)
export function createHubSpotClient(apiKey: string) {
  return new Client({ accessToken: apiKey });
}

// Sleep utility for rate limiting
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Generic paginated fetch for HubSpot CRM objects
async function fetchAllPaginated<T>(
  fetchPage: (
    after?: string,
  ) => Promise<{ results: T[]; paging?: { next?: { after: string } } }>,
  maxRecords: number = PAGINATION_CONFIG.maxRecords,
): Promise<T[]> {
  const allResults: T[] = [];
  let after: string | undefined = undefined;
  let retries = 0;

  while (allResults.length < maxRecords) {
    try {
      const response = await fetchPage(after);
      if (!response || !response.results) {
        console.warn("HubSpot API returned empty or invalid response");
        break;
      }
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
          console.warn(
            "Max retries reached for rate limiting, returning partial results",
          );
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
    console.log(
      `Reached max records limit (${maxRecords}), stopping pagination`,
    );
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
      method: "GET",
      path: "/account-info/v3/details",
    });

    return {
      valid: true,
      portalId: response.portalId?.toString(),
      accountName:
        response.companyName ||
        response.accountType ||
        `Portal ${response.portalId}`,
    };
  } catch (error: any) {
    console.error("API key validation error:", error);
    return {
      valid: false,
      error: error.message || "Invalid API key",
    };
  }
}

// Fetch HubSpot owners (users who own deals/contacts)
export async function getOwners(apiKey: string): Promise<Map<string, string>> {
  const client = createHubSpotClient(apiKey);
  const ownerMap = new Map<string, string>();

  try {
    const response: any = await client.apiRequest({
      method: "GET",
      path: "/crm/v3/owners",
      qs: { limit: 100 },
    });

    for (const owner of response.results || []) {
      const name =
        [owner.firstName, owner.lastName].filter(Boolean).join(" ") ||
        owner.email ||
        "Unknown";
      ownerMap.set(owner.id, name);
    }
  } catch (error: any) {
    console.error(
      "Error fetching owners:",
      error.body?.message || error.message,
    );
  }

  return ownerMap;
}

// Fetch ALL deals with pagination
export async function getDeals(
  apiKey: string,
  maxRecords = PAGINATION_CONFIG.maxRecords,
) {
  const client = createHubSpotClient(apiKey);

  const properties = [
    "dealname",
    "amount",
    "dealstage",
    "pipeline",
    "closedate",
    "createdate",
    "hs_lastmodifieddate",
    "hubspot_owner_id",
    "hs_deal_stage_probability",
    "deal_currency_code",
    "notes_last_updated",
    "num_associated_contacts",
    "hs_forecast_amount",
    "hs_closed_amount",
  ];

  const deals = await fetchAllPaginated(async (after) => {
    const response = await client.crm.deals.basicApi.getPage(
      PAGINATION_CONFIG.pageSize,
      after,
      properties,
    );
    return response;
  }, maxRecords);

  console.log(`Fetched ${deals.length} deals total`);
  return deals;
}

// Fetch deals with owner names resolved
export async function getDealsWithOwners(
  apiKey: string,
  maxRecords = PAGINATION_CONFIG.maxRecords,
) {
  const [deals, ownerMap] = await Promise.all([
    getDeals(apiKey, maxRecords),
    getOwners(apiKey),
  ]);

  return deals.map((deal) => {
    const ownerId = deal.properties.hubspot_owner_id;
    const ownerName = ownerId
      ? ownerMap.get(ownerId) || "Unknown Owner"
      : "Unassigned";
    return {
      ...deal,
      properties: {
        ...deal.properties,
        owner_name: ownerName,
      },
    };
  });
}

// Fetch ALL contacts with pagination
export async function getContacts(
  apiKey: string,
  maxRecords = PAGINATION_CONFIG.maxRecords,
) {
  const client = createHubSpotClient(apiKey);

  const properties = [
    "firstname",
    "lastname",
    "email",
    "company",
    "phone",
    "createdate",
    "lastmodifieddate",
    "hubspot_owner_id",
    "lifecyclestage",
    "hs_lifecyclestage_subscriber_date",
    "hs_lifecyclestage_lead_date",
    "hs_lifecyclestage_marketingqualifiedlead_date",
    "hs_lifecyclestage_salesqualifiedlead_date",
    "hs_lifecyclestage_opportunity_date",
    "hs_lifecyclestage_customer_date",
    "hs_lifecyclestage_evangelist_date",
    "hs_lifecyclestage_other_date",
    "hs_lead_status",
    "jobtitle",
    "city",
    "state",
    "country",
    "recent_conversion_event_name",
    "first_conversion_event_name",
    "num_conversion_events",
  ];

  const contacts = await fetchAllPaginated(async (after) => {
    const response = await client.crm.contacts.basicApi.getPage(
      PAGINATION_CONFIG.pageSize,
      after,
      properties,
    );
    return response;
  }, maxRecords);

  console.log(`Fetched ${contacts.length} contacts total`);
  return contacts;
}

// Fetch contacts with owner names resolved
export async function getContactsWithOwners(
  apiKey: string,
  maxRecords = PAGINATION_CONFIG.maxRecords,
) {
  const [contacts, ownerMap] = await Promise.all([
    getContacts(apiKey, maxRecords),
    getOwners(apiKey),
  ]);

  return contacts.map((contact) => {
    const ownerId = contact.properties.hubspot_owner_id;
    const ownerName = ownerId
      ? ownerMap.get(ownerId) || "Unknown Owner"
      : "Unassigned";
    return {
      ...contact,
      properties: {
        ...contact.properties,
        owner_name: ownerName,
      },
    };
  });
}

// Fetch ALL companies with pagination
export async function getCompanies(
  apiKey: string,
  maxRecords = PAGINATION_CONFIG.maxRecords,
) {
  const client = createHubSpotClient(apiKey);

  const properties = [
    "name",
    "domain",
    "industry",
    "numberofemployees",
    "annualrevenue",
    "createdate",
    "hubspot_owner_id",
    "lifecyclestage",
    "city",
    "state",
    "country",
    "type",
  ];

  const companies = await fetchAllPaginated(async (after) => {
    const response = await client.crm.companies.basicApi.getPage(
      PAGINATION_CONFIG.pageSize,
      after,
      properties,
    );
    return response;
  }, maxRecords);

  console.log(`Fetched ${companies.length} companies total`);
  return companies;
}

// Fetch all forms from HubSpot
export async function getAllForms(
  apiKey: string,
): Promise<{ id: string; name: string; createdAt: string }[]> {
  const client = createHubSpotClient(apiKey);
  const forms: { id: string; name: string; createdAt: string }[] = [];

  try {
    let after: string | undefined;

    do {
      const httpResponse: any = await client.apiRequest({
        method: "GET",
        path: "/marketing/v3/forms",
        qs: { limit: 100, ...(after ? { after } : {}) },
      });

      // apiRequest returns a fetch Response object - need to parse JSON
      const response = await httpResponse.json();

      const results = response?.results || [];
      console.log(`Found ${results.length} forms in this page`);

      for (const form of results) {
        forms.push({
          id: form.id,
          name: form.name || "Unnamed Form",
          createdAt: form.createdAt || "",
        });
      }

      after = response?.paging?.next?.after;
    } while (after);

    console.log(`Total forms fetched: ${forms.length}`);

    // Sort by name
    forms.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error: any) {
    console.error(
      "Error fetching all forms:",
      error.body?.message || error.message,
    );
  }

  return forms;
}

// Fetch all lists from HubSpot
export async function getAllLists(
  apiKey: string,
): Promise<{ listId: string; name: string; size: number }[]> {
  const client = createHubSpotClient(apiKey);
  const lists: { listId: string; name: string; size: number }[] = [];

  try {
    let offset = 0;
    const count = 100;
    let hasMore = true;

    while (hasMore) {
      const httpResponse: any = await client.apiRequest({
        method: "POST",
        path: "/crm/v3/lists/search",
        body: {
          count,
          offset,
          query: "",
        },
      });

      const response = await httpResponse.json();
      const results = response?.lists || [];
      console.log(
        `Found ${results.length} lists in this page (offset: ${offset})`,
      );

      // Log first list structure to debug
      if (offset === 0 && results.length > 0) {
        console.log(
          "Sample list structure:",
          JSON.stringify(results[0], null, 2),
        );
      }

      for (const list of results) {
        // Try multiple possible locations for the size/member count
        // HubSpot v3 Lists API typically returns size in metaData.size
        let rawSize =
          list.metaData?.size ??
          list.additionalProperties?.hs_list_size ??
          list.size ??
          0;

        // Ensure we have a valid number
        const size =
          typeof rawSize === "number" ? rawSize : parseInt(String(rawSize), 10);
        const validSize = isNaN(size) ? 0 : size;

        lists.push({
          listId: list.listId?.toString() || "",
          name: list.name || "Unnamed List",
          size: validSize,
        });
      }

      // Check for more pages using offset-based pagination
      hasMore = response?.hasMore === true;
      offset =
        response?.offset !== undefined ? response.offset : offset + count;

      // Safety cap
      if (lists.length >= 10000) {
        console.log("Reached max lists limit, stopping pagination");
        break;
      }
    }

    console.log(`Total lists fetched: ${lists.length}`);

    // Sort by name
    lists.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error: any) {
    console.error(
      "Error fetching all lists:",
      error.body?.message || error.message,
    );
  }

  return lists;
}

// Look up a list by its ID and return the list details
export async function getListById(
  apiKey: string,
  listId: string,
): Promise<{ listId: string; name: string; size: number } | { error: string }> {
  const client = createHubSpotClient(apiKey);

  try {
    const httpResponse: any = await client.apiRequest({
      method: "GET",
      path: `/crm/v3/lists/${listId}`,
    });

    const response = await httpResponse.json();

    console.log("List by ID response:", JSON.stringify(response, null, 2));

    // In HubSpot v3, the list details are often wrapped in a 'list' property
    const listData = response.list || response;
    const name = listData.name || listData.label || "Unknown List";

    // Get size from metaData.size (HubSpot v3 Lists API standard location)
    let rawSize =
      listData.metaData?.size ??
      listData.additionalProperties?.hs_list_size ??
      listData.size ??
      0;

    // Ensure we have a valid number
    const size =
      typeof rawSize === "number" ? rawSize : parseInt(String(rawSize), 10);
    const validSize = isNaN(size) ? 0 : size;

    if (validSize === 0 && rawSize !== 0) {
      console.warn(`List ${listId} has non-numeric size value:`, rawSize);
    }

    return {
      listId: listData.listId?.toString() || listId,
      name,
      size: validSize,
    };
  } catch (error: any) {
    const status = error.code || error.response?.status || error.statusCode;
    const message = error.body?.message || error.message || "Unknown error";

    console.error(`Error fetching list by ID (${status}):`, message);

    if (status === 404) {
      return {
        error: "List not found. Please check the list ID is correct.",
      };
    } else if (status === 401 || status === 403) {
      return {
        error: "Access denied. Your HubSpot API key may not have lists access.",
      };
    } else if (status === 429) {
      return { error: "Rate limited. Please try again in a moment." };
    } else {
      return { error: `Failed to lookup list: ${message}` };
    }
  }
}

// Look up a form by its GUID and return the form name
export async function getFormByGuid(
  apiKey: string,
  formGuid: string,
): Promise<
  { formGuid: string; name: string; error?: string } | { error: string }
> {
  const client = createHubSpotClient(apiKey);

  try {
    const httpResponse: any = await client.apiRequest({
      method: "GET",
      path: `/marketing/v3/forms/${formGuid}`,
    });

    // apiRequest returns a fetch Response object - need to parse JSON
    const response = await httpResponse.json();

    return {
      formGuid: response.id || formGuid,
      name: response.name || "Unknown Form",
    };
  } catch (error: any) {
    const status = error.code || error.response?.status || error.statusCode;
    const message = error.body?.message || error.message || "Unknown error";

    console.error(`Error fetching form by GUID (${status}):`, message);

    if (status === 404) {
      return {
        error: "Form not found. Please check the form GUID is correct.",
      };
    } else if (status === 401 || status === 403) {
      return {
        error: "Access denied. Your HubSpot API key may not have forms access.",
      };
    } else if (status === 429) {
      return { error: "Rate limited. Please try again in a moment." };
    } else {
      return { error: `Failed to lookup form: ${message}` };
    }
  }
}

// Fetch form submissions
export async function getFormSubmissions(
  apiKey: string,
  limit = 50,
): Promise<any[]> {
  const client = createHubSpotClient(apiKey);
  const submissions: any[] = [];

  try {
    // First get all forms
    const formsResponse: any = await client.apiRequest({
      method: "GET",
      path: "/marketing/v3/forms",
      qs: { limit: 50 },
    });

    const forms = formsResponse.results || [];

    // Get submissions for each form (limited to avoid rate limits)
    for (const form of forms.slice(0, 10)) {
      try {
        const subResponse: any = await client.apiRequest({
          method: "GET",
          path: `/form-integrations/v1/submissions/forms/${form.id}`,
          qs: { limit: Math.min(limit, 20) },
        });

        submissions.push({
          formId: form.id,
          formName: form.name,
          submissionCount: subResponse.results?.length || 0,
          recentSubmissions: (subResponse.results || []).slice(0, 5),
        });
      } catch (e: any) {
        // Form submissions may require additional scopes
        submissions.push({
          formId: form.id,
          formName: form.name,
          submissionCount: "Access denied - needs forms scope",
          recentSubmissions: [],
        });
      }
    }
  } catch (error: any) {
    console.error(
      "Error fetching forms:",
      error.body?.message || error.message,
    );
  }

  return submissions;
}

// Get form submissions for a specific year with quarterly breakdown
export async function getFormSubmissionsQuarterly(
  apiKey: string,
  formGuid: string,
  year: number = new Date().getFullYear(),
): Promise<{ Q1: number; Q2: number; Q3: number; Q4: number; total: number }> {
  const client = createHubSpotClient(apiKey);

  // Quarter boundaries for the specified year (UTC timestamps in milliseconds)
  const quarters = {
    Q1: { start: Date.UTC(year, 0, 1), end: Date.UTC(year, 3, 1) }, // Jan 1 - Mar 31
    Q2: { start: Date.UTC(year, 3, 1), end: Date.UTC(year, 6, 1) }, // Apr 1 - Jun 30
    Q3: { start: Date.UTC(year, 6, 1), end: Date.UTC(year, 9, 1) }, // Jul 1 - Sep 30
    Q4: { start: Date.UTC(year, 9, 1), end: Date.UTC(year + 1, 0, 1) }, // Oct 1 - Dec 31
  };

  const yearStart = quarters.Q1.start;
  const yearEnd = quarters.Q4.end;

  const results = { Q1: 0, Q2: 0, Q3: 0, Q4: 0, total: 0 };

  try {
    let after: string | undefined;
    let totalFetched = 0;
    let foundOlderThanYear = false;

    // Paginate through submissions using cursor-based pagination
    // API returns submissions in reverse chronological order (newest first)
    while (!foundOlderThanYear) {
      const qs: any = { limit: 50 };
      if (after) {
        qs.after = after;
      }

      const httpResponse: any = await client.apiRequest({
        method: "GET",
        path: `/form-integrations/v1/submissions/forms/${formGuid}`,
        qs,
      });

      const response = await httpResponse.json();
      const submissions = response.results || [];

      if (submissions.length === 0) break;

      for (const sub of submissions) {
        const ts = sub.submittedAt;

        // Skip future submissions (shouldn't happen but be safe)
        if (ts >= yearEnd) continue;

        // If we've gone past the target year, we can stop paginating
        if (ts < yearStart) {
          foundOlderThanYear = true;
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
    console.log(
      `Form ${formGuid}: Q1=${results.Q1}, Q2=${results.Q2}, Q3=${results.Q3}, Q4=${results.Q4}, Total=${results.total}`,
    );
  } catch (error: any) {
    console.error(
      `Error fetching form submissions for ${formGuid}:`,
      error.body?.message || error.message,
    );
  }

  return results;
}

// Search deals with filters
export async function searchDeals(apiKey: string, filters: any) {
  const client = createHubSpotClient(apiKey);

  const searchRequest: any = {
    filterGroups: filters.filterGroups || [],
    sorts: filters.sorts || [],
    properties: filters.properties || [
      "dealname",
      "amount",
      "dealstage",
      "closedate",
      "hubspot_owner_id",
    ],
    limit: filters.limit || 100,
  };

  if (filters.after) {
    searchRequest.after = filters.after;
  }

  // Ensure all filter values are strings
  if (searchRequest.filterGroups) {
    for (const group of searchRequest.filterGroups) {
      if (group.filters) {
        for (const filter of group.filters) {
          if (filter.value !== undefined && filter.value !== null) {
            filter.value = String(filter.value);
          }
        }
      }
    }
  }

  const response = await client.crm.deals.searchApi.doSearch(searchRequest);
  return response.results;
}

// Count contacts that entered a lifecycle stage in a specific quarter using v2 date properties
// Uses BETWEEN operator and returns total from response for efficiency
async function countContactsInLifecycleDateRange(
  apiKey: string,
  propertyName: string,
  year: number,
  quarter: "Q1" | "Q2" | "Q3" | "Q4",
): Promise<number> {
  const client = createHubSpotClient(apiKey);

  const quarterRanges: Record<string, { start: number; end: number }> = {
    Q1: { start: Date.UTC(year, 0, 1), end: Date.UTC(year, 3, 1) - 1 },
    Q2: { start: Date.UTC(year, 3, 1), end: Date.UTC(year, 6, 1) - 1 },
    Q3: { start: Date.UTC(year, 6, 1), end: Date.UTC(year, 9, 1) - 1 },
    Q4: { start: Date.UTC(year, 9, 1), end: Date.UTC(year + 1, 0, 1) - 1 },
  };

  const range = quarterRanges[quarter];
  let retries = 0;

  while (retries < 3) {
    try {
      const searchRequest: any = {
        filterGroups: [
          {
            filters: [
              {
                propertyName: propertyName,
                operator: "BETWEEN",
                value: String(range.start),
                highValue: String(range.end),
              },
            ],
          },
        ],
        limit: 1, // We only need the total count, not the actual records
      };

      const response = await client.crm.contacts.searchApi.doSearch(searchRequest);
      const total = response.total || 0;
      
      console.log(`[MQL/SQL v2] ${propertyName} ${year} ${quarter}: ${total} contacts`);
      return total;
    } catch (error: any) {
      if (error.code === 429 || error.response?.status === 429) {
        const delay = 1000 * Math.pow(2, retries);
        console.log(`Rate limited, waiting ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        retries++;
        continue;
      }
      console.warn(`Error counting ${propertyName} for ${quarter}:`, error.body?.message || error.message);
      return 0;
    }
  }

  return 0;
}

// Count SQLs that entered in a specific quarter using v2 date property
export async function getSQLsEnteredInQuarter(
  apiKey: string,
  year: number,
  quarter: "Q1" | "Q2" | "Q3" | "Q4",
): Promise<number> {
  try {
    return await countContactsInLifecycleDateRange(
      apiKey,
      "hs_v2_date_entered_salesqualifiedlead",
      year,
      quarter
    );
  } catch (error: any) {
    console.warn(`getSQLsEnteredInQuarter ${quarter} failed (returning 0):`, error.message);
    return 0;
  }
}

// Count MQLs that entered in a specific quarter using v2 date property
export async function getMQLsEnteredInQuarter(
  apiKey: string,
  year: number,
  quarter: "Q1" | "Q2" | "Q3" | "Q4",
): Promise<number> {
  try {
    return await countContactsInLifecycleDateRange(
      apiKey,
      "hs_v2_date_entered_marketingqualifiedlead",
      year,
      quarter
    );
  } catch (error: any) {
    console.warn(`getMQLsEnteredInQuarter ${quarter} failed (returning 0):`, error.message);
    return 0;
  }
}

// Helper to delay execution
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Get contacts created in a specific year with quarterly breakdown using search API
export async function getContactsQuarterly(
  apiKey: string,
  year: number = new Date().getFullYear(),
): Promise<{ Q1: number; Q2: number; Q3: number; Q4: number; total: number }> {
  const client = createHubSpotClient(apiKey);

  // Define quarter boundaries for the specified year (UTC timestamps in milliseconds)
  const quarters = {
    Q1: { start: Date.UTC(year, 0, 1), end: Date.UTC(year, 3, 1) }, // Jan 1 - Mar 31
    Q2: { start: Date.UTC(year, 3, 1), end: Date.UTC(year, 6, 1) }, // Apr 1 - Jun 30
    Q3: { start: Date.UTC(year, 6, 1), end: Date.UTC(year, 9, 1) }, // Jul 1 - Sep 30
    Q4: { start: Date.UTC(year, 9, 1), end: Date.UTC(year + 1, 0, 1) }, // Oct 1 - Dec 31
  };

  const results = { Q1: 0, Q2: 0, Q3: 0, Q4: 0, total: 0 };

  // Fetch counts for each quarter using search API
  let quarterIndex = 0;
  for (const [quarter, range] of Object.entries(quarters)) {
    // Add delay between quarters to avoid rate limiting
    if (quarterIndex > 0) {
      await delay(1500); // 1.5 second delay between quarters
    }
    quarterIndex++;

    try {
      let after: string | undefined = undefined;
      let quarterCount = 0;
      let pageCount = 0;

      // Paginate through all contacts in this quarter
      while (true) {
        // Add small delay between pages to avoid rate limits
        if (pageCount > 0 && pageCount % 5 === 0) {
          await delay(500); // 0.5 second delay every 5 pages
        }
        pageCount++;

        const searchRequest: any = {
          filterGroups: [
            {
              filters: [
                {
                  propertyName: "createdate",
                  operator: "GTE",
                  value: String(range.start),
                },
                {
                  propertyName: "createdate",
                  operator: "LT",
                  value: String(range.end),
                },
              ],
            },
          ],
          properties: ["createdate"],
          limit: 100,
        };

        if (after) {
          searchRequest.after = after;
        }

        try {
          const response =
            await client.crm.contacts.searchApi.doSearch(searchRequest);
          quarterCount += response.results?.length || 0;

          if (!response.paging?.next?.after) break;
          after = response.paging.next.after;
        } catch (error: any) {
          console.error(`Error in getContactsQuarterly ${quarter} search:`, error.body || error);
          throw error;
        }

        // Safety cap per quarter
        if (quarterCount >= 10000) {
          console.log(`Quarter ${quarter} reached 10000 contacts, stopping`);
          break;
        }
      }

      results[quarter as keyof typeof results] = quarterCount;
      results.total += quarterCount;
      console.log(`${year} ${quarter}: ${quarterCount} contacts`);
    } catch (error: any) {
      console.error(
        `Error fetching ${quarter} contacts:`,
        error.body?.message || error.message,
      );
      // Retry once after a longer delay if rate limited
      if (
        error.body?.message?.includes("limit") ||
        error.message?.includes("limit")
      ) {
        console.log(`Retrying ${quarter} after rate limit delay...`);
        await delay(3000);
        try {
          let after: string | undefined = undefined;
          let quarterCount = 0;

          while (true) {
            await delay(300); // Slow down for retry

            const searchRequest: any = {
              filterGroups: [
                {
                  filters: [
                    {
                      propertyName: "createdate",
                      operator: "GTE",
                      value: String(range.start),
                    },
                    {
                      propertyName: "createdate",
                      operator: "LT",
                      value: String(range.end),
                    },
                  ],
                },
              ],
              properties: ["createdate"],
              limit: 100,
            };

            if (after) {
              searchRequest.after = after;
            }

            try {
              const response =
                await client.crm.contacts.searchApi.doSearch(searchRequest);
              quarterCount += response.results?.length || 0;

              if (!response.paging?.next?.after) break;
              after = response.paging.next.after;
            } catch (error: any) {
              console.error(`Error in getContactsQuarterly retry ${quarter} search:`, error.body || error);
              throw error;
            }

            if (quarterCount >= 10000) break;
          }

          results[quarter as keyof typeof results] = quarterCount;
          results.total += quarterCount;
          console.log(`${year} ${quarter} (retry): ${quarterCount} contacts`);
        } catch (retryError: any) {
          console.error(
            `Retry failed for ${quarter}:`,
            retryError.body?.message || retryError.message,
          );
        }
      }
    }
  }

  console.log(`Total ${year} contacts: ${results.total}`);
  return results;
}

// Traffic report ID for website sessions
const TRAFFIC_REPORT_ID = "157824153";

// Step 2: POST /reports/v2/reports/{REPORT_ID}/data with date range
async function runReportForDateRange(
  apiKey: string,
  reportId: string,
  startDate: string,
  endDate: string,
): Promise<number> {
  try {
    const response = await fetch(
      `https://api.hubapi.com/reports/v2/reports/${reportId}/data`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          startDate,
          endDate,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Report data API error (${response.status}):`,
        errorText.substring(0, 500),
      );
      return 0;
    }

    const data = await response.json();

    // Step 3: Sum all values from the data array
    let totalSessions = 0;

    if (data.data && Array.isArray(data.data)) {
      for (const row of data.data) {
        const value = row.value || row.sessions || row.visits || row.count || 0;
        if (typeof value === "number") {
          totalSessions += value;
        } else if (typeof value === "string") {
          totalSessions += parseInt(value, 10) || 0;
        }
      }
    } else if (data.totals?.sessions !== undefined) {
      totalSessions = data.totals.sessions;
    } else if (data.total !== undefined) {
      totalSessions = data.total;
    }

    return totalSessions;
  } catch (error: any) {
    console.error(
      `Error running report for ${startDate}-${endDate}:`,
      error.message,
    );
    return 0;
  }
}

// Get website sessions by quarter for a specific year
// Uses Reports API v2:
// POST /reports/v2/reports/{REPORT_ID}/data with date range per quarter
// Sum all values from data array
export async function getWebsiteSessionsQuarterly(
  apiKey: string,
  year: number = new Date().getFullYear(),
): Promise<{
  Q1: number;
  Q2: number;
  Q3: number;
  Q4: number;
  total: number;
  status?: string;
}> {
  const results: {
    Q1: number;
    Q2: number;
    Q3: number;
    Q4: number;
    total: number;
    status?: string;
  } = {
    Q1: 0,
    Q2: 0,
    Q3: 0,
    Q4: 0,
    total: 0,
  };

  console.log(
    `Fetching website sessions for ${year} using report ID: ${TRAFFIC_REPORT_ID}`,
  );

  // Define quarter boundaries (YYYY-MM-DD format)
  const quarters = {
    Q1: { start: `${year}-01-01`, end: `${year}-03-31` },
    Q2: { start: `${year}-04-01`, end: `${year}-06-30` },
    Q3: { start: `${year}-07-01`, end: `${year}-09-30` },
    Q4: { start: `${year}-10-01`, end: `${year}-12-31` },
  };

  let quarterIndex = 0;

  for (const [quarter, range] of Object.entries(quarters)) {
    // Add delay between quarters to avoid rate limiting
    if (quarterIndex > 0) {
      await delay(1500);
    }
    quarterIndex++;

    // Run report and sum values
    const sessions = await runReportForDateRange(
      apiKey,
      TRAFFIC_REPORT_ID,
      range.start,
      range.end,
    );
    if (quarter === "Q1") results.Q1 = sessions;
    else if (quarter === "Q2") results.Q2 = sessions;
    else if (quarter === "Q3") results.Q3 = sessions;
    else if (quarter === "Q4") results.Q4 = sessions;
    results.total += sessions;
    console.log(`${year} ${quarter} website sessions: ${sessions}`);
  }

  if (results.total === 0) {
    results.status =
      "Sessions returned 0. Check server logs for API response details.";
  }

  console.log(`Total ${year} website sessions: ${results.total}`);
  return results;
}

// Get pipeline stages for mapping stage IDs to names
export async function getPipelineStages(
  apiKey: string,
): Promise<Map<string, { label: string; probability: number }>> {
  const client = createHubSpotClient(apiKey);
  const stageMap = new Map<string, { label: string; probability: number }>();

  try {
    const response: any =
      await client.crm.pipelines.pipelinesApi.getAll("deals");

    console.log(`Fetched ${response.results?.length || 0} pipelines`);

    for (const pipeline of response.results || []) {
      console.log(
        `Pipeline: ${pipeline.label} (${pipeline.id}) with ${pipeline.stages?.length || 0} stages`,
      );
      for (const stage of pipeline.stages || []) {
        stageMap.set(stage.id, {
          label: stage.label,
          probability: stage.metadata?.probability
            ? parseFloat(stage.metadata.probability)
            : 0,
        });
        console.log(`  Stage: ${stage.id} -> ${stage.label}`);
      }
    }

    console.log(`Total stages mapped: ${stageMap.size}`);
  } catch (error: any) {
    console.error(
      "Error fetching pipelines:",
      error.body?.message || error.message,
    );
  }

  return stageMap;
}

// Get list of deal pipelines
export async function getDealPipelines(privateAppToken: string): Promise<
  {
    id: string;
    label: string;
    displayOrder: number;
    stages: { id: string; label: string }[];
  }[]
> {
  const pipelines = [];

  try {
    console.log("N8: Fetching deal pipelines...");

    const res = await fetch("https://api.hubapi.com/crm/v3/pipelines/deals", {
      headers: {
        Authorization: `Bearer ${privateAppToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();
    console.log("N8: Deal pipelines response:", JSON.stringify(data, null, 2));
    if (!res.ok) {
      console.error("HubSpot API error:", data);
      return [];
    }

    for (const pipeline of data.results || []) {
      pipelines.push({
        id: pipeline.id,
        label: pipeline.label,
        displayOrder: pipeline.displayOrder ?? 0,
        stages: (pipeline.stages || []).map((s: any) => ({
          id: s.id,
          label: s.label,
        })),
      });
    }
  } catch (err: any) {
    console.error("Error fetching deal pipelines:", err);
  }

  return pipelines;
}

// Fetch contacts with lifecycle stage history (includes "became X" dates)
export async function getContactsWithLifecycleHistory(
  apiKey: string,
  maxRecords = PAGINATION_CONFIG.maxRecords,
) {
  const client = createHubSpotClient(apiKey);

  const properties = [
    "firstname",
    "lastname",
    "email",
    "lifecyclestage",
    "createdate",
    "hs_lifecyclestage_subscriber_date",
    "hs_lifecyclestage_lead_date",
    "hs_lifecyclestage_marketingqualifiedlead_date",
    "hs_lifecyclestage_salesqualifiedlead_date",
    "hs_lifecyclestage_opportunity_date",
    "hs_lifecyclestage_customer_date",
    "hs_lifecyclestage_evangelist_date",
    "hs_lifecyclestage_other_date",
  ];

  const contacts = await fetchAllPaginated(async (after) => {
    const response = await client.crm.contacts.basicApi.getPage(
      PAGINATION_CONFIG.pageSize,
      after,
      properties,
    );
    return response;
  }, maxRecords);

  console.log(`Fetched ${contacts.length} contacts with lifecycle history`);

  // Debug: Log first contact's FULL properties to see what HubSpot actually returns
  if (contacts.length > 0) {
    console.log(
      `[Lifecycle History Debug] First contact FULL properties:`,
      JSON.stringify(contacts[0].properties, null, 2),
    );

    // Also check which property keys contain "lifecycle"
    const allKeys = Object.keys(contacts[0].properties);
    const lifecycleKeys = allKeys.filter((k) =>
      k.toLowerCase().includes("lifecycle"),
    );
    console.log(
      `[Lifecycle History Debug] Available lifecycle-related properties:`,
      lifecycleKeys,
    );
  }

  return contacts;
}

// Get lifecycle stage breakdown with quarterly "became X" counts
// Uses Search API to count contacts created in each quarter with each lifecycle stage
export async function getLifecycleStageBreakdown(
  apiKey: string,
  year: number = new Date().getFullYear(),
): Promise<{
  currentCounts: Record<string, number>;
  quarterlyBecame: Record<
    string,
    { Q1: number; Q2: number; Q3: number; Q4: number; total: number }
  >;
}> {
  const client = createHubSpotClient(apiKey);
  const contacts = await getContactsWithLifecycleHistory(apiKey);

  const lifecycleStages = [
    {
      key: "subscriber",
      label: "Subscriber",
      dateField: "hs_lifecyclestage_subscriber_date",
    },
    { key: "lead", label: "Lead", dateField: "hs_lifecyclestage_lead_date" },
    {
      key: "marketingqualifiedlead",
      label: "Marketing Qualified Lead",
      dateField: "hs_lifecyclestage_marketingqualifiedlead_date",
    },
    {
      key: "salesqualifiedlead",
      label: "Sales Qualified Lead",
      dateField: "hs_lifecyclestage_salesqualifiedlead_date",
    },
    {
      key: "opportunity",
      label: "Opportunity",
      dateField: "hs_lifecyclestage_opportunity_date",
    },
    {
      key: "customer",
      label: "Customer",
      dateField: "hs_lifecyclestage_customer_date",
    },
    {
      key: "evangelist",
      label: "Evangelist",
      dateField: "hs_lifecyclestage_evangelist_date",
    },
    { key: "other", label: "Other", dateField: "hs_lifecyclestage_other_date" },
  ];

  // Current counts by lifecycle stage
  const currentCounts: Record<string, number> = {};
  for (const stage of lifecycleStages) {
    currentCounts[stage.label] = 0;
  }

  // Quarterly "became X" counts
  const quarterlyBecame: Record<
    string,
    { Q1: number; Q2: number; Q3: number; Q4: number; total: number }
  > = {};
  for (const stage of lifecycleStages) {
    quarterlyBecame[stage.label] = { Q1: 0, Q2: 0, Q3: 0, Q4: 0, total: 0 };
  }

  const getQuarter = (
    dateValue: string | number,
  ): "Q1" | "Q2" | "Q3" | "Q4" | null => {
    // If the value is a string, check if it's a numeric string (timestamp)
    let finalDate: Date;
    if (typeof dateValue === "string") {
      if (/^\d+$/.test(dateValue)) {
        finalDate = new Date(parseInt(dateValue));
      } else {
        finalDate = new Date(dateValue);
      }
    } else {
      finalDate = new Date(dateValue);
    }

    if (isNaN(finalDate.getTime())) return null;
    // HubSpot timestamps are typically in UTC
    if (finalDate.getUTCFullYear() !== year) return null;
    const utcMonth = finalDate.getUTCMonth();
    if (utcMonth < 3) return "Q1";
    if (utcMonth < 6) return "Q2";
    if (utcMonth < 9) return "Q3";
    return "Q4";
  };

  // First try: Check if lifecycle date properties are available
  let usedLifecycleDates = false;
  let contactsWithDates = 0;

  for (const contact of contacts) {
    const currentStage = contact.properties.lifecyclestage;

    // Count current stage
    const stageInfo = lifecycleStages.find((s) => s.key === currentStage);
    if (stageInfo) {
      currentCounts[stageInfo.label]++;
    }

    // Try to count "became X" dates per quarter using lifecycle date properties
    for (const stage of lifecycleStages) {
      const becameValue =
        contact.properties[stage.dateField as keyof typeof contact.properties];

      // HubSpot sometimes returns empty strings, null, or "0" for dates that haven't occurred
      if (!becameValue || becameValue === "0" || becameValue === "") continue;

      usedLifecycleDates = true;
      contactsWithDates++;
      const quarter = getQuarter(becameValue as string | number);
      if (quarter) {
        quarterlyBecame[stage.label][quarter]++;
        quarterlyBecame[stage.label].total++;
      }
    }
  }

  console.log(
    `[Lifecycle Debug] Contacts with lifecycle date properties: ${contactsWithDates}`,
  );
  console.log(`[Lifecycle Debug] Year filter: ${year}`);

  // Fallback: If no lifecycle date properties were found, use createdate as approximation
  // This counts contacts who are currently in each stage, grouped by when they were created
  if (!usedLifecycleDates) {
    console.log(
      `[Lifecycle Debug] No lifecycle date properties found. Using createdate as fallback.`,
    );

    // Reset quarterly counts
    for (const stage of lifecycleStages) {
      quarterlyBecame[stage.label] = { Q1: 0, Q2: 0, Q3: 0, Q4: 0, total: 0 };
    }

    for (const contact of contacts) {
      const currentStage = contact.properties.lifecyclestage;
      const createDate = contact.properties.createdate;

      if (!currentStage || !createDate) continue;

      const stageInfo = lifecycleStages.find((s) => s.key === currentStage);
      if (!stageInfo) continue;

      const quarter = getQuarter(createDate);
      if (quarter) {
        quarterlyBecame[stageInfo.label][quarter]++;
        quarterlyBecame[stageInfo.label].total++;
      }
    }

    console.log(
      `[Lifecycle Debug] Using createdate fallback - QuarterlyBecame result:`,
      JSON.stringify(quarterlyBecame, null, 2),
    );
  } else {
    console.log(
      `[Lifecycle Debug] QuarterlyBecame result:`,
      JSON.stringify(quarterlyBecame, null, 2),
    );
  }

  return { currentCounts, quarterlyBecame };
}

// Comprehensive data fetch for analysis (with full pagination)
export async function getComprehensiveData(
  apiKey: string,
  maxRecords = PAGINATION_CONFIG.maxRecords,
  year: number = new Date().getFullYear(),
  pipelineFilter: string[] = [],
) {
  console.log(
    `Starting comprehensive data fetch with pagination for year ${year}...`,
  );

  const [
    deals,
    contacts,
    companies,
    ownerMap,
    stageMap,
    contactsQuarterly,
    websiteSessionsData,
    lifecycleData,
  ] = await Promise.all([
    getDeals(apiKey, maxRecords).catch((e) => {
      console.error("Deals fetch error:", e.body?.message || e.message);
      return [];
    }),
    getContacts(apiKey, maxRecords).catch((e) => {
      console.error("Contacts fetch error:", e.body?.message || e.message);
      return [];
    }),
    getCompanies(apiKey, maxRecords).catch((e) => {
      console.error("Companies fetch error:", e.body?.message || e.message);
      return [];
    }),
    getOwners(apiKey),
    getPipelineStages(apiKey),
    getContactsQuarterly(apiKey, year).catch((e) => {
      console.error(
        `${year} contacts fetch error:`,
        e.body?.message || e.message,
      );
      return { Q1: 0, Q2: 0, Q3: 0, Q4: 0, total: 0 };
    }),
    // Website sessions tracking removed for now
    Promise.resolve({ Q1: 0, Q2: 0, Q3: 0, Q4: 0, total: 0 }),
    getLifecycleStageBreakdown(apiKey, year).catch((e) => {
      console.error(
        "Lifecycle data fetch error:",
        e.body?.message || e.message,
      );
      return { currentCounts: {}, quarterlyBecame: {} };
    }),
  ]);

  console.log(
    `Comprehensive fetch complete: ${deals.length} deals, ${contacts.length} contacts, ${companies.length} companies, ${contactsQuarterly.total} contacts in ${year}`,
  );

  // Enrich deals with owner names and stage labels
  const enrichedDeals = deals.map((deal) => {
    const ownerId = deal.properties.hubspot_owner_id;
    const stageId = deal.properties.dealstage;
    const stageInfo = stageId ? stageMap.get(stageId) : null;

    return {
      id: deal.id,
      name: deal.properties.dealname || "Unnamed Deal",
      amount: parseFloat(deal.properties.amount || "0"),
      stage: stageInfo?.label || deal.properties.dealstage || "Unknown",
      stageProbability: stageInfo?.probability || 0,
      pipeline: deal.properties.pipeline || "default",
      owner: ownerId ? ownerMap.get(ownerId) || "Unknown" : "Unassigned",
      ownerId: ownerId || null,
      closeDate: deal.properties.closedate,
      createDate: deal.properties.createdate,
      lastModified: deal.properties.hs_lastmodifieddate,
    };
  });

  // Enrich contacts with owner names
  const enrichedContacts = contacts.map((contact) => {
    const ownerId = contact.properties.hubspot_owner_id;

    return {
      id: contact.id,
      firstName: contact.properties.firstname || "",
      lastName: contact.properties.lastname || "",
      fullName:
        [contact.properties.firstname, contact.properties.lastname]
          .filter(Boolean)
          .join(" ") || "Unknown",
      email: contact.properties.email || "",
      company: contact.properties.company || "",
      phone: contact.properties.phone || "",
      owner: ownerId ? ownerMap.get(ownerId) || "Unknown" : "Unassigned",
      lifecycleStage: contact.properties.lifecyclestage || "",
      lifecycleHistory: {
        subscriber:
          contact.properties.hs_lifecyclestage_subscriber_date || null,
        lead: contact.properties.hs_lifecyclestage_lead_date || null,
        mql:
          contact.properties.hs_lifecyclestage_marketingqualifiedlead_date ||
          null,
        sql:
          contact.properties.hs_lifecyclestage_salesqualifiedlead_date || null,
        opportunity:
          contact.properties.hs_lifecyclestage_opportunity_date || null,
        customer: contact.properties.hs_lifecyclestage_customer_date || null,
        evangelist:
          contact.properties.hs_lifecyclestage_evangelist_date || null,
        other: contact.properties.hs_lifecyclestage_other_date || null,
      },
      leadStatus: contact.properties.hs_lead_status || "",
      jobTitle: contact.properties.jobtitle || "",
      createDate: contact.properties.createdate,
      lastModified: contact.properties.lastmodifieddate,
      conversionEvents: parseInt(
        contact.properties.num_conversion_events || "0",
      ),
      firstConversion: contact.properties.first_conversion_event_name || "",
      recentConversion: contact.properties.recent_conversion_event_name || "",
    };
  });

  // Enrich companies
  const enrichedCompanies = companies.map((company) => ({
    id: company.id,
    name: company.properties.name || "Unknown",
    domain: company.properties.domain || "",
    industry: company.properties.industry || "",
    employees: parseInt(company.properties.numberofemployees || "0"),
    revenue: parseFloat(company.properties.annualrevenue || "0"),
    createDate: company.properties.createdate,
    lifecycleStage: company.properties.lifecyclestage || "",
  }));

  // Build owner summary
  const ownerSummary: Record<string, { deals: number; totalValue: number }> =
    {};
  for (const deal of enrichedDeals) {
    const owner = deal.owner;
    if (!ownerSummary[owner]) {
      ownerSummary[owner] = { deals: 0, totalValue: 0 };
    }
    ownerSummary[owner].deals++;
    ownerSummary[owner].totalValue += deal.amount;
  }

  // Build stage summary
  const stageSummary: Record<string, { count: number; totalValue: number }> =
    {};
  for (const deal of enrichedDeals) {
    const stage = deal.stage;
    if (!stageSummary[stage]) {
      stageSummary[stage] = { count: 0, totalValue: 0 };
    }
    stageSummary[stage].count++;
    stageSummary[stage].totalValue += deal.amount;
  }

  // Calculate quarterly breakdowns for the specified year
  const getQuarter = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (date.getFullYear() !== year) return null;
    const month = date.getMonth();
    if (month < 3) return "Q1";
    if (month < 6) return "Q2";
    if (month < 9) return "Q3";
    return "Q4";
  };

  // Use quarterly contacts from search API (accurate server-side filtering)
  const contactsByQuarter = {
    Q1: contactsQuarterly.Q1,
    Q2: contactsQuarterly.Q2,
    Q3: contactsQuarterly.Q3,
    Q4: contactsQuarterly.Q4,
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

  // New deals by quarter with pipeline filtering
  const newDealsByQuarter = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
  const newDealValueByQuarter = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
  for (const deal of enrichedDeals) {
    // Apply pipeline filter if specified
    if (pipelineFilter.length > 0 && !pipelineFilter.includes(deal.pipeline)) {
      continue;
    }
    const q = getQuarter(deal.createDate);
    if (q) {
      newDealsByQuarter[q]++;
      newDealValueByQuarter[q] += deal.amount;
    }
  }

  // Closed deals by quarter (deals that are "Won" or "Closed Won" stage)
  const closedDealsByQuarter = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
  const closedDealValueByQuarter = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
  for (const deal of enrichedDeals) {
    const stage = deal.stage?.toLowerCase() || "";
    // Match "won", "closed won", or any stage containing "won" but not "lost"
    if (stage.includes("won") && !stage.includes("lost")) {
      const q = getQuarter(deal.closeDate || deal.createDate);
      if (q) {
        closedDealsByQuarter[q]++;
        closedDealValueByQuarter[q] += deal.amount;
      }
    }
  }

  // Companies by quarter
  const companiesByQuarter = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
  for (const company of enrichedCompanies) {
    const q = getQuarter(company.createDate);
    if (q) companiesByQuarter[q]++;
  }

  // Calculate lifecycle stage summary
  const lifecycleSummary: Record<string, number> = {};
  for (const contact of enrichedContacts) {
    const stage = contact.lifecycleStage || "Unknown";
    lifecycleSummary[stage] = (lifecycleSummary[stage] || 0) + 1;
  }

  // Extract MQL and SQL quarterly data from lifecycle data
  const mqlQuarterly: {
    Q1: number;
    Q2: number;
    Q3: number;
    Q4: number;
    total: number;
  } = {
    Q1: await getMQLsEnteredInQuarter(apiKey, year, "Q1"),
    Q2: await getMQLsEnteredInQuarter(apiKey, year, "Q2"),
    Q3: await getMQLsEnteredInQuarter(apiKey, year, "Q3"),
    Q4: await getMQLsEnteredInQuarter(apiKey, year, "Q4"),
    total: 0,
  };

  mqlQuarterly["total"] =
    mqlQuarterly.Q1 + mqlQuarterly.Q2 + mqlQuarterly.Q3 + mqlQuarterly.Q4;

  const sqlQuarterly: {
    Q1: number;
    Q2: number;
    Q3: number;
    Q4: number;
    total: number;
  } = {
    Q1: await getSQLsEnteredInQuarter(apiKey, year, "Q1"),
    Q2: await getSQLsEnteredInQuarter(apiKey, year, "Q2"),
    Q3: await getSQLsEnteredInQuarter(apiKey, year, "Q3"),
    Q4: await getSQLsEnteredInQuarter(apiKey, year, "Q4"),
    total: 0,
  };

  sqlQuarterly["total"] =
    sqlQuarterly.Q1 + sqlQuarterly.Q2 + sqlQuarterly.Q3 + sqlQuarterly.Q4;

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
      byLifecycle: lifecycleSummary,
      owners: Array.from(ownerMap.entries()).map(([id, name]) => ({
        id,
        name,
      })),
      quarterly: {
        year: year,
        contacts: contactsByQuarter,
        deals: dealsByQuarter,
        dealValue: dealValueByQuarter,
        companies: companiesByQuarter,
        newDeals: newDealsByQuarter,
        newDealValue: newDealValueByQuarter,
        closedDeals: closedDealsByQuarter,
        closedDealValue: closedDealValueByQuarter,
        mql: mqlQuarterly,
        sql: sqlQuarterly,
      },
      lifecycleData,
    },
  };
}

// Fetch marketing emails from HubSpot
export async function getMarketingEmails(
  apiKey: string,
  limit: number = 100,
): Promise<
  {
    id: string;
    name: string;
    subject: string;
    previewText: string;
    state: string;
    createdAt: string;
    webversionUrl?: string | null;
  }[]
> {
  const client = createHubSpotClient(apiKey);
  const emails: {
    id: string;
    name: string;
    subject: string;
    previewText: string;
    state: string;
    createdAt: string;
    webversionUrl?: string | null;
  }[] = [];

  try {
    let after: string | undefined;
    let fetched = 0;

    do {
      const httpResponse: any = await client.apiRequest({
        method: "GET",
        path: "/marketing/v3/emails",
        qs: {
          limit: Math.min(100, limit - fetched),
          ...(after ? { after } : {}),
        },
      });

      const response = await httpResponse.json();
      const results = response?.results || [];

      for (const email of results) {
        emails.push({
          id: email.id,
          name: email.name || "Unnamed Email",
          subject: email.subject || "",
          previewText: email.previewText || "",
          state: email.state || "DRAFT",
          createdAt: email.createdAt || "",
          webversionUrl:
            email.publishedUrl || email.url || email.webversion?.url || null,
        });
      }

      fetched += results.length;
      after = response?.paging?.next?.after;
    } while (after && fetched < limit);

    console.log(`Fetched ${emails.length} marketing emails`);
    emails.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  } catch (error: any) {
    console.error(
      "Error fetching marketing emails:",
      error.body?.message || error.message,
    );
    throw error;
  }

  return emails;
}

/**
 * Extract HTML body from a HubSpot marketing email API response.
 * Handles both direct HTML emails and drag-and-drop widget-based emails.
 */
function extractEmailHtmlBody(email: any): string {
  const content = email.content;

  if (!content) {
    return "";
  }

  // 1. Prefer direct HTML if present (normal emails)
  if (content.html && typeof content.html === "string" && content.html.trim()) {
    return content.html;
  }

  // Fallback to plaintext wrapped in <pre> if available
  if (
    content.plaintext &&
    typeof content.plaintext === "string" &&
    content.plaintext.trim()
  ) {
    return `<pre>${content.plaintext}</pre>`;
  }

  // 2. Reconstruct HTML from drag-and-drop / system modules
  const flexAreas = content.flexAreas;
  const widgetsById = content.widgets || {};

  if (!flexAreas?.main?.sections || !Array.isArray(flexAreas.main.sections)) {
    // No flex areas, nothing to reconstruct
    return "";
  }

  const htmlBlocks: string[] = [];

  // Walk the layout tree IN ORDER
  for (const section of flexAreas.main.sections) {
    if (!section.columns || !Array.isArray(section.columns)) continue;

    for (const column of section.columns) {
      if (!column.widgets || !Array.isArray(column.widgets)) continue;

      for (const widgetRef of column.widgets) {
        const widgetId = widgetRef.id || widgetRef;
        const widget = widgetsById[widgetId];

        if (!widget) continue;

        // Extract HTML from widget using the defined rules
        const widgetHtml = extractWidgetHtml(widget);
        if (widgetHtml) {
          htmlBlocks.push(widgetHtml);
        }
      }
    }
  }

  if (htmlBlocks.length === 0) {
    return "";
  }

  // Wrap in basic HTML document
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
${htmlBlocks.join("\n")}
</body>
</html>`;
}

/**
 * Extract HTML from a single widget based on its type and properties.
 */
function extractWidgetHtml(widget: any): string | null {
  // Rule 1: widget.body.html exists
  if (widget.body?.html) {
    return widget.body.html;
  }

  // Rule 2: widget.richText.html exists
  if (widget.richText?.html) {
    return widget.richText.html;
  }

  // Rule 3: widget.text exists
  if (widget.text && typeof widget.text === "string") {
    return `<p>${widget.text}</p>`;
  }

  // Rule 4: Image widget
  if (widget.type === "image" && widget.src) {
    const alt = widget.alt || "";
    return `<img src="${widget.src}" alt="${alt}" />`;
  }

  // Rule 5: CTA widget
  if (widget.type === "cta" && widget.link) {
    const text = widget.text || "View";
    return `<a href="${widget.link}">${text}</a>`;
  }

  // Also check for common widget structures
  if (widget.params?.html) {
    return widget.params.html;
  }

  if (widget.params?.text) {
    return `<p>${widget.params.text}</p>`;
  }

  // Check for button widgets
  if (widget.type === "button" || widget.type === "linked_image") {
    const href = widget.params?.href || widget.link || widget.url || "#";
    const text =
      widget.params?.text || widget.text || widget.alt || "Click here";
    const src = widget.params?.src || widget.src;

    if (src) {
      return `<a href="${href}"><img src="${src}" alt="${text}" /></a>`;
    }
    return `<a href="${href}">${text}</a>`;
  }

  // Ignore widget if no HTML can be extracted
  return null;
}

// Fetch full details of a marketing email by ID
export async function getMarketingEmailDetails(
  apiKey: string,
  emailId: string,
): Promise<{
  id: string;
  name: string;
  subject: string;
  previewText: string;
  htmlContent: string;
  plainTextContent: string;
  webversionUrl?: string | null;
  state: string;
  campaignName: string;
  sendDate: string | null;
  createdAt: string;
  updatedAt: string;
}> {
  const client = createHubSpotClient(apiKey);

  try {
    const httpResponse: any = await client.apiRequest({
      method: "GET",
      path: `/marketing/v3/emails/${emailId}`,
    });

    const email = await httpResponse.json();

    // Log the keys to see what's available
    console.log(`[HubSpot Email ${emailId}] API Keys:`, Object.keys(email));
    if (email.content) {
      console.log(
        `[HubSpot Email ${emailId}] Content keys:`,
        Object.keys(email.content),
      );
    }

    // Extract HTML using the comprehensive algorithm
    const extractedHtml = extractEmailHtmlBody(email);

    return {
      id: email.id,
      name: email.name || "Unnamed Email",
      subject: email.subject || "",
      previewText: email.previewText || email.content?.previewText || "",
      htmlContent: extractedHtml,
      plainTextContent:
        email.content?.plainText || email.content?.plaintext || "",
      webversionUrl:
        email.publishedUrl || email.url || email.absoluteUrl || null,
      state: email.state || "DRAFT",
      campaignName:
        email.campaign?.name ||
        email.campaignName ||
        email.campaign?.label ||
        "",
      sendDate: email.publishDate || email.sendDate || null,
      createdAt: email.createdAt || "",
      updatedAt: email.updatedAt || "",
    };
  } catch (error: any) {
    console.error(
      `Error fetching marketing email ${emailId}:`,
      error.body?.message || error.message,
    );
    throw error;
  }
}

export interface LifecycleStageOption {
  label: string;
  value: string;
}

export async function getLifecycleStageOptions(
  apiKey: string,
): Promise<{ label: string; value: string }[]> {
  const client = createHubSpotClient(apiKey);

  const response = await client.crm.properties.coreApi.getByName(
    "contacts",
    "lifecyclestage",
  );

  const options = response.options;

  if (!Array.isArray(options)) {
    return [];
  }

  return options.map((option) => ({
    label: option.label ?? option.value,
    value: option.value,
  }));
}
