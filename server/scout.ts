import type { Profile, InsertJob } from "../drizzle/schema";

/**
 * Scoutaus-agentti työpaikkojen hakuun
 * 
 * Käyttää Adzuna API:a joka hakee oikeita työpaikkailmoituksia.
 * Tukee Suomea (fi) ja monia muita maita.
 * 
 * https://developer.adzuna.com/
 */

export interface ScoutParams {
  profile: Profile;
  sources?: string[];
  maxResults?: number;
}

export interface ScoutResult {
  jobs: InsertJob[];
  source: string;
  count: number;
}

/**
 * Pääfunktio työpaikkojen scoutaukseen
 */
export async function scoutJobs(params: ScoutParams): Promise<ScoutResult[]> {
  const { profile, sources = ["adzuna"], maxResults = 50 } = params;
  const results: ScoutResult[] = [];

  // Adzuna API (ensisijainen)
  // Hyväksytään myös vanhat source-nimet yhteensopivuuden vuoksi
  if (sources.includes("adzuna") || sources.includes("google") || sources.includes("serper") || 
      sources.includes("tyomarkkinatori") || sources.includes("duunitori") ||
      sources.includes("demo")) {
    try {
      const jobs = await scoutAdzunaJobs(profile, maxResults);
      if (jobs.length > 0) {
        results.push({
          jobs,
          source: "adzuna",
          count: jobs.length,
        });
        console.log(`[Scout] Adzuna found ${jobs.length} jobs`);
      }
    } catch (error) {
      console.error("[Scout] Adzuna error:", error);
    }
  }

  if (results.length === 0) {
    console.warn("[Scout] No jobs found - check ADZUNA_APP_ID and ADZUNA_APP_KEY environment variables");
  }

  return results;
}

/**
 * Adzuna Jobs API
 * https://developer.adzuna.com/
 * 
 * Tarvitsee ADZUNA_APP_ID ja ADZUNA_APP_KEY ympäristömuuttujat
 */
async function scoutAdzunaJobs(profile: Profile, maxResults: number): Promise<InsertJob[]> {
  const jobs: InsertJob[] = [];
  
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  
  if (!appId || !appKey) {
    console.warn("[Scout] ADZUNA_APP_ID or ADZUNA_APP_KEY not set");
    return jobs;
  }

  // Parse profile data
  let preferredTitles: string[] = [];
  let preferredLocations: string[] = [];
  
  try {
    if (profile.preferredJobTitles) preferredTitles = JSON.parse(profile.preferredJobTitles);
    if (profile.preferredLocations) preferredLocations = JSON.parse(profile.preferredLocations);
  } catch (e) {
    console.error("[Scout] Profile parse error:", e);
  }

  const searchTerm = preferredTitles[0] || profile.currentTitle || "software developer";
  const location = preferredLocations[0] || "Helsinki";

  console.log(`[Scout] Searching Adzuna for: "${searchTerm}" in "${location}"`);

  // Adzuna tukee näitä maita: gb, us, au, br, ca, de, fr, in, nl, nz, pl, ru, sg, za
  // Suomi (fi) EI ole suoraan tuettu, joten käytetään 'de' (Saksa) tai haetaan ilman maakoodia
  // TAI käytetään UK/GB ja haetaan "Finland" location-parametrilla
  
  // Kokeillaan ensin Suomi-spesifistä hakua DE-endpointilla (lähin)
  const countries = ['de', 'gb']; // Kokeillaan Saksaa ja UK:ta
  
  for (const country of countries) {
    try {
      const resultsPerPage = Math.min(maxResults, 50);
      const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=${resultsPerPage}&what=${encodeURIComponent(searchTerm)}&where=${encodeURIComponent(location)}&content-type=application/json`;

      console.log(`[Scout] Trying Adzuna ${country.toUpperCase()}...`);

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Scout] Adzuna ${country} error: ${response.status} - ${errorText}`);
        continue;
      }

      const data = await response.json();
      const listings = data.results || [];

      console.log(`[Scout] Adzuna ${country.toUpperCase()} returned ${listings.length} jobs`);

      if (listings.length === 0) continue;

      for (const listing of listings.slice(0, maxResults)) {
        const job: InsertJob = {
          externalId: listing.id ? `adzuna-${listing.id}` : `adzuna-${Date.now()}-${Math.random()}`,
          source: "adzuna",
          title: listing.title || "Työpaikka",
          company: listing.company?.display_name || "Yritys",
          description: listing.description || "",
          location: listing.location?.display_name || location,
          salaryMin: listing.salary_min ? Math.round(listing.salary_min) : undefined,
          salaryMax: listing.salary_max ? Math.round(listing.salary_max) : undefined,
          employmentType: mapContractType(listing.contract_type, listing.contract_time),
          remoteType: "on-site",
          industry: listing.category?.label || "",
          postedAt: listing.created ? new Date(listing.created) : new Date(),
          url: listing.redirect_url || "",
        };
        jobs.push(job);
      }

      // Jos löydettiin tuloksia, ei tarvitse kokeilla muita maita
      if (jobs.length > 0) {
        console.log(`[Scout] Found ${jobs.length} jobs from Adzuna ${country.toUpperCase()}`);
        break;
      }
    } catch (error) {
      console.error(`[Scout] Adzuna ${country} fetch error:`, error);
    }
  }

  // Jos Adzuna ei löytänyt mitään, kokeillaan vielä yleisempää hakua
  if (jobs.length === 0) {
    console.log("[Scout] Trying broader Adzuna search...");
    try {
      // Hae vain hakutermillä ilman lokaatiota
      const url = `https://api.adzuna.com/v1/api/jobs/gb/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=20&what=${encodeURIComponent(searchTerm)}&content-type=application/json`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const listings = data.results || [];

        for (const listing of listings.slice(0, maxResults)) {
          const job: InsertJob = {
            externalId: listing.id ? `adzuna-${listing.id}` : `adzuna-${Date.now()}-${Math.random()}`,
            source: "adzuna",
            title: listing.title || "Työpaikka",
            company: listing.company?.display_name || "Yritys",
            description: listing.description || "",
            location: listing.location?.display_name || "Remote",
            salaryMin: listing.salary_min ? Math.round(listing.salary_min) : undefined,
            salaryMax: listing.salary_max ? Math.round(listing.salary_max) : undefined,
            employmentType: mapContractType(listing.contract_type, listing.contract_time),
            remoteType: "on-site",
            industry: listing.category?.label || "",
            postedAt: listing.created ? new Date(listing.created) : new Date(),
            url: listing.redirect_url || "",
          };
          jobs.push(job);
        }
        console.log(`[Scout] Broader search found ${jobs.length} jobs`);
      }
    } catch (error) {
      console.error("[Scout] Broader Adzuna search error:", error);
    }
  }

  return jobs;
}

function mapContractType(contractType?: string, contractTime?: string): string {
  if (contractTime === "part_time") return "part-time";
  if (contractType === "contract") return "contract";
  if (contractType === "permanent") return "full-time";
  return "full-time";
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
