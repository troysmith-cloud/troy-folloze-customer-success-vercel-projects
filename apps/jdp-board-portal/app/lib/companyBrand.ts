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
