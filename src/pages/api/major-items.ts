import type { NextApiRequest, NextApiResponse } from 'next';

const SHEET_ID = process.env.GOOGLE_SHEET_ID ?? '';
const GID = process.env.GOOGLE_SHEET_GID ?? '';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

export interface MajorItemInfo {
  name: string;
  primaryOwner: string;
  secondaryOwner: string;
  status: string;
  comments: string;
}

// Snapshot of Satya's Delivery Plan as of 2026-05-07.
// Used as fallback when the sheet is not publicly accessible.
// Make the sheet viewable to anyone with the link for live updates.
const FALLBACK: Record<string, MajorItemInfo[]> = {
  M1: [
    { comments: '', name: 'Solutions Framework (Full Solution Capability)', primaryOwner: 'Anusha', secondaryOwner: 'Mahipat', status: 'Testing in Progress in QA' },
  ],
  M2: [
    { comments: '', name: 'Samyx Agents (Harness)', primaryOwner: 'Satya', secondaryOwner: 'Mahipat, Bipul, Ravi', status: 'Dev to QA Deployment Blocked' },
    { comments: '', name: 'Self-healing file drop flows (Agentic File handling)', primaryOwner: 'Ravi', secondaryOwner: 'Mahipat', status: 'Dev In Progress' },
    { comments: '', name: 'Manual migration assistant (Assembly)', primaryOwner: 'Ravi', secondaryOwner: '', status: 'Dev In Progress' },
    { comments: '', name: 'Cash & Collections (O2C) Solution templates', primaryOwner: 'Mahipat', secondaryOwner: 'Ravi', status: 'Dev Completed' },
    { comments: '', name: 'Policy Engine', primaryOwner: 'Mahipat', secondaryOwner: '', status: 'Dev Completed' },
    { comments: '', name: 'FX IO - Refactor', primaryOwner: 'Phani', secondaryOwner: 'Manohar', status: 'Dev In Progress' },
    { comments: '', name: 'FX to IBis Library', primaryOwner: 'Phani', secondaryOwner: 'Manohar', status: 'Dev In Progress' },
    { comments: '', name: 'Regression Assurance (superset of BRAT)', primaryOwner: 'Kiran', secondaryOwner: 'Yogesh', status: 'Design in Progress' },
    { comments: '', name: 'Samyx Build Agents (Agent-led implementations)', primaryOwner: 'Satya', secondaryOwner: 'Ravi', status: 'Dev Completed' },
    { comments: '', name: 'R2R Solution (Deloitte)', primaryOwner: 'Mahipat', secondaryOwner: 'Ravi, Anusha', status: 'Design in Progress' },
  ],
  M3: [
    { comments: '', name: 'Samyx Recon - Exception classification', primaryOwner: 'Anusha', secondaryOwner: 'Yogesh, Satya', status: 'Dev In Progress' },
    { comments: '', name: 'Debug Studio - Faster debugging', primaryOwner: 'Bipul', secondaryOwner: '', status: 'Dev In Progress' },
    { comments: '', name: 'Flexible AI ready Reporting Layer', primaryOwner: 'Phani', secondaryOwner: 'Yogesh, Ravi, Satya, Sagar', status: 'Dev In Progress' },
    { comments: '', name: 'Marketplace ITGC Controls and Certification', primaryOwner: 'Kalyan', secondaryOwner: 'Bipul', status: 'Blocked in Dev' },
    { comments: '', name: 'Samyx Narrative - MIS Q&A & drill-down', primaryOwner: 'Phani', secondaryOwner: 'Yogesh, Ravi, Sagar', status: 'Dev In Progress' },
    { comments: '', name: 'Samyx Extract (Extract data from contracts/invoices)', primaryOwner: 'Kiran', secondaryOwner: 'Ravi, Satya', status: 'Dev In Progress' },
  ],
  M4: [
    { comments: '', name: 'SOX Controls and Governance Primitives', primaryOwner: 'Kiran', secondaryOwner: 'Satya, Barnie', status: 'Discovery in Progress' },
    { comments: '', name: 'Evidence / Samyx Evidence (Business Transaction lineage)', primaryOwner: 'Kiran', secondaryOwner: 'Ravi, Satya', status: 'Discovery in Progress' },
    { comments: '', name: 'Samyx Expert (Auto-classify exceptions based on memory)', primaryOwner: 'Kiran', secondaryOwner: 'Mahipat', status: 'Discovery not started yet' },
    { comments: '', name: 'Cloud Marketplace for GCP', primaryOwner: 'Kalyan', secondaryOwner: 'Bipul', status: 'Discovery not started yet' },
  ],
  M5: [
    { comments: '', name: 'Flexible export templates', primaryOwner: 'Phani', secondaryOwner: 'Mahipat', status: 'Discovery not started yet' },
    { comments: '', name: 'P2P solution template', primaryOwner: 'Mahipat', secondaryOwner: '', status: 'Discovery not started yet' },
  ],
  M6: [
    { comments: '', name: 'Map existing Excel workings', primaryOwner: 'Phani', secondaryOwner: 'Mahipat', status: 'Discovery not started yet' },
    { comments: '', name: 'Compliance Certification for AWS', primaryOwner: 'Kalyan', secondaryOwner: '', status: 'Discovery not started yet' },
    { comments: '', name: 'Cloud marketplace AWS', primaryOwner: 'Kalyan', secondaryOwner: 'Bipul', status: 'Discovery not started yet' },
    { comments: '', name: 'Central AI assistant integration', primaryOwner: 'Mahipat', secondaryOwner: 'Ravi', status: 'Discovery not started yet' },
  ],
  M7: [
    { comments: '', name: 'Compliance Certification for Azure', primaryOwner: 'Kalyan', secondaryOwner: 'Bipul', status: 'Discovery not started yet' },
    { comments: '', name: 'Cloud Marketplace for Azure', primaryOwner: 'Kalyan', secondaryOwner: 'Bipul', status: 'Discovery not started yet' },
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
        name: cells[0],                // Column A
        primaryOwner: cells[8] || '',  // Column I
        secondaryOwner: cells[9] || '', // Column J
        status: cells[10] || '',       // Column K
        comments: cells[25] || '',     // Column Z
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
