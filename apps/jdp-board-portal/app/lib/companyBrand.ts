export type CompanyBrand = {
  name: string;
  domain: string;
  logoUrl: string;
  logoIncludesName?: boolean;
  logoNeedsContrast?: boolean;
};

type ClearbitCompany = {
  name?: string;
  domain?: string;
};

type WebsiteLogo = {
  url: string;
  includesName: boolean;
  needsContrast?: boolean;
};

type WebsiteBrand = {
  name?: string;
  logo?: WebsiteLogo;
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

function websiteUrlFromDomain(domain: string) {
  return `https://${domain}/`;
}

function absolutizeUrl(value: string, baseUrl: string) {
  const clean = decodeHtmlEntities(value).trim();
  if (!clean || clean.startsWith('data:') || clean.startsWith('blob:')) return '';
  try {
    return new URL(clean, baseUrl).toString();
  } catch {
    return '';
  }
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function attributesFromTag(tag: string) {
  const attributes: Record<string, string> = {};
  for (const match of tag.matchAll(/([a-zA-Z_:.-]+)\s*=\s*(['"])(.*?)\2/g)) {
    attributes[match[1].toLowerCase()] = decodeHtmlEntities(match[3]);
  }
  return attributes;
}

function logoIncludesCompanyName(url: string, label = '') {
  const combined = `${url} ${label}`.toLowerCase();
  return /wordmark|logo|brand|tru-logo|horizontal/.test(combined);
}

function logoNeedsContrast(url: string, label = '') {
  const combined = `${url} ${label}`.toLowerCase();
  return /white|light|inverse|reversed|dark/.test(combined);
}

function addLogoCandidate(candidates: WebsiteLogo[], value: string, baseUrl: string, label = '') {
  const url = absolutizeUrl(value, baseUrl);
  if (!url) return;
  const lower = `${url} ${label}`.toLowerCase();
  if (!/logo|brand|wordmark/.test(lower)) return;
  if (!/\.(svg|png|jpe?g|webp)(\?|#|$)/i.test(url)) return;
  candidates.push({
    url,
    includesName: logoIncludesCompanyName(url, label),
    needsContrast: logoNeedsContrast(url, label)
  });
}

function brandFromJsonLd(html: string, baseUrl: string) {
  const candidates: WebsiteLogo[] = [];
  let name = '';
  for (const script of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const payload = JSON.parse(decodeHtmlEntities(script[1].trim()));
      const nodes = Array.isArray(payload?.['@graph']) ? payload['@graph'] : [payload];
      for (const node of nodes) {
        const type = Array.isArray(node?.['@type']) ? node['@type'].join(' ') : String(node?.['@type'] || '');
        if (!name && /organization|corporation|localbusiness|website/i.test(type) && typeof node?.name === 'string') {
          name = node.name.trim();
        }
        const logo = node?.logo;
        if (typeof logo === 'string') addLogoCandidate(candidates, logo, baseUrl, node?.name || '');
        if (typeof logo?.url === 'string') addLogoCandidate(candidates, logo.url, baseUrl, node?.name || '');
      }
    } catch {
      continue;
    }
  }
  return { name, logos: candidates };
}

function logosFromMeta(html: string, baseUrl: string) {
  const candidates: WebsiteLogo[] = [];
  for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = attributesFromTag(tag[0]);
    const key = (attributes.property || attributes.name || attributes.itemprop || '').toLowerCase();
    if (key.includes('logo') && attributes.content) {
      addLogoCandidate(candidates, attributes.content, baseUrl, key);
    }
  }
  return candidates;
}

function logosFromImages(html: string, baseUrl: string) {
  const candidates: WebsiteLogo[] = [];
  for (const tag of html.matchAll(/<img\b[^>]*>/gi)) {
    const attributes = attributesFromTag(tag[0]);
    const label = [attributes.alt, attributes.class, attributes.id, attributes.src].filter(Boolean).join(' ');
    addLogoCandidate(candidates, attributes.src || attributes['data-src'] || '', baseUrl, label);
  }
  return candidates;
}

function websiteBrandCandidates(html: string, baseUrl: string) {
  const jsonLd = brandFromJsonLd(html, baseUrl);
  const candidates = [
    ...jsonLd.logos,
    ...logosFromMeta(html, baseUrl),
    ...logosFromImages(html, baseUrl)
  ];
  const unique = candidates.filter((candidate, index, all) => all.findIndex(item => item.url === candidate.url) === index);
  return {
    name: jsonLd.name || nameFromTitle(html),
    logos: unique
  };
}

function nameFromTitle(html: string) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  if (!title) return '';
  return decodeHtmlEntities(title)
    .replace(/\s+[|–-]\s+.*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function resolveWebsiteBrand(domain: string, signal: AbortSignal): Promise<WebsiteBrand | null> {
  const baseUrl = websiteUrlFromDomain(domain);
  const response = await fetch(baseUrl, {
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'user-agent': 'Mozilla/5.0 (compatible; FollozeBoardLogoResolver/1.0)'
    },
    signal
  });
  if (!response.ok) return null;
  const html = await response.text();
  const brand = websiteBrandCandidates(html, response.url || baseUrl);
  const logo = await firstReachableLogo(brand.logos, signal);
  return { name: brand.name, logo: logo || undefined };
}

async function firstReachableLogo(candidates: WebsiteLogo[], signal: AbortSignal) {
  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate.url, { method: 'HEAD', signal });
      if (response.ok) return candidate;
    } catch {
      continue;
    }
  }
  return null;
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
      logoUrl: faviconLogoUrl(match.domain),
      logoIncludesName: false
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
    logoUrl: faviconLogoUrl(domain),
    logoIncludesName: false
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const websiteBrand = await resolveWebsiteBrand(domain, controller.signal).catch(() => null);
    const queries = Array.from(new Set([domain, domainRoot(domain)].filter(Boolean)));
    for (const query of queries) {
      const companies = await suggestCompany(query, controller.signal);
      const match = companies.find(company => {
        const companyDomain = cleanDomain(company.domain || '');
        return companyDomain === domain;
      });
      if (match?.domain) {
        const matchedDomain = cleanDomain(match.domain);
        return {
          name: websiteBrand?.name || match.name || fallback.name,
          domain,
          logoUrl: websiteBrand?.logo?.url || faviconLogoUrl(domain),
          logoIncludesName: Boolean(websiteBrand?.logo?.includesName),
          logoNeedsContrast: Boolean(websiteBrand?.logo?.needsContrast)
        };
      }
    }
    return websiteBrand?.logo
      ? {
          ...fallback,
          name: websiteBrand.name || fallback.name,
          logoUrl: websiteBrand.logo.url,
          logoIncludesName: websiteBrand.logo.includesName,
          logoNeedsContrast: Boolean(websiteBrand.logo.needsContrast)
        }
      : fallback;
  } catch {
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}
