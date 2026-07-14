export type CompanyBrand = {
  name: string;
  domain: string;
  logoUrl: string;
};

type ClearbitCompany = {
  name?: string;
  domain?: string;
};

function normalizeCompany(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function domainRoot(domain: string) {
  return domain.split('.')[0]?.toLowerCase().replace(/[^a-z0-9]+/g, '') || '';
}

function cleanDomain(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
    return parsed.hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return trimmed
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .split('/')[0]
      .split('?')[0]
      .trim()
      .toLowerCase();
  }
}

function displayNameFromDomain(domain: string) {
  const root = domainRoot(domain);
  if (!root) return 'Customer';
  return root
    .split(/[-_]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function isLikelyMatch(query: string, company: ClearbitCompany) {
  const normalizedQuery = normalizeCompany(query);
  const normalizedName = normalizeCompany(company.name || '');
  const normalizedDomain = domainRoot(company.domain || '');
  if (!normalizedQuery || !company.domain) return false;
  return (
    normalizedName === normalizedQuery ||
    normalizedDomain === normalizedQuery ||
    normalizedName.includes(normalizedQuery) ||
    normalizedQuery.includes(normalizedName)
  );
}

function faviconLogoUrl(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=256`;
}

async function suggestCompany(query: string, signal: AbortSignal) {
  const response = await fetch(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(query)}`, {
    headers: { accept: 'application/json' },
    signal
  });
  if (!response.ok) return [];
  return response.json() as Promise<ClearbitCompany[]>;
}

export async function resolveCompanyBrand(customerName: string): Promise<CompanyBrand | null> {
  const query = customerName.trim();
  if (!query) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const response = await fetch(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(query)}`, {
      headers: { accept: 'application/json' },
      signal: controller.signal
    });
    if (!response.ok) return null;
    const companies = await response.json() as ClearbitCompany[];
    const match = companies.find(company => isLikelyMatch(query, company));
    if (!match?.domain) return null;
    return {
      name: match.name || query,
      domain: match.domain,
      logoUrl: faviconLogoUrl(match.domain)
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function resolveCompanyBrandFromWebsite(customerWebsite: string): Promise<CompanyBrand | null> {
  const domain = cleanDomain(customerWebsite);
  if (!domain) return null;

  const fallback = {
    name: displayNameFromDomain(domain),
    domain,
    logoUrl: faviconLogoUrl(domain)
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const queries = Array.from(new Set([domain, domainRoot(domain)].filter(Boolean)));
    for (const query of queries) {
      const companies = await suggestCompany(query, controller.signal);
      const match = companies.find(company => {
        const companyDomain = cleanDomain(company.domain || '');
        return companyDomain === domain || isLikelyMatch(query, company);
      });
      if (match?.domain) {
        const matchedDomain = cleanDomain(match.domain);
        return {
          name: match.name || fallback.name,
          domain: matchedDomain || domain,
          logoUrl: faviconLogoUrl(matchedDomain || domain)
        };
      }
    }
    return fallback;
  } catch {
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}
