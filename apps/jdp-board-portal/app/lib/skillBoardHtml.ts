import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { BoardRecord } from './types';

const TEMPLATE_PATH = path.join(process.cwd(), 'public', 'program-kpi-waterfall-board-template.html');

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttribute(value: string) {
  return escapeHtml(value);
}

function replaceFunction(source: string, functionName: string, beforeNextFunction: string, replacement: string) {
  const start = source.indexOf(`function ${functionName}`);
  const end = source.indexOf(`\n  function ${beforeNextFunction}`, start);
  if (start === -1 || end === -1) {
    throw new Error(`Could not replace ${functionName} in skill board template`);
  }
  return `${source.slice(0, start)}${replacement}${source.slice(end)}`;
}

const customerLogos = [
  {
    matches: ({ customerName }: BoardRecord) => customerName.trim().toLowerCase() === 'conga',
    markup: '<img class="customer-logo" src="/conga-logo.png" alt="Conga logo">',
    includesName: true
  },
  {
    matches: ({ id, customerName }: BoardRecord) => id === '3b6ca55b-339f-4f67-8a9d-209bdfbd241c' || customerName.trim().toLowerCase() === 'slb',
    markup: '<img class="customer-logo" src="/slb-logo.svg" alt="SLB logo">',
    includesName: true
  }
];

function customerLogoForBoard(board: BoardRecord) {
  return customerLogos.find(logo => logo.matches(board));
}

function savedCustomerLogo(board: BoardRecord) {
  const url = (board.customerLogoUrl || '').trim();
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return null;
    const alt = (board.customerLogoAlt || `${board.customerName} logo`).trim();
    return {
      markup: `<img class="customer-logo" src="${escapeAttribute(parsed.toString())}" alt="${escapeAttribute(alt)}">`,
      includesName: Boolean(board.customerLogoIncludesName)
    };
  } catch {
    return null;
  }
}

export async function renderSkillBoardHtml(board: BoardRecord, viewerEmail = '') {
  const customerName = escapeHtml(board.customerName);
  const stateEndpoint = `/api/boards/${encodeURIComponent(board.id)}/state`;
  let html = await readFile(TEMPLATE_PATH, 'utf8');
  const customerLogo = customerLogoForBoard(board);
  const savedLogo = savedCustomerLogo(board);
  const logo = savedLogo || customerLogo || {
    markup: '<div class="customer-logo-placeholder" aria-hidden="true"></div>',
    includesName: false
  };
  const customerLogoMarkup = logo.markup;
  const hasCustomerLogo = customerLogoMarkup.includes('class="customer-logo"');
  const customerPlaceholderClass = [
    'customer-placeholder',
    hasCustomerLogo ? 'has-logo' : '',
    logo.includesName ? 'logo-includes-name' : ''
  ].filter(Boolean).join(' ');

  html = html
    .replace('THEME_URL_PLACEHOLDER', 'data:text/css,')
    .replace('SLIDES_DECK_URL_PLACEHOLDER', '')
    .replace('SHEETS_OUTPUT_URL_PLACEHOLDER', '')
    .replace('SHEET_BUILDER_ENDPOINT_URL_PLACEHOLDER', '')
    .replace('BOARD_STATE_ENDPOINT_URL_PLACEHOLDER', stateEndpoint)
    .replace("'BOARD_VIEWER_EMAIL_PLACEHOLDER'", JSON.stringify(viewerEmail.trim().toLowerCase()))
    .replace("'BOARD_OWNER_EMAIL_PLACEHOLDER'", JSON.stringify(board.ownerEmail.trim().toLowerCase()))
    .replace('class="customer-placeholder"', `class="${customerPlaceholderClass}"`)
    .replace('<div class="customer-logo-placeholder" aria-hidden="true"></div>', customerLogoMarkup)
    .replace('<strong>Customer name / logo</strong>', `<strong>${customerName}</strong>`)
    .replace('<span>Folloze Deployment Planning & Program Planner</span>', '<span>Folloze Deployment Planning & Program Planner</span>');

  html = replaceFunction(html, 'remoteSaveState', 'persistState', `function remoteSaveState(snapshot, options = {}) {
    if (!canUseBoardStateEndpoint()) return;
    fetch(boardStateEndpoint, {
      method: options.keepalive ? 'POST' : 'PUT',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      keepalive: Boolean(options.keepalive),
      body: JSON.stringify(snapshot)
    })
      .then(response => {
        if (!response.ok) throw new Error('Remote save failed');
        safeAnalytic('state_remote_save', { text: 'Board state saved to Vercel', area: 'program planner', customerName: snapshot.customerName });
      })
      .catch(error => {
        safeAnalytic('state_remote_save_error', { text: error.message || 'Remote save failed', area: 'program planner' });
      });
  }
`);

  html = replaceFunction(html, 'loadRemoteState', 'customerNameFromHero', `function loadRemoteState() {
    if (!canUseBoardStateEndpoint()) return;
    fetch(boardStateEndpoint, { credentials: 'same-origin' })
      .then(response => response.ok ? response.json() : null)
      .then(response => {
        const remote = response && response.state;
        if (!remote || !Array.isArray(remote.programs)) return;
        applySavedState(remote, 'Vercel private storage');
      })
      .catch(error => {
        safeAnalytic('state_remote_load_error', { text: error.message || 'Shared state load failed', area: 'program planner' });
      });
  }
`);

  return html;
}
