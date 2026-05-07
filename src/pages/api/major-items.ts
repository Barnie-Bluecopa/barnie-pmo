import type { NextApiRequest, NextApiResponse } from 'next';

const SHEET_ID = process.env.GOOGLE_SHEET_ID ?? '';
const GID = process.env.GOOGLE_SHEET_GID ?? '';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

export interface MajorItemInfo {
  name: string;
  owner: string;
  status: string;
  comments: string;
}

// Snapshot of Satya's Delivery Plan as of 2026-05-05.
// Used as fallback when the sheet is not publicly accessible.
// Make the sheet viewable to anyone with the link for live updates.
const FALLBACK: Record<string, MajorItemInfo[]> = {
  M1: [
    { comments: '', name: 'Samyx Agents (Agent-led implementations)', owner: 'Satya, Mahipat, Bipul, Ravi', status: 'WIP' },
    { comments: '', name: 'Solutions Framework (Full Solution Capability)', owner: 'Anusha, Mahipat', status: 'Done' },
  ],
  M2: [
    { comments: '', name: 'Self-healing file drop flows (Agentic File handling)', owner: 'Ravi, Mahipat', status: 'WIP' },
    { comments: '', name: 'Manual migration assistant (Assembly)', owner: 'Ravi', status: 'Done' },
    { comments: '', name: 'Cash & Collections (O2C) Solution templates', owner: 'Mahipat, Ravi', status: 'WIP' },
    { comments: '', name: 'Policy Engine', owner: 'Mahipat', status: 'Done' },
    { comments: '', name: 'FX IO - Refactor', owner: 'Phani, Manohar', status: 'WIP' },
    { comments: '', name: 'FX to IBis Library', owner: 'Phani, Manohar', status: 'WIP' },
    { comments: '', name: 'Regression Assurance (superset of BRAT)', owner: 'Kiran, Yogesh', status: 'Not started' },
    { comments: '', name: 'Samyx Build Agents (Agent-led implementations)', owner: 'Satya, Ravi', status: 'Done' },
    { comments: '', name: 'R2R Solution (Deloitte)', owner: 'Mahipat, Ravi, Anusha', status: 'WIP' },
  ],
  M3: [
    { comments: '', name: 'Samyx Recon - Exception classification', owner: 'Anusha, Yogesh, Satya', status: 'Not started' },
    { comments: '', name: 'Debug Studio - Faster debugging', owner: 'Bipul', status: 'Not started' },
    { comments: '', name: 'Flexible AI ready Reporting Layer', owner: 'Phani, Yogesh, Ravi, Satya, Sagar', status: 'Not started' },
    { comments: '', name: 'Marketplace ITGC Controls and Certification', owner: 'Kalyan, Bipul', status: '' },
    { comments: '', name: 'Samyx Narrative - MIS Q&A & drill-down', owner: 'Phani, Yogesh, Ravi, Sagar', status: 'Not started' },
    { comments: '', name: 'Samyx Extract (Extract data from contracts/invoices)', owner: 'Kiran, Ravi, Satya', status: 'Not started' },
  ],
  M4: [
    { comments: '', name: 'SOX Controls and Governance Primitives', owner: 'Kiran, Satya, Barnie', status: 'Not started' },
    { comments: '', name: 'Evidence / Samyx Evidence (Business Transaction lineage)', owner: 'Kiran, Ravi, Satya', status: 'Not started' },
    { comments: '', name: 'Samyx Expert (Auto-classify exceptions based on memory)', owner: 'Kiran, Mahipat', status: 'Not started' },
    { comments: '', name: 'Cloud Marketplace for GCP', owner: 'Kalyan, Bipul', status: 'Not started' },
  ],
  M5: [
    { comments: '', name: 'Flexible export templates', owner: 'Phani, Mahipat', status: 'Not started' },
    { comments: '', name: 'P2P solution template', owner: 'Mahipat', status: 'Not started' },
  ],
  M6: [
    { comments: '', name: 'Map existing Excel workings', owner: 'Phani, Mahipat', status: 'TBD' },
    { comments: '', name: 'Compliance Certification for AWS', owner: 'Kalyan', status: 'TBD' },
    { comments: '', name: 'Cloud marketplace AWS', owner: 'Kalyan, Bipul', status: 'TBD' },
    { comments: '', name: 'Central AI assistant integration', owner: 'Mahipat, Ravi', status: 'TBD' },
  ],
  M7: [
    { comments: '', name: 'Compliance Certification for Azure', owner: 'Kalyan, Bipul', status: 'TBD' },
    { comments: '', name: 'Cloud Marketplace for Azure', owner: 'Kalyan, Bipul', status: 'TBD' },
  ],
};

// Full CSV parser — handles quoted fields containing commas AND embedded newlines.
function parseCSV(raw: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '"') {
      if (inQuotes && raw[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      row.push(cell.trim());
      cell = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && raw[i + 1] === '\n') i++;
      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell || row.length > 0) {
    row.push(cell.trim());
    rows.push(row);
  }
  return rows;
}

async function fetchLiveItems(): Promise<Record<string, MajorItemInfo[]> | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(CSV_URL, { signal: controller.signal });
    if (!response.ok) return null;

    const raw = await response.text();
    if (raw.trim().startsWith('<!') || raw.trim().startsWith('<html')) return null;

    const rows = parseCSV(raw);
    const majorItems: Record<string, MajorItemInfo[]> = {};

    // Find header row: Item | Major Release | Release | ...
    let headerIdx = -1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === 'Item' && rows[i][1] === 'Major Release' && rows[i][2] === 'Release') {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx === -1) return null;

    for (let i = headerIdx + 1; i < rows.length; i++) {
      const cells = rows[i];
      if (!cells[0]) continue;
      const major = cells[2]; // Column C: M1, M2 ...
      if (!major || !/^M\d+$/.test(major)) continue;
      if (!majorItems[major]) majorItems[major] = [];
      majorItems[major].push({
        name: cells[0],          // Column A
        owner: cells[8] || '',   // Column I
        status: cells[9] || '',  // Column J
        comments: cells[24] || '', // Column Y
      });
    }
    return majorItems;
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const live = await fetchLiveItems().catch(() => null);
  const items = live ?? FALLBACK;
  const source = live ? 'live' : 'fallback';
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ items, source });
}
