"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

type Role = "Admin" | "Developer" | "Stock Controller" | "Stockkeeper" | "Site Team" | "QS" | "PM" | "Management";
type View =
  | "Dashboard"
  | "Item Master"
  | "BOM Control"
  | "Current Stock"
  | "Stock Count"
  | "Stock In"
  | "Stock Out"
  | "Site Transfer"
  | "Equipment"
  | "Transactions"
  | "Audit Report"
  | "Reports"
  | "Backup & Recovery"
  | "Help & SOP"
  | "Alerts"
  | "Supplier"
  | "Project/Site"
  | "User Access";
type Item = {
  code: string;
  name: string;
  khmer: string;
  unit: string;
  type: string;
  category: string;
  min: number;
  status?: "Active" | "Inactive";
  supplierIds?: string[];
};
type Tx = {
  id: string;
  date: string;
  type: string;
  site: string;
  other: string;
  code: string;
  qty: number;
  by: string;
  status: string;
  costCode?: string;
  reference?: string;
  person?: string;
  timestamp?: string;
  previousQty?: number;
  newQty?: number;
  reason?: string;
  supplierId?: string;
  linkedTransactionId?: string;
  approvedBy?: string;
  evidenceName?: string;
  evidenceType?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  verificationNote?: string;
  verificationRole?: Role;
};
type Stock = Record<string, Record<string, number>>;
type Equipment = {
  id: string;
  code: string;
  item: string;
  site: string;
  borrower: string;
  qty: number;
  expected: string;
  status: string;
  partialReturn?: boolean;
  checkoutDate?: string;
  checkoutTime?: string;
  conditionOut?: string;
  conditionReturn?: string;
  actualReturn?: string;
  returnTime?: string;
  issuedBy?: string;
  incidentNote?: string;
  repairStatus?: string;
  repairStartedAt?: string;
  repairCompletedAt?: string;
  scrapReason?: string;
  scrappedAt?: string;
};
type BomLine = {
  id: string;
  site: string;
  costCode: string;
  code: string;
  originalQty: number;
  approvedQty: number;
  rate: number;
  approvedBy: string;
};
type StockAdjustment = {
  id: string;
  site: string;
  code: string;
  previousQty: number;
  requestedQty: number;
  reference: string;
  reason: string;
  requestedBy: string;
  requestedAt: string;
  status: "Pending" | "Approved" | "Rejected";
  decidedBy?: string;
  decidedAt?: string;
  decisionNote?: string;
};
type SystemAudit = {
  id: string;
  occurredAt: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  fromRevision: number;
  toRevision: number;
  summary: string;
};
type ProjectSite = {
  code: string;
  name: string;
  location: string;
  manager: string;
  startDate: string;
  status: "Active" | "Closed";
};
type CostCodeLevel2 = { code: string; name: string; description: string };
type CostCodeLevel3 = {
  code: string;
  parent: string;
  name: string;
  description: string;
  categories: string[];
};
type CostCodeLink = { costCode: string; itemCode: string };
type Supplier = {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  taxId: string;
  status: "Active" | "Inactive";
};
type StockCountSession = {
  id: string;
  site: string;
  createdAt: string;
  createdBy: string;
  status: "Draft" | "Pending Recount" | "Recount" | "Pending" | "Approved" | "Rejected";
  lines: Array<{ code: string; systemQty: number; physicalQty: number | null; recountQty?: number | null }>;
  submittedAt?: string;
  decidedAt?: string;
  decidedBy?: string;
  decisionNote?: string;
};

type InventoryState = {
  items: Item[];
  stock: Stock;
  transactions: Tx[];
  equipment: Equipment[];
  bom: BomLine[];
  adjustments: StockAdjustment[];
  sites: ProjectSite[];
  costCodeLinks: CostCodeLink[];
  suppliers: Supplier[];
  stockCounts: StockCountSession[];
};
type ApiError = { error?: string };

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

const initialSites: ProjectSite[] = [
  {
    code: "VLS",
    name: "Villa Site",
    location: "",
    manager: "",
    startDate: "",
    status: "Active",
  },
  {
    code: "SSP",
    name: "SSP Project",
    location: "",
    manager: "",
    startDate: "",
    status: "Active",
  },
  {
    code: "FPF",
    name: "FPF Project",
    location: "",
    manager: "",
    startDate: "",
    status: "Active",
  },
  {
    code: "WH",
    name: "Main Warehouse",
    location: "",
    manager: "",
    startDate: "",
    status: "Active",
  },
];
let sites = initialSites.map((site) => site.code);
const initialItems: Item[] = [
  {
    code: "MA-AG-001",
    name: "River Sand #1",
    khmer: "ខ្សាច់ទន្លេ លេខ1",
    unit: "m³",
    type: "Material",
    category: "Aggregate",
    min: 8,
  },
  {
    code: "MA-AG-003",
    name: "Stream Sand #1",
    khmer: "ខ្សាច់ស្ទឹង លេខ1",
    unit: "m³",
    type: "Material",
    category: "Aggregate",
    min: 6,
  },
  {
    code: "MA-CE-001",
    name: "Portland Cement",
    khmer: "ស៊ីម៉ងត៍ផតឡែន",
    unit: "Bag",
    type: "Material",
    category: "Cement",
    min: 50,
  },
  {
    code: "MA-RB-012",
    name: "Rebar SD390 DB12",
    khmer: "ដែកសរសៃ DB12",
    unit: "Ton",
    type: "Material",
    category: "Reinforcement",
    min: 2,
  },
  {
    code: "MA-BR-001",
    name: "Hollow Brick",
    khmer: "ឥដ្ឋប្រហោង",
    unit: "PCS",
    type: "Material",
    category: "Brick",
    min: 500,
  },
  {
    code: "ST-PT-004",
    name: "Electric Drill",
    khmer: "ម៉ូទ័រស្វាន",
    unit: "PCS",
    type: "Small Tools",
    category: "Power Tool",
    min: 2,
  },
  {
    code: "EQ-EQ-002",
    name: "Air Compressor (Small)",
    khmer: "ម៉ាស៊ីនខ្យល់ តូច",
    unit: "PCS",
    type: "Equipment",
    category: "Equipment",
    min: 1,
  },
];
let items: Item[] = initialItems.map((i) => ({ ...i, status: "Active" }));
const initialStock: Stock = {
  VLS: {
    "MA-AG-001": 20,
    "MA-AG-003": 0,
    "MA-CE-001": 120,
    "MA-RB-012": 3.5,
    "MA-BR-001": 800,
    "ST-PT-004": 4,
    "EQ-EQ-002": 1,
  },
  SSP: {
    "MA-AG-001": 5,
    "MA-AG-003": 5,
    "MA-CE-001": 42,
    "MA-RB-012": 1.2,
    "MA-BR-001": 350,
    "ST-PT-004": 2,
    "EQ-EQ-002": 1,
  },
  FPF: {
    "MA-AG-001": 12,
    "MA-AG-003": 0,
    "MA-CE-001": 75,
    "MA-RB-012": 2.4,
    "MA-BR-001": 1000,
    "ST-PT-004": 3,
    "EQ-EQ-002": 0,
  },
  WH: {
    "MA-AG-001": 0,
    "MA-AG-003": 0,
    "MA-CE-001": 200,
    "MA-RB-012": 5,
    "MA-BR-001": 0,
    "ST-PT-004": 6,
    "EQ-EQ-002": 2,
  },
};
const initialBom: BomLine[] = [
  {
    id: "bom-1",
    site: "VLS",
    costCode: "A02-04",
    code: "MA-AG-001",
    originalQty: 20,
    approvedQty: 15,
    rate: 15,
    approvedBy: "QS Manager",
  },
  {
    id: "bom-2",
    site: "VLS",
    costCode: "A06-06",
    code: "MA-AG-001",
    originalQty: 5,
    approvedQty: 5,
    rate: 15,
    approvedBy: "QS Manager",
  },
];
const costCodeLevel2: CostCodeLevel2[] = [
  {
    code: "A01",
    name: "Preliminaries",
    description: "Temporary works, mobilization and general site requirements.",
  },
  {
    code: "A02",
    name: "Structural Works",
    description:
      "Foundation, reinforced concrete and primary structural construction.",
  },
  {
    code: "A06",
    name: "Architectural Works",
    description:
      "Masonry, finishes, doors, ceilings and architectural completion.",
  },
  {
    code: "M01",
    name: "MEP Works",
    description:
      "Mechanical, electrical, plumbing and fire-protection installations.",
  },
];
const costCodeLevel3: CostCodeLevel3[] = [
  {
    code: "A01-01",
    parent: "A01",
    name: "Site Establishment",
    description: "Temporary facilities, access and mobilization materials.",
    categories: [],
  },
  {
    code: "A02-04",
    parent: "A02",
    name: "Concrete & Reinforcement",
    description:
      "Concrete ingredients, reinforcement and structural accessories.",
    categories: ["Aggregate", "Cement", "Reinforcement"],
  },
  {
    code: "A02-05",
    parent: "A02",
    name: "Formwork",
    description: "Formwork panels, timber, supports and related accessories.",
    categories: ["Formwork", "Accessories"],
  },
  {
    code: "A06-06",
    parent: "A06",
    name: "Masonry & Plastering",
    description: "Brick, block, cement and plastering materials.",
    categories: ["Brick", "Cement"],
  },
  {
    code: "A06-08",
    parent: "A06",
    name: "Finishing Works",
    description: "Paint, ceiling, gypsum and final architectural finishes.",
    categories: ["Finishing", "Paint", "Ceiling", "Gypsum"],
  },
  {
    code: "M01-01",
    parent: "M01",
    name: "MEP Installation",
    description: "Approved MEP materials and installation accessories.",
    categories: ["MEP", "Electrical", "Plumbing", "Fire Fighting"],
  },
];
const initialCostCodeLinks: CostCodeLink[] = [
  { costCode: "A02-04", itemCode: "MA-AG-001" },
  { costCode: "A02-04", itemCode: "MA-AG-003" },
  { costCode: "A02-04", itemCode: "MA-CE-001" },
  { costCode: "A02-04", itemCode: "MA-RB-012" },
  { costCode: "A06-06", itemCode: "MA-AG-001" },
  { costCode: "A06-06", itemCode: "MA-AG-003" },
  { costCode: "A06-06", itemCode: "MA-CE-001" },
  { costCode: "A06-06", itemCode: "MA-BR-001" },
];
const initialSuppliers: Supplier[] = [
  {
    id: "SUP-001",
    name: "General Construction Supplier",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
    taxId: "",
    status: "Active",
  },
];
const itemCategories = [
  "Aggregate",
  "Brick",
  "Cement",
  "Reinforcement",
  "Structural Steel",
  "Formwork",
  "Waterproofing",
  "Paint",
  "Ceiling",
  "Gypsum",
  "Door",
  "Window",
  "Hardware",
  "Finishing",
  "Sanitary",
  "Accessories",
  "Power Tool",
  "Equipment",
  "MEP",
];
const itemUoms = [
  "PCS",
  "Set",
  "Bag",
  "kg",
  "Ton",
  "m",
  "m²",
  "m³",
  "L",
  "Roll",
  "Box",
  "Pair",
  "Sheet",
];
const code39Patterns: Record<string, string> = {
  "0": "101001101101",
  "1": "110100101011",
  "2": "101100101011",
  "3": "110110010101",
  "4": "101001101011",
  "5": "110100110101",
  "6": "101100110101",
  "7": "101001011011",
  "8": "110100101101",
  "9": "101100101101",
  A: "110101001011",
  B: "101101001011",
  C: "110110100101",
  D: "101011001011",
  E: "110101100101",
  F: "101101100101",
  G: "101010011011",
  H: "110101001101",
  I: "101101001101",
  J: "101011001101",
  K: "110101010011",
  L: "101101010011",
  M: "110110101001",
  N: "101011010011",
  O: "110101101001",
  P: "101101101001",
  Q: "101010110011",
  R: "110101011001",
  S: "101101011001",
  T: "101011011001",
  U: "110010101011",
  V: "100110101011",
  W: "110011010101",
  X: "100101101011",
  Y: "110010110101",
  Z: "100110110101",
  "-": "100101011011",
  ".": "110010101101",
  " ": "100110101101",
  "*": "100101101101",
};
const fullSystemViews: View[] = [
    "Dashboard",
    "Item Master",
    "BOM Control",
    "Current Stock",
    "Stock Count",
    "Stock In",
    "Stock Out",
    "Site Transfer",
    "Equipment",
    "Transactions",
    "Audit Report",
    "Reports",
    "Backup & Recovery",
    "Alerts",
    "Supplier",
    "Project/Site",
    "User Access",
    "Help & SOP",
  ];
const roleViews: Record<Role, View[]> = {
  Developer: fullSystemViews,
  Admin: [
    "Dashboard",
    "Item Master",
    "Current Stock",
    "Stock Count",
    "Transactions",
    "Audit Report",
    "Reports",
    "Backup & Recovery",
    "Alerts",
    "Supplier",
    "Project/Site",
    "Help & SOP",
  ],
  "Stock Controller": [
    "Dashboard",
    "BOM Control",
    "Current Stock",
    "Stock Count",
    "Stock In",
    "Stock Out",
    "Site Transfer",
    "Equipment",
    "Transactions",
    "Reports",
    "Alerts",
    "Supplier",
    "Help & SOP",
  ],
  Stockkeeper: [
    "Dashboard",
    "Current Stock",
    "Stock Count",
    "Stock In",
    "Site Transfer",
    "Equipment",
    "Transactions",
    "Alerts",
    "Help & SOP",
  ],
  "Site Team": [
    "Dashboard",
    "Current Stock",
    "Transactions",
    "Alerts",
    "Help & SOP",
  ],
  QS: [
    "Dashboard",
    "BOM Control",
    "Current Stock",
    "Transactions",
    "Reports",
    "Alerts",
    "Help & SOP",
  ],
  PM: [
    "Dashboard",
    "BOM Control",
    "Current Stock",
    "Stock Count",
    "Transactions",
    "Reports",
    "Alerts",
    "Help & SOP",
  ],
  Management: [
    "Dashboard",
    "BOM Control",
    "Current Stock",
    "Stock Count",
    "Transactions",
    "Audit Report",
    "Reports",
    "Backup & Recovery",
    "Alerts",
    "Supplier",
    "Project/Site",
    "Help & SOP",
  ],
};
const operationViews: View[] = [
  "Stock In",
  "Stock Out",
  "Site Transfer",
  "Equipment",
];
function itemName(code: string) {
  const i = items.find((x) => x.code === code);
  return i ? `${i.name} | ${i.khmer}` : code;
}
function nowDate() {
  return new Date().toISOString().slice(0, 10);
}
function nowTime() {
  return new Date().toTimeString().slice(0, 5);
}
function formatQty(n: number) {
  return Number.isInteger(n)
    ? n.toLocaleString()
    : n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
function uid() {
  return crypto.randomUUID();
}

function reservedTransferQty(transactions: Tx[], site: string, code: string) {
  return transactions
    .filter((transaction) => transaction.type === "SITE TRANSFER" && transaction.site === site && transaction.code === code && transaction.status === "Approved / Reserved")
    .reduce((sum, transaction) => sum + Math.max(0, transaction.qty), 0);
}

function csvEscape(value: string | number) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
async function uploadTransactionEvidence(transactionId: string, file: File | null, site: string) {
  if (!file) return;
  const response = await fetch(`/api/transaction-evidence?id=${encodeURIComponent(transactionId)}`, { method: "PUT", headers: { "Content-Type": file.type, "X-File-Name": file.name, "X-MCB-Site": site }, body: file });
  const result = await readJson<ApiError>(response).catch((): ApiError => ({}));
  if (!response.ok) throw new Error(result.error || "Unable to upload transaction evidence");
}
async function downloadXlsx(filename: string, sheets: Array<{ name: string; rows: Array<Array<string | number>> }>) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  sheets.forEach(({ name, rows }) => {
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const columnCount = Math.max(...rows.map((row) => row.length), 1);
    worksheet["!cols"] = Array.from({ length: columnCount }, (_, column) => ({ wch: Math.min(42, Math.max(12, ...rows.map((row) => String(row[column] ?? "").length + 2))) }));
    if (rows.length && rows[0].length) worksheet["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length - 1, c: rows[0].length - 1 } }) };
    XLSX.utils.book_append_sheet(workbook, worksheet, name.replace(/[\\/?*\[\]:]/g, " ").slice(0, 31));
  });
  XLSX.writeFile(workbook, filename, { compression: true });
}
function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

async function optimizeItemPhoto(file: File) {
  if (!file.type.startsWith("image/"))
    throw new Error("Select a JPG, PNG or WebP image");
  if (file.size > 5 * 1024 * 1024)
    throw new Error("Photo must be 5 MB or smaller");
  const bitmap = await createImageBitmap(file);
  const size = 800;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Photo processing is unavailable");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, size, size);
  const scale = Math.min(size / bitmap.width, size / bitmap.height);
  const width = bitmap.width * scale,
    height = bitmap.height * scale;
  context.drawImage(
    bitmap,
    (size - width) / 2,
    (size - height) / 2,
    width,
    height,
  );
  bitmap.close();
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Unable to optimize photo")),
      "image/webp",
      0.84,
    ),
  );
}

function ItemPhoto({
  code,
  name,
  version = 0,
  size = "thumb",
  onOpen,
}: {
  code: string;
  name: string;
  version?: number;
  size?: "thumb" | "medium";
  onOpen?: () => void;
}) {
  const imageKey = `${code}:${version ?? 0}`;
  const [missingKey, setMissingKey] = useState("");
  const content = missingKey === imageKey ? (
    <span className="item-photo-fallback">
      ▧<small>No photo</small>
    </span>
  ) : (
    <img
      src={`/api/item-photo?code=${encodeURIComponent(code)}&v=${version}`}
      alt={name}
      onError={() => setMissingKey(imageKey)}
    />
  );
  return onOpen ? (
    <button
      type="button"
      className={`item-photo ${size}`}
      onClick={onOpen}
      aria-label={`View photo of ${name}`}
    >
      {content}
    </button>
  ) : (
    <span className={`item-photo ${size}`}>{content}</span>
  );
}

function ItemBarcode({ code }: { code: string }) {
  const safe = code
      .toUpperCase()
      .split("")
      .filter((character) => code39Patterns[character])
      .join(""),
    modules = `*${safe}*`
      .split("")
      .map((character) => `${code39Patterns[character]}0`)
      .join(""),
    width = modules.length * 2;
  return (
    <svg
      className="code39-barcode"
      viewBox={`0 0 ${width} 74`}
      role="img"
      aria-label={`Barcode for ${code}`}
      preserveAspectRatio="none"
    >
      <rect width={width} height="74" fill="white" />
      {modules
        .split("")
        .map((module, index) =>
          module === "1" ? (
            <rect key={index} x={index * 2} y="4" width="2" height="54" />
          ) : null,
        )}
      <text x={width / 2} y="70" textAnchor="middle" fontSize="10">
        {safe}
      </text>
    </svg>
  );
}

function ItemQrCode({ code }: { code: string }) {
  const [source, setSource] = useState("");
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(code, { width: 220, margin: 1, errorCorrectionLevel: "M" })
      .then((url) => active && setSource(url))
      .catch(() => active && setSource(""));
    return () => { active = false; };
  }, [code]);
  return source ? <img className="item-qr-code" src={source} alt={`QR code for ${code}`} /> : <span className="qr-loading">Preparing QR…</span>;
}

function ItemCodeScanner({ allowedCodes, onScan }: { allowedCodes?: string[]; onScan: (code: string) => void }) {
  const [open, setOpen] = useState(false), [manualCode, setManualCode] = useState(""), [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null), streamRef = useRef<MediaStream | null>(null), onScanRef = useRef(onScan), allowedRef = useRef(allowedCodes);
  useEffect(() => {
    onScanRef.current = onScan;
    allowedRef.current = allowedCodes;
  }, [onScan, allowedCodes]);
  function acceptCode(raw: string) {
    const entered = raw.trim().toUpperCase(), valid = allowedRef.current ?? items.map((item) => item.code), matched = valid.find((code) => code.toUpperCase() === entered);
    if (!entered) { setError("Enter or scan an item code."); return false; }
    if (!matched) { setError(`Item code ${entered} was not found in this list.`); return false; }
    onScanRef.current(matched); setOpen(false); setManualCode(""); setError(""); return true;
  }
  useEffect(() => {
    if (!open) return;
    let cancelled = false, frame = 0;
    type Detector = { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> };
    type DetectorConstructor = new (options?: { formats?: string[] }) => Detector;
    const DetectorClass = (window as unknown as { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
    if (!DetectorClass || !navigator.mediaDevices?.getUserMedia) {
      queueMicrotask(() => setError("Camera scanning is not supported here. Enter the code below."));
      return;
    }
    const detector = new DetectorClass({ formats: ["code_39", "code_128", "qr_code"] });
    async function scan() {
      if (cancelled || !videoRef.current) return;
      if (videoRef.current.readyState >= 2) {
        try { const results = await detector.detect(videoRef.current); if (results[0]?.rawValue && acceptCode(results[0].rawValue)) return; } catch { /* wait for a clear frame */ }
      }
      frame = requestAnimationFrame(scan);
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false }).then(async (stream) => {
      if (cancelled) { stream.getTracks().forEach((track) => track.stop()); return; }
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); frame = requestAnimationFrame(scan); }
    }).catch(() => setError("Camera permission was not available. Enter the code below."));
    return () => { cancelled = true; cancelAnimationFrame(frame); streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; };
  }, [open]);
  return <>
    <button type="button" className="scan-code-button" onClick={() => { setError(""); setOpen(true); }}>▣ Scan</button>
    {open && <div className="modal-backdrop" role="presentation"><section className="modal-card barcode-scanner-modal" role="dialog" aria-modal="true" aria-labelledby="scanner-title">
      <div className="panel-head"><div><span className="eyebrow">ITEM LOOKUP</span><h3 id="scanner-title">Scan barcode or QR code</h3></div><button type="button" className="secondary" onClick={() => setOpen(false)}>Close</button></div>
      <div className="scanner-view"><video ref={videoRef} muted playsInline aria-label="Camera scanner" /><span aria-hidden="true" /><small>Point the camera at the item label</small></div>
      {error && <p className="form-error scanner-error">{error}</p>}
      <div className="scanner-manual"><input value={manualCode} onChange={(event) => { setManualCode(event.target.value); setError(""); }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); acceptCode(manualCode); } }} placeholder="Enter item code" autoCapitalize="characters" autoFocus /><button type="button" className="primary" onClick={() => acceptCode(manualCode)}>Use code</button></div>
      <p className="scanner-note">Camera images stay on this device and are not uploaded.</p>
    </section></div>}
  </>;
}

function QuickItemLookup({ stock, suppliers, costCodeLinks, accessibleSites, allowedViews, onClose, onNavigate }: { stock: Stock; suppliers: Supplier[]; costCodeLinks: CostCodeLink[]; accessibleSites: string[]; allowedViews: View[]; onClose: () => void; onNavigate: (view: View, code: string) => void }) {
  const [query, setQuery] = useState(""), [selectedCode, setSelectedCode] = useState("");
  const matches = items.filter((item) => `${item.code} ${item.name} ${item.khmer}`.toLowerCase().includes(query.toLowerCase())).slice(0, 8),
    selected = items.find((item) => item.code === selectedCode),
    supplierNames = selected ? (selected.supplierIds ?? []).map((id) => suppliers.find((supplier) => supplier.id === id)?.name ?? id) : [],
    linkedCodes = selected ? costCodeLinks.filter((link) => link.itemCode === selected.code).map((link) => costCodeLevel3.find((entry) => entry.code === link.costCode)).filter(Boolean) as CostCodeLevel3[] : [],
    total = selected ? accessibleSites.reduce((sum, site) => sum + (stock[site]?.[selected.code] ?? 0), 0) : 0;
  function choose(code: string) { setSelectedCode(code); setQuery(code); }
  return <div className="modal-backdrop quick-lookup-backdrop" role="dialog" aria-modal="true" aria-labelledby="quick-lookup-title" onClick={onClose}>
    <section className="modal-card quick-lookup-modal" onClick={(event) => event.stopPropagation()}>
      <div className="panel-head"><div><span className="eyebrow">GLOBAL ITEM SEARCH</span><h3 id="quick-lookup-title">Quick Item Lookup</h3></div><button type="button" className="secondary" onClick={onClose}>Close</button></div>
      <div className="quick-lookup-search">
        <input value={query} onChange={(event) => { setQuery(event.target.value); setSelectedCode(""); }} placeholder="Search code, English or Khmer name" autoFocus />
        <ItemCodeScanner onScan={choose} />
      </div>
      {!selected && query && <div className="quick-lookup-results">
        {matches.length ? matches.map((item) => <button type="button" key={item.code} onClick={() => choose(item.code)}><ItemPhoto code={item.code} name={item.name} /><span><strong>{item.code} — {item.name}</strong><small>{item.khmer || item.category}</small></span></button>) : <p>No matching item found.</p>}
      </div>}
      {!selected && !query && <div className="quick-lookup-empty"><b>▣</b><strong>Scan a label or search an item</strong><small>View live stock and master-data links without leaving your current work.</small></div>}
      {selected && <div className="quick-item-card">
        <div className="quick-item-summary"><ItemPhoto code={selected.code} name={selected.name} size="medium" /><div><span className={`status ${(selected.status ?? "Active") === "Active" ? "ok" : "danger"}`}>{selected.status ?? "Active"}</span><h2>{selected.name}</h2><p>{selected.code} · {selected.khmer || "No Khmer name"}</p><small>{selected.type} · {selected.category} · {selected.unit}</small></div><div className="quick-total"><small>TOTAL STOCK</small><strong>{total.toLocaleString()}</strong><span>{selected.unit}</span></div></div>
        <div className="quick-stock-grid">{accessibleSites.map((site) => <div key={site}><small>{site}</small><strong>{(stock[site]?.[selected.code] ?? 0).toLocaleString()}</strong><span>{selected.unit}</span></div>)}</div>
        <div className="quick-master-links"><div><small>SUPPLIER</small><strong>{supplierNames.join(", ") || "Not assigned"}</strong></div><div><small>QS COST CODE / LEVEL 3</small>{linkedCodes.length ? linkedCodes.map((entry) => <strong key={entry.code}>{entry.code} — {entry.name}</strong>) : <strong>Not linked</strong>}</div></div>
        <div className="quick-actions">{allowedViews.includes("Item Master") && <button type="button" className="secondary" onClick={() => onNavigate("Item Master", selected.code)}>Item Master</button>}{allowedViews.includes("Current Stock") && <button type="button" className="secondary" onClick={() => onNavigate("Current Stock", selected.code)}>Current Stock</button>}{allowedViews.includes("Stock In") && <button type="button" className="primary" onClick={() => onNavigate("Stock In", selected.code)}>Stock In</button>}{allowedViews.includes("Stock Out") && <button type="button" className="primary" onClick={() => onNavigate("Stock Out", selected.code)}>Stock Out</button>}{allowedViews.includes("Site Transfer") && <button type="button" className="primary" onClick={() => onNavigate("Site Transfer", selected.code)}>Transfer</button>}{allowedViews.includes("Equipment") && ["Equipment", "Small Tools"].includes(selected.type) && <button type="button" className="primary" onClick={() => onNavigate("Equipment", selected.code)}>Equipment</button>}</div>
      </div>}
    </section>
  </div>;
}

export default function Home() {
  const [user, setUser] = useState<{
    username: string;
    email?: string;
    role: Role;
    name: string;
    siteAccess?: string[];
  } | null>(null);
  const [view, setView] = useState<View>("Dashboard");
  const [siteFilter, setSiteFilter] = useState("ALL SITES");
  const [stock, setStock] = useState<Stock>(initialStock);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [bom, setBom] = useState<BomLine[]>(initialBom);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [siteRecords, setSiteRecords] = useState<ProjectSite[]>(initialSites);
  const [costCodeLinks, setCostCodeLinks] =
    useState<CostCodeLink[]>(initialCostCodeLinks);
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [stockCounts, setStockCounts] = useState<StockCountSession[]>([]);
  const [notice, setNotice] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [itemRevision, setItemRevision] = useState(0);
  const [syncStatus, setSyncStatus] = useState<
    "loading" | "saved" | "saving" | "error"
  >("loading");
  const [registration, setRegistration] = useState<{
    identity: { email: string; name: string };
    firstAccount: boolean;
  } | null>(null);
  const [pendingApproval, setPendingApproval] = useState<{
    email: string;
    name: string;
  } | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const revisionRef = useRef(0);
  const hydratedRef = useRef(false);
  const [operationsOpen, setOperationsOpen] = useState(true);
  const [masterOpen, setMasterOpen] = useState(true);
  const [reviewOpen, setReviewOpen] = useState(true);
  const [administrationOpen, setAdministrationOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarHoverDisabled, setSidebarHoverDisabled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [quickLookupOpen, setQuickLookupOpen] = useState(false);
  const [prefillItemCode, setPrefillItemCode] = useState("");
  useEffect(() => {
    if (prefillItemCode) queueMicrotask(() => setPrefillItemCode(""));
  }, [view, prefillItemCode]);
  const [pendingUserCount, setPendingUserCount] = useState(0);
  useEffect(() => {
    if (!user) return;
    const globalAccess = user.role === "Developer";
    const assigned = globalAccess
      ? sites
      : (user.siteAccess ?? []).filter((site) => sites.includes(site));
    const allValue = globalAccess ? "ALL SITES" : "ALL ASSIGNED SITES";
    if (assigned.length > 1 && siteFilter !== allValue && !assigned.includes(siteFilter))
      queueMicrotask(() => setSiteFilter(allValue));
    else if (assigned.length <= 1 && !assigned.includes(siteFilter))
      queueMicrotask(() => setSiteFilter(assigned[0] ?? ""));
  }, [user, siteFilter]);
  useEffect(() => {
    let active = true;
    const sessionId = sessionStorage.getItem("mcb-session-id") ||
      (typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `mcb-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    sessionStorage.setItem("mcb-session-id", sessionId);
    fetch("/api/state", {
      cache: "no-store",
      headers: { "x-mcb-session-id": sessionId },
    })
      .then(async (response) => {
        const data = await readJson<ApiError & {
          registrationRequired?: boolean;
          identity: { email: string; name: string };
          firstAccount?: boolean;
          pendingApproval?: boolean;
          state: InventoryState;
          revision: number;
          user: { username: string; email?: string; name: string; role: Role; siteAccess?: string[] };
        }>(response);
        if (!active) return;
        if (response.status === 401) {
          setAuthRequired(true);
          setSessionReady(true);
          setSyncStatus("saved");
          window.location.replace("/login");
          return;
        }
        if (response.status === 428 && data.registrationRequired) {
          setRegistration({
            identity: data.identity,
            firstAccount: Boolean(data.firstAccount),
          });
          setSessionReady(true);
          setSyncStatus("saved");
          return;
        }
        if (response.status === 403 && data.pendingApproval) {
          setPendingApproval(data.identity);
          setSessionReady(true);
          setSyncStatus("saved");
          return;
        }
        if (!response.ok)
          throw new Error(data.error || "Unable to load inventory");
        let shared = data.state;
        const legacy = localStorage.getItem("mcb-mvp-state");
        if (data.revision === 1 && legacy)
          try {
            const previous = JSON.parse(legacy);
            if (Array.isArray(previous.items) && previous.items.length)
              shared = {
                items: previous.items,
                stock: previous.stock ?? data.state.stock,
                transactions: previous.transactions ?? [],
                equipment: previous.equipment ?? [],
                bom: previous.bom ?? data.state.bom,
                adjustments: previous.adjustments ?? [],
                sites: previous.sites ?? data.state.sites,
                costCodeLinks:
                  previous.costCodeLinks ?? data.state.costCodeLinks,
                suppliers: previous.suppliers ?? data.state.suppliers,
                stockCounts: previous.stockCounts ?? [],
              };
          } catch {}
        items = shared.items.map((item: Item) => ({
          ...item,
          supplierIds: Array.isArray(item.supplierIds)
            ? item.supplierIds
            : ["SUP-001"],
        }));
        setStock(shared.stock);
        setTransactions(shared.transactions);
        setEquipment(shared.equipment);
        setBom(shared.bom);
        setAdjustments(shared.adjustments ?? []);
        const restoredSites: ProjectSite[] = shared.sites ?? initialSites;
        setSiteRecords(restoredSites);
        setCostCodeLinks(shared.costCodeLinks ?? initialCostCodeLinks);
        setSuppliers(shared.suppliers ?? initialSuppliers);
        setStockCounts(shared.stockCounts ?? []);
        sites = restoredSites
          .filter((site) => site.status === "Active")
          .map((site) => site.code);
        setItemRevision((v) => v + 1);
        revisionRef.current = data.revision;
        setUser(data.user);
        hydratedRef.current = true;
        setSessionReady(true);
        setSyncStatus("saved");
      })
      .catch(() => {
        if (active) {
          setSessionReady(true);
          setSyncStatus("error");
        }
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!user || !["Admin", "Developer"].includes(user.role)) return;
    let active = true;
    const loadPendingUsers = () =>
      fetch("/api/users", { cache: "no-store" })
        .then((response) => (response.ok ? readJson<{ users?: Array<{ active?: boolean | number }> }>(response) : { users: [] }))
        .then((data) => {
          if (active)
            setPendingUserCount(
              (data.users ?? []).filter(
                (account: { active?: boolean | number }) =>
                  !Boolean(account.active),
              ).length,
            );
        })
        .catch(() => active && setPendingUserCount(0));
    loadPendingUsers();
    const timer = window.setInterval(loadPendingUsers, 30000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [user?.role]);
  useEffect(() => {
    if (!sessionReady || !user || !hydratedRef.current) return;
    const timer = setTimeout(async () => {
      setSyncStatus("saving");
      try {
        const response = await fetch("/api/state", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            revision: revisionRef.current,
            state: {
              stock,
              transactions,
              equipment,
              bom,
              items,
              adjustments,
              sites: siteRecords,
              costCodeLinks,
              suppliers,
              stockCounts,
            },
          }),
        });
        const data = await readJson<ApiError & { state?: InventoryState; revision: number }>(response);
        if (response.status === 409 && data.state) {
          items = data.state.items.map((item: Item) => ({
            ...item,
            supplierIds: Array.isArray(item.supplierIds)
              ? item.supplierIds
              : ["SUP-001"],
          }));
          setStock(data.state.stock);
          setTransactions(data.state.transactions);
          setEquipment(data.state.equipment);
          setBom(data.state.bom);
          setAdjustments(data.state.adjustments ?? []);
          const restoredSites: ProjectSite[] = data.state.sites ?? initialSites;
          setSiteRecords(restoredSites);
          setCostCodeLinks(data.state.costCodeLinks ?? initialCostCodeLinks);
          setSuppliers(data.state.suppliers ?? initialSuppliers);
          setStockCounts(data.state.stockCounts ?? []);
          sites = restoredSites
            .filter((site) => site.status === "Active")
            .map((site) => site.code);
          setItemRevision((v) => v + 1);
          revisionRef.current = data.revision;
          setSyncStatus("saved");
          flash(data.error ?? "Inventory changed on another device; the latest version was loaded.");
          return;
        }
        if (!response.ok) throw new Error(data.error || "Save failed");
        revisionRef.current = data.revision;
        localStorage.removeItem("mcb-mvp-state");
        localStorage.removeItem("mcb-mvp-user");
        setSyncStatus("saved");
      } catch (cause) {
        setSyncStatus("error");
        flash(
          cause instanceof Error
            ? cause.message
            : "Your changes could not be saved",
        );
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [
    stock,
    transactions,
    equipment,
    bom,
    adjustments,
    siteRecords,
    costCodeLinks,
    suppliers,
    stockCounts,
    itemRevision,
    sessionReady,
    user,
  ]);
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    window.location.href = "/login";
  }
  function flash(message: string) {
    setNotice(message);
    setTimeout(() => setNotice(""), 3000);
  }
  function saveItem(next: Item, isNew: boolean) {
    items = isNew
      ? [next, ...items]
      : items.map((i) => (i.code === next.code ? next : i));
    setItemRevision((v) => v + 1);
    flash(
      isNew
        ? "New item added to Item Master. It will appear at a site after opening balance, Stock In, or another valid site movement."
        : "Item details updated",
    );
  }
  if (!sessionReady)
    return (
      <main className="session-loading">
        <div className="brand-mark">MCB</div>
        <p>Restoring your workspace…</p>
      </main>
    );
  if (registration)
    return (
      <RegistrationForm
        identity={registration.identity}
        firstAccount={registration.firstAccount}
        onComplete={() => window.location.reload()}
      />
    );
  if (pendingApproval)
    return (
      <main className="registration-page">
        <section className="registration-card pending-card">
          <div className="registration-mark">MCB</div>
          <span className="eyebrow">REGISTRATION RECEIVED</span>
          <h1>Waiting for Developer approval</h1>
          <p>
            Your identity is verified and your registration has been saved. The
            Developer must activate your role before you can enter the
            inventory system.
          </p>
          <div className="registration-identity">
            <strong>{pendingApproval.name}</strong>
            <span>{pendingApproval.email}</span>
          </div>
          <button
            className="secondary"
            onClick={() => window.location.reload()}
          >
            Check approval status
          </button>
          <a href="/login">Use another account</a>
        </section>
      </main>
    );
  if (!user)
    return (
      <AuthGateway serviceError={syncStatus === "error" && !authRequired} />
    );
  const allowed = roleViews[user.role];
  const hasGlobalSiteAccess = user.role === "Developer";
  const selectableSites = hasGlobalSiteAccess
    ? sites
    : (user.siteAccess ?? []).filter((site) => sites.includes(site));
  const allSitesValue = hasGlobalSiteAccess ? "ALL SITES" : "ALL ASSIGNED SITES";
  const visibleTransactions = user.role === "Developer"
    ? transactions
    : transactions.filter((transaction) =>
        selectableSites.includes(transaction.site) ||
        Boolean(transaction.other && selectableSites.includes(transaction.other)),
      );
  const visibleEquipment = user.role === "Developer"
    ? equipment
    : equipment.filter((record) => selectableSites.includes(record.site));
  const visibleAdjustments = user.role === "Developer"
    ? adjustments
    : adjustments.filter((record) => selectableSites.includes(record.site));
  const visibleStockCounts = user.role === "Developer"
    ? stockCounts
    : stockCounts.filter((session) => selectableSites.includes(session.site));
  const alertCount =
    selectableSites
      .flatMap((s) =>
        items
          .filter((i) => Object.prototype.hasOwnProperty.call(stock[s] ?? {}, i.code))
          .map((i) => ({ qty: stock[s]?.[i.code] ?? 0, min: i.min })),
      )
      .filter((entry) => entry.qty <= entry.min).length +
    visibleEquipment.filter(
      (e) =>
        (e.status === "Checked Out" && e.expected < nowDate()) ||
        ["Awaiting Repair", "Under Repair", "Lost"].includes(e.status),
    ).length +
    visibleTransactions.filter((t) =>
      ["No Approved BOM", "Pending QS Revision"].includes(t.status),
    ).length +
    visibleTransactions.filter(
      (t) => t.type === "SITE TRANSFER" && t.status === "In Transit",
    ).length +
    visibleAdjustments.filter((a) => a.status === "Pending").length +
    visibleStockCounts.filter((session) => session.status === "Pending").length +
    visibleTransactions.filter((t) => !t.verifiedAt).length +
    pendingUserCount;
  const overviewViews = allowed.filter((v) => v === "Dashboard"),
    masterViews = allowed.filter((v) => ["Item Master", "BOM Control", "Current Stock", "Supplier"].includes(v)),
    settingsViews = allowed.filter((v) => ["Project/Site", "User Access", "Backup & Recovery", "Help & SOP"].includes(v)),
    secondaryViews = allowed.filter((v) =>
      ["Transactions", "Audit Report", "Reports", "Alerts"].includes(v),
    ),
    allowedOperations = operationViews.filter((v) => allowed.includes(v)),
    mobileViews: Record<Role, View[]> = {
      Developer: ["Dashboard", "Current Stock", "User Access", "Alerts", "Help & SOP"],
      Admin: ["Dashboard", "Current Stock", "Stock Count", "Alerts", "Help & SOP"],
      "Stock Controller": ["Dashboard", "Stock In", "Stock Out", "Site Transfer", "Alerts"],
      Stockkeeper: ["Dashboard", "Stock In", "Site Transfer", "Equipment", "Alerts"],
      "Site Team": ["Dashboard", "Current Stock", "Alerts", "Help & SOP"],
      QS: ["Dashboard", "BOM Control", "Current Stock", "Reports", "Alerts"],
      PM: ["Dashboard", "Current Stock", "Reports", "Alerts", "Help & SOP"],
      Management: ["Dashboard", "Current Stock", "Reports", "Alerts", "Help & SOP"],
    };
  return (
    <div
      className={`app-shell ${sidebarCollapsed ? "sidebar-is-collapsed" : ""}`}
    >
      <aside
        className={`sidebar ${sidebarCollapsed ? "collapsed" : ""} ${sidebarHoverDisabled ? "hover-disabled" : ""}`}
        onPointerDown={(e) => {
          if (e.pointerType === "touch") setSidebarHoverDisabled(true);
        }}
        onPointerMove={(e) => {
          if (e.pointerType === "mouse") setSidebarHoverDisabled(false);
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse" && sidebarCollapsed)
            setOperationsOpen(false);
        }}
      >
        <div className="brand">
          <span className="brand-mark">MCB</span>
          <div>
            <strong>Inventory Control</strong>
            <small>
              <i /> Operations platform
            </small>
          </div>
        </div>
        <nav>
          <span className="nav-label">OVERVIEW</span>
          {overviewViews.map((v) => (
            <button
              key={v}
              title={sidebarCollapsed ? v : undefined}
              className={view === v ? "active" : ""}
              onClick={() => setView(v)}
            >
              <span className="nav-glyph">{navIcon(v)}</span>
              <span className="nav-text">{v}</span>
            </button>
          ))}
          {masterViews.length > 0 && <div className="nav-group nav-section-group"><button type="button" className={`nav-group-toggle ${masterViews.includes(view) ? "current" : ""}`} aria-expanded={!sidebarCollapsed && masterOpen} onClick={() => setMasterOpen((open) => !open)}><span className="nav-glyph">◇</span><span className="nav-text">Master & Control</span><span className={`nav-chevron ${masterOpen ? "open" : ""}`}>⌄</span></button>{masterOpen && <div className="nav-submenu">{masterViews.map((v) => <button key={v} className={view === v ? "active" : ""} onClick={() => setView(v)}><span className="nav-glyph nav-operation-glyph">{navIcon(v)}</span><span className="nav-text">{v}</span></button>)}</div>}</div>}
          {allowedOperations.length > 0 && (
            <div className="nav-group">
              <button
                type="button"
                title={sidebarCollapsed ? "Site Operations" : undefined}
                className={`nav-group-toggle ${operationViews.includes(view) ? "current" : ""}`}
                aria-expanded={!sidebarCollapsed && operationsOpen}
                onClick={() => setOperationsOpen((v) => !v)}
              >
                <span className="nav-glyph">⌂</span>
                <span className="nav-text">Site Operations</span>
                <span className={`nav-chevron ${operationsOpen ? "open" : ""}`}>
                  ⌄
                </span>
              </button>
              {operationsOpen && (
                <div className="nav-submenu">
                  {allowedOperations.map((v) => (
                    <button
                      key={v}
                      className={view === v ? "active" : ""}
                      onClick={() => setView(v)}
                    >
                      <span className="nav-glyph nav-operation-glyph">
                        {navIcon(v)}
                      </span>
                      <span className="nav-text">{v}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {secondaryViews.length > 0 && <div className="nav-group nav-section-group"><button type="button" className={`nav-group-toggle ${secondaryViews.includes(view) ? "current" : ""}`} aria-expanded={!sidebarCollapsed && reviewOpen} onClick={() => setReviewOpen((open) => !open)}><span className="nav-glyph">▤</span><span className="nav-text">Review & Reporting</span><span className={`nav-chevron ${reviewOpen ? "open" : ""}`}>⌄</span>{alertCount > 0 && <b className="nav-alert">{alertCount > 99 ? "99+" : alertCount}</b>}</button>{reviewOpen && <div className="nav-submenu">{secondaryViews.map((v) => <button key={v} className={view === v ? "active" : ""} onClick={() => setView(v)}><span className="nav-glyph nav-operation-glyph">{navIcon(v)}</span><span className="nav-text">{v}</span>{v === "Alerts" && alertCount > 0 && <b className="nav-alert">{alertCount > 99 ? "99+" : alertCount}</b>}</button>)}</div>}</div>}
          {settingsViews.length > 0 && <div className="nav-group nav-section-group"><button type="button" className={`nav-group-toggle ${settingsViews.includes(view) ? "current" : ""}`} aria-expanded={!sidebarCollapsed && administrationOpen} onClick={() => setAdministrationOpen((open) => !open)}><span className="nav-glyph">⚙</span><span className="nav-text">Settings</span><span className={`nav-chevron ${administrationOpen ? "open" : ""}`}>⌄</span></button>{administrationOpen && <div className="nav-submenu">{settingsViews.map((v) => <button key={v} className={view === v ? "active" : ""} onClick={() => setView(v)}><span className="nav-glyph nav-operation-glyph">{navIcon(v)}</span><span className="nav-text">{v}</span></button>)}</div>}</div>}
        </nav>
        <div className="sidebar-foot">
          <button
            type="button"
            className="user-card profile-trigger"
            onClick={() => setProfileOpen(true)}
            aria-label="Open my profile"
          >
            <span className="avatar">{user.role[0]}</span>
            <div>
              <strong>{user.name}</strong>
              <small>{user.role}</small>
            </div>
            <span className="user-online" />
          </button>
          <button className="logout" onClick={logout}>
            Sign out <span>↗</span>
          </button>
        </div>
      </aside>
      <main
        className="workspace"
        onPointerDown={(e) => {
          if (
            e.pointerType === "touch" &&
            !sidebarCollapsed &&
            !(e.target as HTMLElement).closest(".sidebar-toggle")
          )
            setSidebarCollapsed(true);
        }}
      >
        <header className="topbar">
          <div className="topbar-title">
            <button
              type="button"
              className="sidebar-toggle"
              aria-label={
                sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
              }
              onClick={() => setSidebarCollapsed((v) => !v)}
            >
              ☰
            </button>
            <div>
              <p>MCB / INVENTORY OPERATIONS</p>
              <h1>{view}</h1>
            </div>
          </div>
          <div className="top-actions">
            <button type="button" className="quick-lookup-button" onClick={() => setQuickLookupOpen(true)} aria-label="Open quick item lookup">⌕ <span>Item Lookup</span></button>
            <span className={`sync-state ${syncStatus}`}>
              {syncStatus === "saving"
                ? "Saving…"
                : syncStatus === "error"
                  ? "Save problem"
                  : "Shared data"}
            </span>
            <div className="today">
              <small>OPERATING DATE</small>
              <strong>
                {new Date().toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </strong>
            </div>
            <button
              className="bell"
              aria-label={`${alertCount} notifications`}
              onClick={() => allowed.includes("Alerts") && setView("Alerts")}
            >
              <b>{alertCount}</b>
            </button>
            <button type="button" className="help-button" aria-label="Open help and standard operating procedures" onClick={() => setView("Help & SOP")}>?</button>
            <span className={`role-pill ${user.role === "Developer" ? "developer-role" : ""}`}>
              {user.role === "Developer" ? "Developer · Full Access" : user.role}
            </span>
            <label className="site-selector">
              <small>SITE VIEW</small>
              <select
                value={siteFilter}
                onChange={(e) => setSiteFilter(e.target.value)}
              >
                {selectableSites.length > 1 && <option>{allSitesValue}</option>}
                {!selectableSites.length && <option value="">NO SITE ASSIGNED</option>}
                {selectableSites.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>
        </header>
        {quickLookupOpen && <QuickItemLookup stock={stock} suppliers={suppliers} costCodeLinks={costCodeLinks} accessibleSites={selectableSites} allowedViews={allowed} onClose={() => setQuickLookupOpen(false)} onNavigate={(nextView, code) => { setPrefillItemCode(code); setView(nextView); setQuickLookupOpen(false); }} />}
        {notice && (
          <div className="toast">
            <span>✓</span>
            {notice}
          </div>
        )}
        <section className="content">
          {view === "Dashboard" && (
            <Dashboard
              stock={stock}
              transactions={visibleTransactions}
              equipment={visibleEquipment}
              siteFilter={siteFilter}
              accessibleSites={selectableSites}
              allowedOperations={allowedOperations}
              viewerRole={user.role}
              onNavigate={setView}
            />
          )}
          {view === "Item Master" && (
            <ItemMaster
              revision={itemRevision}
              onSave={saveItem}
              canManagePhoto={user.role === "Developer"}
              suppliers={suppliers}
              stock={stock}
              costCodeLinks={costCodeLinks}
              siteRecords={siteRecords}
            />
          )}
          {view === "BOM Control" && (
            <BomControl
              accessibleSites={selectableSites}
              rows={bom}
              setRows={setBom}
              transactions={transactions}
              canEdit={["Developer", "QS"].includes(user.role)}
              flash={flash}
              costCodeLinks={costCodeLinks}
              setCostCodeLinks={setCostCodeLinks}
            />
          )}
          {view === "Current Stock" && (
            <CurrentStock
              stock={stock}
              setStock={setStock}
              siteFilter={siteFilter}
              accessibleSites={selectableSites}
              setTransactions={setTransactions}
              user={user.username}
              role={user.role}
              adjustments={adjustments}
              setAdjustments={setAdjustments}
              canEdit={["Developer", "Stock Controller"].includes(user.role)}
              flash={flash}
            />
          )}
          {view === "Stock Count" && (
            <StockCountModule
              sessions={stockCounts}
              setSessions={setStockCounts}
              stock={stock}
              accessibleSites={selectableSites}
              setStock={setStock}
              setTransactions={setTransactions}
              user={user.username}
              role={user.role}
              flash={flash}
            />
          )}
          {view === "Stock In" && (
            <MovementForm
              mode="IN"
              initialCode={prefillItemCode}
              accessibleSites={selectableSites}
              stock={stock}
              setStock={setStock}
              setTransactions={setTransactions}
              transactions={transactions}
              user={user.username}
              role={user.role}
              flash={flash}
              bom={bom}
              suppliers={suppliers}
              onNavigate={setView}
            />
          )}
          {view === "Stock Out" && (
            <DailyStockOutBatch
              initialCode={prefillItemCode}
              accessibleSites={selectableSites}
              stock={stock}
              setStock={setStock}
              setTransactions={setTransactions}
              transactions={transactions}
              user={user.username}
              role={user.role}
              flash={flash}
              bom={bom}
              onNavigate={setView}
            />
          )}
          {view === "Site Transfer" && (
            <TransferForm
              initialCode={prefillItemCode}
              accessibleSites={selectableSites}
              stock={stock}
              setStock={setStock}
              transactions={transactions}
              setTransactions={setTransactions}
              user={user.username}
              role={user.role}
              flash={flash}
              onNavigate={setView}
            />
          )}
          {view === "Equipment" && (
            <EquipmentPanel
              initialCode={prefillItemCode}
              accessibleSites={selectableSites}
              records={equipment}
              setRecords={setEquipment}
              stock={stock}
              setTransactions={setTransactions}
              user={user.username}
              flash={flash}
            />
          )}
          {view === "Transactions" && <Transactions rows={visibleTransactions} setRows={setTransactions} stock={stock} setStock={setStock} user={user.username} role={user.role} canCorrect={["Developer", "Stock Controller"].includes(user.role)} flash={flash} />}
          {view === "Audit Report" && (
            <AuditReport transactions={visibleTransactions} />
          )}
          {view === "Reports" && (
            <ManagementReports
              stock={stock}
              transactions={visibleTransactions}
              bom={bom}
              equipment={visibleEquipment}
            />
          )}
          {view === "Backup & Recovery" && (
            <BackupRecovery
              stock={stock}
              transactions={transactions}
              equipment={equipment}
              bom={bom}
              adjustments={adjustments}
              siteRecords={siteRecords}
              costCodeLinks={costCodeLinks}
              suppliers={suppliers}
              stockCounts={stockCounts}
              revision={revisionRef.current}
              canRestore={user.role === "Developer"}
              onRestore={(backup) => {
                items = backup.items;
                setStock(backup.stock);
                setTransactions(backup.transactions);
                setEquipment(backup.equipment);
                setBom(backup.bom);
                setAdjustments(backup.adjustments);
                setSiteRecords(backup.sites);
                setCostCodeLinks(backup.costCodeLinks);
                setSuppliers(backup.suppliers);
                setStockCounts(backup.stockCounts);
                sites = backup.sites.filter((record) => record.status === "Active").map((record) => record.code);
                setItemRevision((value) => value + 1);
                flash("Backup restored and queued for secure save");
              }}
            />
          )}
          {view === "Help & SOP" && (
            <HelpAndSop role={user.role} allowed={allowed} onNavigate={setView} />
          )}
          {view === "Alerts" && (
            <Alerts
              stock={stock}
              equipment={visibleEquipment}
              transactions={visibleTransactions}
              adjustments={visibleAdjustments}
              stockCounts={visibleStockCounts}
              pendingUserCount={pendingUserCount}
              canManageUsers={user.role === "Developer"}
              onNavigate={setView}
            />
          )}
          {view === "Supplier" && (
            <SupplierMaster
              suppliers={suppliers}
              setSuppliers={setSuppliers}
              transactions={transactions}
              canEdit={["Developer", "Admin"].includes(user.role)}
              flash={flash}
            />
          )}
          {view === "Project/Site" && (
            <ProjectSiteMaster
              records={siteRecords}
              setRecords={setSiteRecords}
              setStock={setStock}
              flash={flash}
              canEdit={["Admin", "Developer"].includes(user.role)}
            />
          )}
          {view === "User Access" && (
            <UserAccess
              currentUser={user.username}
              availableSites={siteRecords.filter(
                (site) => site.status === "Active",
              )}
            />
          )}
        </section>
      </main>
      <nav className="mobile-nav" aria-label="Mobile quick navigation">
        {mobileViews[user.role].filter((target) => allowed.includes(target)).map((target) => (
          <button type="button" key={target} className={view === target ? "active" : ""} onClick={() => setView(target)}>
            <span>{navIcon(target)}</span>
            <small>{target === "Current Stock" ? "Stock" : target === "Site Transfer" ? "Transfer" : target === "BOM Control" ? "BOM" : target === "Help & SOP" ? "Help" : target}</small>
            {target === "Alerts" && alertCount > 0 && <b>{alertCount > 99 ? "99+" : alertCount}</b>}
          </button>
        ))}
      </nav>
      {profileOpen && (
        <ProfilePanel
          onClose={() => setProfileOpen(false)}
          onSaved={(name) => {
            setUser((current) => (current ? { ...current, name } : current));
            flash("Profile information updated");
          }}
        />
      )}
    </div>
  );
}

type ProfileData = {
  userId: string;
  email: string;
  name: string;
  role: Role;
  active: boolean | number;
  employeeId: string;
  phone: string;
};

function ProfilePanel({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (name: string) => void;
}) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    fetch("/api/profile", { cache: "no-store" })
      .then(async (response) => {
        const data = await readJson<ApiError & { profile: ProfileData }>(response);
        if (!response.ok) throw new Error(data.error);
        setProfile({
          ...data.profile,
          employeeId: data.profile.employeeId || "",
          phone: data.profile.phone || "",
        });
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Unable to load profile"),
      );
  }, []);
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await readJson<ApiError & { name: string }>(response);
      if (!response.ok) throw new Error(data.error);
      onSaved(data.name);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update profile");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-title"
    >
      <form className="budget-modal profile-modal" onSubmit={save}>
        <div className="profile-heading">
          <span className="profile-avatar">
            {profile?.name?.slice(0, 1).toUpperCase() || "U"}
          </span>
          <div>
            <span className="eyebrow">MY ACCOUNT</span>
            <h2 id="profile-title">Profile</h2>
            <p>View and update your MCB staff information.</p>
          </div>
        </div>
        {!profile && !error ? (
          <Empty text="Loading your profile…" />
        ) : (
          profile && (
            <>
              <div className="profile-grid">
                <label>
                  Staff display name
                  <input
                    required
                    value={profile.name}
                    onChange={(e) =>
                      setProfile({ ...profile, name: e.target.value })
                    }
                  />
                </label>
                <label>
                  Email address
                  <input readOnly value={profile.email} />
                </label>
                <label>
                  Employee ID <small>(optional)</small>
                  <input
                    value={profile.employeeId}
                    onChange={(e) =>
                      setProfile({ ...profile, employeeId: e.target.value })
                    }
                  />
                </label>
                <label>
                  Phone number <small>(optional)</small>
                  <input
                    value={profile.phone}
                    onChange={(e) =>
                      setProfile({ ...profile, phone: e.target.value })
                    }
                  />
                </label>
                <label>
                  Assigned role
                  <input readOnly value={profile.role} />
                </label>
              </div>
              <section className="password-control">
                <div>
                  <strong>Password & sign-in security</strong>
                  <small>
                    The inventory system never stores your password. Manage it
                    securely in ChatGPT Account settings.
                  </small>
                </div>
                <a href="https://chatgpt.com/" target="_blank" rel="noreferrer">
                  Manage password ↗
                </a>
              </section>
            </>
          )
        )}
        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="confirm" disabled={!profile || saving}>
            {saving ? "Saving…" : "Save profile"}
          </button>
        </div>
      </form>
    </div>
  );
}

function AuthGateway({ serviceError }: { serviceError: boolean }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  return (
    <main className="auth-gateway">
      <section className="auth-showcase">
        <div className="registration-mark">MCB</div>
        <span className="eyebrow">MCB INVENTORY CONTROL</span>
        <h1>One secure workspace for every construction site.</h1>
        <p>
          Control stock, BOM limits, transfers, tools, repairs and approvals
          with one shared operational record.
        </p>
        <div className="auth-points">
          <span>
            <b>✓</b>Shared live stock by site
          </span>
          <span>
            <b>✓</b>Controlled equipment returns
          </span>
          <span>
            <b>✓</b>Role-based approvals and audit history
          </span>
        </div>
        <small>MEAN CHEY BUILDER · INVENTORY OPERATIONS</small>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-tabs">
            <button
              className={mode === "login" ? "active" : ""}
              onClick={() => setMode("login")}
            >
              Login
            </button>
            <button
              className={mode === "register" ? "active" : ""}
              onClick={() => setMode("register")}
            >
              Register
            </button>
          </div>
          {mode === "login" ? (
            <div className="auth-form">
              <span className="eyebrow">APPROVED USER ACCESS</span>
              <h2>Welcome back</h2>
              <p>
                Continue to secure identity verification. Your approved MCB role
                will be loaded automatically.
              </p>
              <div className="auth-security">
                <span>●</span>
                <div>
                  <strong>Password protected</strong>
                  <small>
                    Your password is handled by the secure identity provider and
                    is never stored in this inventory system.
                  </small>
                </div>
              </div>
              {serviceError && (
                <div className="form-error">
                  The inventory service is temporarily unavailable. Please try
                  again.
                </div>
              )}
              <a
                className="primary auth-submit"
                href="/login"
              >
                Continue to secure login
              </a>
              <button
                type="button"
                className="auth-switch"
                onClick={() => setMode("register")}
              >
                New employee? Register for access
              </button>
            </div>
          ) : (
            <div className="auth-form">
              <span className="eyebrow">NEW STAFF REGISTRATION</span>
              <h2>Create access request</h2>
              <p>
                First verify your identity. You will then complete your employee
                profile, site and requested role.
              </p>
              <ol className="register-preview">
                <li>
                  <b>1</b>
                  <span>
                    <strong>Verify identity</strong>
                    <small>Confirm your secure account and email</small>
                  </span>
                </li>
                <li>
                  <b>2</b>
                  <span>
                    <strong>Complete staff profile</strong>
                    <small>Employee ID, phone, site and role</small>
                  </span>
                </li>
                <li>
                  <b>3</b>
                  <span>
                    <strong>Admin approval</strong>
                    <small>Access activates after review</small>
                  </span>
                </li>
              </ol>
              <a
                className="primary auth-submit"
                href="/register"
              >
                Verify identity and register
              </a>
              <button
                type="button"
                className="auth-switch"
                onClick={() => setMode("login")}
              >
                Already registered? Login
              </button>
            </div>
          )}
          <div className="auth-help">
            <span>Secure access</span>
            <span>•</span>
            <span>Activity monitored</span>
          </div>
        </div>
      </section>
    </main>
  );
}

function RegistrationForm({
  identity,
  firstAccount,
  onComplete,
}: {
  identity: { email: string; name: string };
  firstAccount: boolean;
  onComplete: () => void;
}) {
  const [name, setName] = useState(identity.name),
    [employeeId, setEmployeeId] = useState(""),
    [phone, setPhone] = useState(""),
    [requestedRole, setRequestedRole] = useState<Role>(firstAccount ? "Developer" : "Stockkeeper"),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false),
    [submitted, setSubmitted] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          employeeId,
          phone,
          requestedRole,
        }),
      });
      const data = await readJson<ApiError & { approved?: boolean }>(response);
      if (!response.ok) throw new Error(data.error || "Registration failed");
      if (data.approved) {
        onComplete();
        return;
      }
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setSaving(false);
    }
  }
  if (submitted)
    return (
      <main className="registration-page">
        <section className="registration-card pending-card">
          <div className="registration-mark">MCB</div>
          <span className="eyebrow">REGISTRATION SUBMITTED</span>
          <h1>Approval request sent</h1>
          <p>
            The Developer can now review and activate your account from
            User Access.
          </p>
          <button className="primary" onClick={onComplete}>
            Check status
          </button>
        </section>
      </main>
    );
  return (
    <main className="registration-page">
      <section className="registration-intro">
        <div className="registration-mark">MCB</div>
        <span className="eyebrow">MCB INVENTORY CONTROL</span>
        <h1>Register your system access</h1>
        <p>
          Complete your staff profile before entering stock and equipment
          operations. Your verified account email cannot be changed here.
        </p>
        <div className="registration-steps">
          <span>
            <b>1</b>Verified identity
          </span>
          <span>
            <b>2</b>Staff information
          </span>
          <span>
            <b>3</b>
            {firstAccount ? "Developer activation" : "Approval"}
          </span>
        </div>
      </section>
      <form className="registration-card" onSubmit={submit}>
        <div>
          <span className="eyebrow">
            {firstAccount ? "FIRST SYSTEM ACCOUNT" : "NEW USER REQUEST"}
          </span>
          <h2>
            {firstAccount ? "Create Developer profile" : "Request access"}
          </h2>
          <p>
            {firstAccount
              ? "The first registered account receives Developer access."
              : "The Developer will review your requested role."}
          </p>
        </div>
        <label>
          Full name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Employee full name"
          />
        </label>
        <label>
          Verified email
          <input value={identity.email} readOnly />
        </label>
        <div className="registration-grid">
          <label>
            Employee ID <small>(optional)</small>
            <input
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="MCB-0001"
            />
          </label>
          <label>
            Phone number <small>(optional)</small>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+855 ..."
            />
          </label>
          <label>
            Requested role
            <select
              value={requestedRole}
              onChange={(e) => setRequestedRole(e.target.value as Role)}
              disabled={firstAccount}
            >
              {firstAccount && <option>Developer</option>}
              {!firstAccount && <option>Admin</option>}
              {!firstAccount && <option>Stock Controller</option>}
              {!firstAccount && <option>Stockkeeper</option>}
              {!firstAccount && <option>QS</option>}
              {!firstAccount && <option>Management</option>}
            </select>
          </label>
        </div>
        {error && <div className="form-error">{error}</div>}
        <label className="registration-confirm">
          <input type="checkbox" required /> I confirm that this information is
          correct and belongs to me.
        </label>
        <button className="primary" disabled={saving}>
          {saving
            ? "Submitting…"
            : firstAccount
              ? "Register Developer"
              : "Submit registration"}
        </button>
        <a
          className="registration-signout"
          href="/login"
        >
          Use another verified account
        </a>
      </form>
    </main>
  );
}

function Dashboard({
  stock,
  transactions,
  equipment,
  siteFilter,
  accessibleSites,
  allowedOperations,
  viewerRole,
  onNavigate,
}: {
  stock: Stock;
  transactions: Tx[];
  equipment: Equipment[];
  siteFilter: string;
  accessibleSites: string[];
  allowedOperations: View[];
  viewerRole: Role;
  onNavigate: (v: View) => void;
}) {
  const selectedSites = siteFilter === "ALL SITES"
    ? sites
    : siteFilter === "ALL ASSIGNED SITES"
      ? accessibleSites
      : accessibleSites.includes(siteFilter)
        ? [siteFilter]
        : [];
  const lines = selectedSites.flatMap((s) =>
    items
      .filter((i) => Object.prototype.hasOwnProperty.call(stock[s] ?? {}, i.code))
      .map((i) => ({ site: s, item: i, qty: stock[s]?.[i.code] ?? 0 })),
  );
  const positive = lines.filter((x) => x.qty > 0).length,
    low = lines.filter((x) => x.qty > 0 && x.qty <= x.item.min).length,
    out = lines.filter((x) => x.qty <= 0).length,
    openEquip = equipment.filter((e) => e.status === "Checked Out").length;
  const siteTotals = selectedSites.map((site) => {
    const positioned = items.filter((i) =>
      Object.prototype.hasOwnProperty.call(stock[site] ?? {}, i.code),
    );
    const active = positioned.filter((i) => (stock[site]?.[i.code] ?? 0) > 0).length;
    return {
      site,
      active,
      total: positioned.length,
      availability: Math.round((active / Math.max(positioned.length, 1)) * 100),
    };
  });
  const health = Math.round((positive / Math.max(lines.length, 1)) * 100);
  return (
    <>
      <section className="dashboard-intro">
        <div>
          <span className="eyebrow">{viewerRole === "PM" ? "PROJECT CONTROL" : viewerRole === "Management" ? "MANAGEMENT CONTROL" : viewerRole === "Site Team" ? "SITE VISIBILITY" : "CONTROL CENTER"}</span>
          <h2>{viewerRole === "PM" ? "Project inventory overview" : viewerRole === "Management" ? "Portfolio inventory overview" : viewerRole === "Site Team" ? "Site material overview" : "Inventory control center"}</h2>
          <p>
            {viewerRole === "PM"
              ? "Monitor assigned-site stock, BOM exposure and exceptions without changing inventory records."
              : viewerRole === "Management"
                ? "Review stock health and operational exceptions across the sites you are authorized to see."
                : viewerRole === "Site Team"
                  ? "Check material availability and recent movements for your assigned site without posting stock."
                  : "Monitor material availability and site operations from one controlled workspace."}
          </p>
        </div>
        <div className="quick-actions">
          {allowedOperations.includes("Stock In") && <button onClick={() => onNavigate("Stock In")}>
            <span>↓</span>
            <b>Receive stock</b>
            <small>Post delivery</small>
          </button>}
          {allowedOperations.includes("Stock Out") && <button onClick={() => onNavigate("Stock Out")}>
            <span>↑</span>
            <b>Issue material</b>
            <small>Control balance</small>
          </button>}
          {allowedOperations.includes("Site Transfer") && <button onClick={() => onNavigate("Site Transfer")}>
            <span>⇄</span>
            <b>Transfer site</b>
            <small>Move stock</small>
          </button>}
        </div>
      </section>
      <div className="kpi-grid">
        <Kpi
          label="Stocked item lines"
          value={positive}
          tone="blue"
          note="Available above zero"
        />
        <Kpi
          label="Low stock"
          value={low}
          tone="amber"
          note="At or below minimum"
        />
        <Kpi
          label="Out of stock"
          value={out}
          tone="red"
          note="Requires attention"
        />
        <Kpi
          label="Equipment out"
          value={openEquip}
          tone="green"
          note="Current checkouts"
        />
      </div>
      <div className="dashboard-grid">
        <article className="panel stock-summary">
          <div className="panel-head">
            <div>
              <span className="eyebrow">SITE MATERIAL SUMMARY</span>
              <h3>Availability by site</h3>
            </div>
            <button onClick={() => onNavigate("Current Stock")}>
              Open stock register <span>→</span>
            </button>
          </div>
          <div className="site-bars">
            {siteTotals.map((x) => (
              <div className="site-row" key={x.site}>
                <span className="site-avatar">{x.site.slice(0, 2)}</span>
                <div>
                  <strong>{x.site}</strong>
                  <small>
                    {x.active} of {x.total} item lines in stock
                  </small>
                </div>
                <div className="bar-track">
                  <span style={{ width: `${Math.max(4, x.availability)}%` }} />
                </div>
                <b>{x.availability}%</b>
              </div>
            ))}
          </div>
          <p className="metric-note">
            Availability is calculated by active item lines. Different UOM
            quantities are never added together.
          </p>
        </article>
        <article className="panel health-panel">
          <div className="panel-head">
            <div>
              <span className="eyebrow">INVENTORY HEALTH</span>
              <h3>Availability rate</h3>
            </div>
          </div>
          <div
            className="health-ring"
            style={{
              background: `conic-gradient(#1d7d59 0 ${health}%, #e9eef3 ${health}% 100%)`,
            }}
          >
            <div>
              <strong>{health}%</strong>
              <small>In stock</small>
            </div>
          </div>
          <div className="health-legend">
            <span>
              <i className="good" />
              Available <b>{positive}</b>
            </span>
            <span>
              <i className="warning" />
              Low stock <b>{low}</b>
            </span>
            <span>
              <i className="critical" />
              Out of stock <b>{out}</b>
            </span>
          </div>
        </article>
        <article className="panel activity-panel">
          <div className="panel-head">
            <div>
              <span className="eyebrow">RECENT ACTIVITY</span>
              <h3>Latest movements</h3>
            </div>
            <button onClick={() => onNavigate("Transactions")}>
              View all <span>→</span>
            </button>
          </div>
          {transactions.length ? (
            <div className="activity-list">
              {transactions.slice(0, 5).map((t) => (
                <div key={t.id}>
                  <span
                    className={`tx-dot ${t.type.includes("OUT") ? "out" : ""}`}
                  />
                  <div>
                    <strong>
                      {t.type} · {t.code}
                    </strong>
                    <small>
                      {t.site}
                      {t.other ? ` → ${t.other}` : ""} · {t.date}
                    </small>
                  </div>
                  <b className={t.qty < 0 ? "negative" : "positive"}>
                    {t.qty > 0 ? "+" : ""}
                    {t.qty}
                  </b>
                </div>
              ))}
            </div>
          ) : (
            <Empty text="No transactions yet. Use Stock In to start the test." />
          )}
        </article>
      </div>
    </>
  );
}
function Kpi({
  label,
  value,
  tone,
  note,
}: {
  label: string;
  value: number;
  tone: string;
  note: string;
}) {
  const icon =
    tone === "blue" ? "▤" : tone === "amber" ? "△" : tone === "red" ? "!" : "⌁";
  return (
    <article className={`kpi ${tone}`}>
      <div className="kpi-top">
        <span>{label}</span>
        <i>{icon}</i>
      </div>
      <strong>{value.toLocaleString()}</strong>
      <div className="kpi-bottom">
        <small>{note}</small>
        <b>Live</b>
      </div>
    </article>
  );
}
function ItemMaster({
  revision,
  onSave,
  canManagePhoto,
  suppliers,
  stock,
  costCodeLinks,
  siteRecords,
}: {
  revision: number;
  onSave: (item: Item, isNew: boolean) => void;
  canManagePhoto: boolean;
  suppliers: Supplier[];
  stock: Stock;
  costCodeLinks: CostCodeLink[];
  siteRecords: ProjectSite[];
}) {
  const empty: Item = {
    code: "",
    name: "",
    khmer: "",
    unit: "PCS",
    type: "Material",
    category: "",
    min: 0,
    status: "Active",
    supplierIds: [],
  };
  const [q, setQ] = useState(""),
    [editor, setEditor] = useState<Item | null>(null),
    [isNew, setIsNew] = useState(false),
    [error, setError] = useState(""),
    [photoFile, setPhotoFile] = useState<File | null>(null),
    [photoRevision, setPhotoRevision] = useState<Record<string, number>>({}),
    [previewItem, setPreviewItem] = useState<Item | null>(null),
    [barcodeItem, setBarcodeItem] = useState<Item | null>(null),
    [selectedLabels, setSelectedLabels] = useState<string[]>([]),
    [labelSheetOpen, setLabelSheetOpen] = useState(false),
    [qualityOpen, setQualityOpen] = useState(false),
    [uploading, setUploading] = useState(false),
    [importResult, setImportResult] = useState("");
  const filtered = items.filter((i) =>
    `${i.code} ${i.name} ${i.khmer} ${i.type} ${i.category} ${i.status}`
      .toLowerCase()
      .includes(q.toLowerCase()),
  );
  const nameCounts = items.reduce<Record<string, number>>((counts, item) => {
      const key = item.name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {}),
    qualityIssues: Array<{ area: string; code: string; issue: string; severity: "High" | "Medium" }> = [];
  items.forEach((item) => {
    if ((item.status ?? "Active") === "Active" && !(item.supplierIds ?? []).length) qualityIssues.push({ area: "Supplier", code: item.code, issue: "Active item has no assigned supplier", severity: "Medium" });
    if (item.type === "Material" && !costCodeLinks.some((link) => link.itemCode === item.code)) qualityIssues.push({ area: "QS Cost Code", code: item.code, issue: "Material is not linked to any Level 3 Cost Code", severity: "High" });
    if (!itemCategories.includes(item.category)) qualityIssues.push({ area: "Category", code: item.code, issue: `Non-standard category: ${item.category || "blank"}`, severity: "High" });
    if (!itemUoms.includes(item.unit)) qualityIssues.push({ area: "UOM", code: item.code, issue: `Non-standard UOM: ${item.unit || "blank"}`, severity: "High" });
    if ((item.supplierIds ?? []).some((id) => suppliers.find((supplier) => supplier.id === id)?.status !== "Active")) qualityIssues.push({ area: "Supplier", code: item.code, issue: "Assigned supplier is inactive or missing", severity: "High" });
    const normalized = item.name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
    if (normalized && nameCounts[normalized] > 1) qualityIssues.push({ area: "Duplicate", code: item.code, issue: "Duplicate normalized item name", severity: "High" });
  });
  Object.entries(stock).forEach(([site, balances]) => Object.entries(balances).forEach(([code, qty]) => {
    if (qty < 0) qualityIssues.push({ area: "Stock", code: `${site} / ${code}`, issue: `Negative balance: ${formatQty(qty)}`, severity: "High" });
    if (qty > 0 && siteRecords.find((record) => record.code === site)?.status === "Closed") qualityIssues.push({ area: "Site", code: `${site} / ${code}`, issue: `Closed site still holds ${formatQty(qty)} units`, severity: "Medium" });
  }));
  const qualityScore = Math.max(0, Math.round(100 - (qualityIssues.length / Math.max(items.length, 1)) * 20));
  function openNew() {
    setEditor({ ...empty });
    setIsNew(true);
    setError("");
    setPhotoFile(null);
  }
  function openEdit(item: Item) {
    setEditor({ ...item, status: item.status ?? "Active" });
    setIsNew(false);
    setError("");
    setPhotoFile(null);
  }
  const normalizeName = (value: string) =>
    value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!editor) return;
    const next = {
      ...editor,
      code: editor.code.trim().toUpperCase(),
      name: editor.name.trim(),
      khmer: editor.khmer.trim(),
      category: editor.category.trim(),
      unit: editor.unit.trim(),
      min: Number(editor.min),
    };
    if (!next.code || !next.name || !next.category || !next.unit) {
      setError("Item code, English name, category and UOM are required.");
      return;
    }
    if (
      !itemCategories.includes(next.category) ||
      !itemUoms.includes(next.unit)
    ) {
      setError("Select a standard Category and UOM from the approved lists.");
      return;
    }
    if (!Number.isFinite(next.min) || next.min < 0) {
      setError("Minimum stock must be zero or more.");
      return;
    }
    if (isNew && items.some((i) => i.code.toUpperCase() === next.code)) {
      setError("This item code already exists. Use Edit instead.");
      return;
    }
    if (
      isNew &&
      items.some(
        (item) =>
          normalizeName(item.name) === normalizeName(next.name) ||
          (next.khmer &&
            item.khmer &&
            normalizeName(item.khmer) === normalizeName(next.khmer)),
      )
    ) {
      setError(
        "A matching English or Khmer item name already exists. Review the existing item instead of creating a duplicate.",
      );
      return;
    }
    setUploading(true);
    try {
      onSave(next, isNew);
      if (photoFile) {
        const optimized = await optimizeItemPhoto(photoFile);
        const response = await fetch(
          `/api/item-photo?code=${encodeURIComponent(next.code)}`,
          {
            method: "PUT",
            headers: { "Content-Type": "image/webp" },
            body: optimized,
          },
        );
        const data = await readJson<ApiError>(response);
        if (!response.ok) throw new Error(data.error || "Photo upload failed");
        setPhotoRevision((current) => ({
          ...current,
          [next.code]: Date.now(),
        }));
      }
      setEditor(null);
      setPhotoFile(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save item photo");
    } finally {
      setUploading(false);
    }
  }
  async function removePhoto() {
    if (!editor || isNew) return;
    setUploading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/item-photo?code=${encodeURIComponent(editor.code)}`,
        { method: "DELETE" },
      );
      const data = await readJson<ApiError>(response);
      if (!response.ok) throw new Error(data.error || "Unable to remove photo");
      setPhotoRevision((current) => ({
        ...current,
        [editor.code]: Date.now(),
      }));
      setPhotoFile(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to remove photo");
    } finally {
      setUploading(false);
    }
  }
  function downloadItemTemplate() {
    downloadCsv("MCB_Item_Master_Import_Template.csv", [
      [
        "Item Code",
        "English Name",
        "Khmer Name",
        "Type",
        "Category",
        "UOM",
        "Minimum Stock",
        "Supplier IDs",
        "Status",
      ],
      [
        "MAT-CEM-00001",
        "Portland Cement",
        "ស៊ីម៉ងត៍ផតឡែន",
        "Material",
        "Cement",
        "Bag",
        50,
        "SUP-001",
        "Active",
      ],
    ]);
  }
  function exportItems() {
    downloadCsv(`MCB_Item_Master_${nowDate()}.csv`, [
      [
        "Item Code",
        "English Name",
        "Khmer Name",
        "Type",
        "Category",
        "UOM",
        "Minimum Stock",
        "Supplier IDs",
        "Status",
      ],
      ...items.map((item) => [
        item.code,
        item.name,
        item.khmer,
        item.type,
        item.category,
        item.unit,
        item.min,
        (item.supplierIds ?? []).join("|"),
        item.status ?? "Active",
      ]),
    ]);
  }
  const exportItemsExcel = () => downloadXlsx(`MCB_Item_Master_${nowDate()}.xlsx`, [{ name: "Item Master", rows: [["Item Code", "English Name", "Khmer Name", "Type", "Category", "UOM", "Minimum Stock", "Supplier IDs", "Status"], ...items.map((item) => [item.code, item.name, item.khmer, item.type, item.category, item.unit, item.min, (item.supplierIds ?? []).join("|"), item.status ?? "Active"])] }]);
  async function importItems(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    setImportResult("");
    const data = parseCsv((await file.text()).replace(/^\uFEFF/, ""));
    const headers = data[0] ?? [],
      required = [
        "Item Code",
        "English Name",
        "Khmer Name",
        "Type",
        "Category",
        "UOM",
        "Minimum Stock",
        "Supplier IDs",
        "Status",
      ],
      indexes = Object.fromEntries(
        required.map((header) => [header, headers.indexOf(header)]),
      ),
      missing = required.filter((header) => indexes[header] < 0);
    if (missing.length) {
      setError(`Missing columns: ${missing.join(", ")}`);
      return;
    }
    const imported: Item[] = [],
      seenCodes = new Set(items.map((item) => item.code.toUpperCase())),
      seenNames = new Set(items.map((item) => normalizeName(item.name))),
      errors: string[] = [];
    data.slice(1).forEach((row, index) => {
      const rowNumber = index + 2,
        item: Item = {
          code: row[indexes["Item Code"]]?.trim().toUpperCase(),
          name: row[indexes["English Name"]]?.trim(),
          khmer: row[indexes["Khmer Name"]]?.trim(),
          type: row[indexes["Type"]]?.trim(),
          category: row[indexes["Category"]]?.trim(),
          unit: row[indexes["UOM"]]?.trim(),
          min: Number(row[indexes["Minimum Stock"]]),
          supplierIds: row[indexes["Supplier IDs"]]
            ?.split("|")
            .map((id) => id.trim().toUpperCase())
            .filter(Boolean),
          status:
            row[indexes["Status"]]?.trim() === "Inactive"
              ? "Inactive"
              : "Active",
        },
        normalizedName = normalizeName(item.name);
      if (!item.code || !item.name)
        errors.push(`Row ${rowNumber}: Item Code and English Name required`);
      else if (seenCodes.has(item.code))
        errors.push(`Row ${rowNumber}: duplicate Item Code ${item.code}`);
      else if (seenNames.has(normalizedName))
        errors.push(`Row ${rowNumber}: duplicate item name ${item.name}`);
      else if (!itemCategories.includes(item.category))
        errors.push(`Row ${rowNumber}: non-standard Category`);
      else if (!itemUoms.includes(item.unit))
        errors.push(`Row ${rowNumber}: non-standard UOM`);
      else if (!Number.isFinite(item.min) || item.min < 0)
        errors.push(`Row ${rowNumber}: invalid Minimum Stock`);
      else if (
        (item.supplierIds ?? []).some(
          (id) => !suppliers.some((supplier) => supplier.id === id),
        )
      )
        errors.push(`Row ${rowNumber}: unknown Supplier ID`);
      else {
        imported.push(item);
        seenCodes.add(item.code);
        seenNames.add(normalizedName);
      }
    });
    if (errors.length) {
      setError(
        `${errors.slice(0, 5).join(" • ")}${errors.length > 5 ? ` • +${errors.length - 5} more` : ""}`,
      );
      return;
    }
    imported.forEach((item) => onSave(item, true));
    setImportResult(`${imported.length} items imported successfully`);
  }
  return (
    <>
      <article className="panel">
        <div className="panel-head item-master-head">
          <div>
            <span className="eyebrow">MASTER DATA</span>
            <h3>Approved inventory items</h3>
            <small>
              {items.length} registered items · New items start at 0 stock in
              every site
            </small>
          </div>
          <div className="item-master-tools">
            <input
              className="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search code, name, type or category"
            />
            <button
              type="button"
              className="secondary"
              onClick={downloadItemTemplate}
            >
              Template
            </button>
            <label className="item-import-button">
              Import CSV
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={importItems}
              />
            </label>
            <button type="button" className="secondary" onClick={exportItems}>
              Export CSV
            </button>
            <button type="button" className="secondary" onClick={exportItemsExcel}>Export Excel</button>
            <button type="button" className={`secondary quality-button ${qualityIssues.length ? "has-issues" : ""}`} onClick={() => setQualityOpen(true)}>
              Data Quality {qualityIssues.length ? `(${qualityIssues.length})` : "✓"}
            </button>
            <button type="button" className="secondary" onClick={() => {
              const visibleCodes = filtered.map((item) => item.code), allSelected = visibleCodes.length > 0 && visibleCodes.every((code) => selectedLabels.includes(code));
              setSelectedLabels((current) => allSelected ? current.filter((code) => !visibleCodes.includes(code)) : Array.from(new Set([...current, ...visibleCodes])));
            }}>
              {filtered.length > 0 && filtered.every((item) => selectedLabels.includes(item.code)) ? "Clear Filtered" : "Select Filtered"}
            </button>
            <button type="button" className="secondary" disabled={!selectedLabels.length} onClick={() => setLabelSheetOpen(true)}>
              Print Labels ({selectedLabels.length})
            </button>
            <button type="button" className="primary" onClick={openNew}>
              + New Item
            </button>
          </div>
        </div>
        {importResult && (
          <div className="import-result success item-import-result">
            ✓ {importResult}
          </div>
        )}
        {error && !editor && <div className="form-error">{error}</div>}
        <div className="table-wrap">
          <table className="transactions-table">
            <thead>
              <tr>
                {[
                  "Select",
                  "Photo",
                  "Item Code",
                  "Item Name",
                  "Type",
                  "Category",
                  "UOM",
                  "Minimum",
                  "Suppliers",
                  "Status",
                  "Barcode",
                  "Action",
                ].map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <tr key={i.code}>
                  <td>
                    <input type="checkbox" aria-label={`Select ${i.code} for label printing`} checked={selectedLabels.includes(i.code)} onChange={(event) => setSelectedLabels((current) => event.target.checked ? [...current, i.code] : current.filter((code) => code !== i.code))} />
                  </td>
                  <td>
                    <ItemPhoto
                      code={i.code}
                      name={i.name}
                      version={photoRevision[i.code]}
                      onOpen={() => setPreviewItem(i)}
                    />
                  </td>
                  <td className="code">{i.code}</td>
                  <td>
                    <strong>{i.name}</strong>
                    <small className="khmer">{i.khmer || "—"}</small>
                  </td>
                  <td>{i.type}</td>
                  <td>{i.category}</td>
                  <td>{i.unit}</td>
                  <td>{i.min}</td>
                  <td>
                    {(i.supplierIds ?? []).length ? (
                      <strong>
                        {(i.supplierIds ?? [])
                          .map(
                            (id) =>
                              suppliers.find((supplier) => supplier.id === id)
                                ?.name ?? id,
                          )
                          .join(", ")}
                      </strong>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <span
                      className={`status ${(i.status ?? "Active") === "Active" ? "ok" : "danger"}`}
                    >
                      {i.status ?? "Active"}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="table-action"
                      onClick={() => setBarcodeItem(i)}
                    >
                      View / Print
                    </button>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="table-action"
                      onClick={() => openEdit(i)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
      {editor && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="item-editor-title"
        >
          <form className="budget-modal item-editor-modal" onSubmit={submit}>
            <span className="eyebrow">ITEM MASTER CONTROL</span>
            <h2 id="item-editor-title">
              {isNew ? "Create new item" : "Edit item"}
            </h2>
            <p>
              {isNew
                ? "The item will automatically be added to Current Stock for VLS, SSP, FPF and WH with quantity 0."
                : "The item code is locked to protect stock and transaction history."}
            </p>
            <div className="item-editor-grid">
              <section className="item-photo-editor">
                <ItemPhoto
                  code={editor.code || "NEW-ITEM"}
                  name={editor.name || "New item"}
                  version={photoRevision[editor.code]}
                  size="medium"
                  onOpen={!isNew ? () => setPreviewItem(editor) : undefined}
                />
                <div>
                  <strong>Primary item photo</strong>
                  <small>
                    JPG, PNG or WebP · maximum 5 MB · automatically optimized to
                    800 × 800
                  </small>
                  {canManagePhoto ? (
                    <div className="photo-actions">
                      <label className="photo-upload">
                        {photoFile
                          ? "Photo selected"
                          : isNew
                            ? "Choose photo"
                            : "Replace photo"}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(e) =>
                            setPhotoFile(e.target.files?.[0] || null)
                          }
                        />
                      </label>
                      {!isNew && (
                        <button
                          type="button"
                          className="photo-remove"
                          onClick={removePhoto}
                          disabled={uploading}
                        >
                          Remove photo
                        </button>
                      )}
                    </div>
                  ) : (
                    <small>Only the Developer can change item photos.</small>
                  )}
                </div>
              </section>
              <label>
                Item code
                <input
                  autoFocus
                  required
                  disabled={!isNew}
                  value={editor.code}
                  onChange={(e) =>
                    setEditor({ ...editor, code: e.target.value })
                  }
                  placeholder="MA-XX-001"
                />
              </label>
              <label>
                English name
                <input
                  required
                  value={editor.name}
                  onChange={(e) =>
                    setEditor({ ...editor, name: e.target.value })
                  }
                  placeholder="Item name"
                />
              </label>
              <label>
                Khmer name
                <input
                  value={editor.khmer}
                  onChange={(e) =>
                    setEditor({ ...editor, khmer: e.target.value })
                  }
                  placeholder="ឈ្មោះទំនិញ"
                />
              </label>
              <label>
                Type
                <select
                  value={editor.type}
                  onChange={(e) =>
                    setEditor({ ...editor, type: e.target.value })
                  }
                >
                  <option>Material</option>
                  <option>Accessories</option>
                  <option>Small Tools</option>
                  <option>Equipment</option>
                </select>
              </label>
              <label>
                Category
                <select
                  required
                  value={editor.category}
                  onChange={(e) =>
                    setEditor({ ...editor, category: e.target.value })
                  }
                >
                  <option value="">Select standard category</option>
                  {itemCategories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>
              <label>
                Unit of measure
                <select
                  required
                  value={editor.unit}
                  onChange={(e) =>
                    setEditor({ ...editor, unit: e.target.value })
                  }
                >
                  {itemUoms.map((unit) => (
                    <option key={unit}>{unit}</option>
                  ))}
                </select>
              </label>
              <label>
                Minimum stock
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={editor.min}
                  onChange={(e) =>
                    setEditor({ ...editor, min: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                Status
                <select
                  value={editor.status ?? "Active"}
                  onChange={(e) =>
                    setEditor({
                      ...editor,
                      status: e.target.value as "Active" | "Inactive",
                    })
                  }
                >
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </label>
              <fieldset className="site-assignment-field supplier-assignment-field">
                <legend>Approved suppliers</legend>
                <div>
                  {suppliers
                    .filter((supplier) => supplier.status === "Active")
                    .map((supplier) => (
                      <label key={supplier.id}>
                        <input
                          type="checkbox"
                          checked={(editor.supplierIds ?? []).includes(
                            supplier.id,
                          )}
                          onChange={(e) =>
                            setEditor({
                              ...editor,
                              supplierIds: e.target.checked
                                ? [...(editor.supplierIds ?? []), supplier.id]
                                : (editor.supplierIds ?? []).filter(
                                    (id) => id !== supplier.id,
                                  ),
                            })
                          }
                        />
                        {supplier.id} · {supplier.name}
                      </label>
                    ))}
                </div>
              </fieldset>
            </div>
            {error && <div className="form-error">{error}</div>}
            <div className="modal-warning">
              {isNew
                ? "Saving creates zero-balance stock lines. Use Opening Balance or Stock In to enter the real quantity."
                : "Inactive items remain visible in history and Current Stock."}
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setEditor(null)}
              >
                Cancel
              </button>
              <button type="submit" className="confirm" disabled={uploading}>
                {uploading ? "Saving…" : isNew ? "Create item" : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}
      {previewItem && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setPreviewItem(null)}
        >
          <section
            className="budget-modal item-photo-preview"
            onClick={(e) => e.stopPropagation()}
          >
            <ItemPhoto
              code={previewItem.code}
              name={previewItem.name}
              version={photoRevision[previewItem.code]}
              size="medium"
            />
            <h2>{previewItem.name}</h2>
            <p>
              {previewItem.code} · {previewItem.khmer || "No Khmer name"}
            </p>
            <button
              type="button"
              className="secondary"
              onClick={() => setPreviewItem(null)}
            >
              Close
            </button>
          </section>
        </div>
      )}
      {barcodeItem && (
        <div
          className="modal-backdrop barcode-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setBarcodeItem(null)}
        >
          <section
            className="budget-modal barcode-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="barcode-label">
              <span className="barcode-company">MCB INVENTORY CONTROL</span>
              <div className="label-codes"><ItemBarcode code={barcodeItem.code} /><ItemQrCode code={barcodeItem.code} /></div>
              <strong>{barcodeItem.name}</strong>
              <small>
                {barcodeItem.category} · {barcodeItem.unit}
              </small>
            </div>
            <div className="modal-actions barcode-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setBarcodeItem(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="confirm"
                onClick={() => window.print()}
              >
                Print barcode label
              </button>
            </div>
          </section>
        </div>
      )}
      {labelSheetOpen && (
        <div className="modal-backdrop label-sheet-backdrop" role="dialog" aria-modal="true" onClick={() => setLabelSheetOpen(false)}>
          <section className="budget-modal label-sheet-modal" onClick={(event) => event.stopPropagation()}>
            <div className="panel-head label-sheet-heading"><div><span className="eyebrow">LABEL SHEET</span><h3>{selectedLabels.length} item labels ready</h3></div></div>
            <div className="label-sheet">
              {selectedLabels.map((code) => {
                const item = items.find((entry) => entry.code === code);
                if (!item) return null;
                return <div className="barcode-label compact" key={code}>
                  <span className="barcode-company">MCB INVENTORY CONTROL</span>
                  <div className="label-codes"><ItemBarcode code={item.code} /><ItemQrCode code={item.code} /></div>
                  <strong>{item.name}</strong>
                  <small>{item.code} · {item.category} · {item.unit}</small>
                </div>;
              })}
            </div>
            <div className="modal-actions barcode-actions"><button type="button" className="secondary" onClick={() => setLabelSheetOpen(false)}>Close</button><button type="button" className="confirm" onClick={() => window.print()}>Print label sheet</button></div>
          </section>
        </div>
      )}
      {qualityOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={() => setQualityOpen(false)}>
          <section className="modal-card data-quality-modal" onClick={(event) => event.stopPropagation()}>
            <div className="panel-head"><div><span className="eyebrow">MASTER DATA CONTROL</span><h3>Data Quality Center</h3><small>Checks items, supplier links, QS codes, stock and closed sites.</small></div><button type="button" className="secondary" onClick={() => setQualityOpen(false)}>Close</button></div>
            <div className="quality-summary"><div><small>QUALITY SCORE</small><strong>{qualityScore}%</strong></div><div><small>HIGH PRIORITY</small><strong>{qualityIssues.filter((issue) => issue.severity === "High").length}</strong></div><div><small>REVIEW</small><strong>{qualityIssues.filter((issue) => issue.severity === "Medium").length}</strong></div><div><small>TOTAL CHECKS</small><strong>{items.length + Object.keys(stock).length}</strong></div></div>
            {qualityIssues.length ? <div className="quality-issue-list">{qualityIssues.map((issue, index) => <div key={`${issue.area}-${issue.code}-${index}`}><span className={`quality-severity ${issue.severity.toLowerCase()}`}>{issue.severity}</span><div><strong>{issue.area} · {issue.code}</strong><small>{issue.issue}</small></div>{items.some((item) => item.code === issue.code) && <button type="button" className="table-action" onClick={() => { const item = items.find((entry) => entry.code === issue.code); if (item) { setQualityOpen(false); openEdit(item); } }}>Fix item</button>}</div>)}</div> : <div className="quality-clear"><b>✓</b><strong>No data-quality problems found</strong><small>All current master-data and stock checks passed.</small></div>}
          </section>
        </div>
      )}
    </>
  );
}
function StockCountModule({
  sessions,
  setSessions,
  stock,
  accessibleSites,
  setStock,
  setTransactions,
  user,
  role,
  flash,
}: {
  sessions: StockCountSession[];
  setSessions: React.Dispatch<React.SetStateAction<StockCountSession[]>>;
  stock: Stock;
  accessibleSites: string[];
  setStock: React.Dispatch<React.SetStateAction<Stock>>;
  setTransactions: React.Dispatch<React.SetStateAction<Tx[]>>;
  user: string;
  role: Role;
  flash: (message: string) => void;
}) {
  const [site, setSite] = useState(accessibleSites[0] ?? ""),
    [activeId, setActiveId] = useState(""),
    [note, setNote] = useState(""),
    [report, setReport] = useState<StockCountSession | null>(null);
  const active = sessions.find((session) => session.id === activeId);
  const canCount = ["Developer", "Stock Controller", "Stockkeeper"].includes(role);
  const canApprove = ["Stock Controller", "Developer"].includes(role);
  function createSession() {
    const session: StockCountSession = {
      id: `COUNT-${nowDate().replaceAll("-", "")}-${String(sessions.length + 1).padStart(3, "0")}`,
      site,
      createdAt: new Date().toISOString(),
      createdBy: user,
      status: "Draft",
      lines: items
        .filter(
          (item) =>
            (item.status ?? "Active") === "Active" &&
            Object.prototype.hasOwnProperty.call(stock[site] ?? {}, item.code),
        )
        .map((item) => ({
          code: item.code,
          systemQty: stock[site]?.[item.code] ?? 0,
          physicalQty: null,
        })),
    };
    setSessions((list) => [session, ...list]);
    setActiveId(session.id);
    flash("Stock count session created");
  }
  function setPhysical(code: string, value: string) {
    setSessions((list) =>
      list.map((session) =>
        session.id === activeId
          ? {
              ...session,
              lines: session.lines.map((line) =>
                line.code === code
                  ? {
                      ...line,
                      physicalQty:
                        value === "" ? null : Math.max(0, Number(value)),
                    }
                  : line,
              ),
            }
          : session,
      ),
    );
  }
  function submitCount() {
    if (!active || active.lines.some((line) => line.physicalQty === null)) {
      flash("Enter the physical quantity for every item");
      return;
    }
    const hasVariance = active.lines.some((line) => line.physicalQty !== line.systemQty);
    setSessions((list) =>
      list.map((session) =>
        session.id === active.id
          ? {
              ...session,
              status: hasVariance ? "Pending Recount" : "Pending",
              submittedAt: new Date().toISOString(),
            }
          : session,
      ),
    );
    flash(hasVariance ? "First count submitted. Variance-only recount required." : "Count submitted for Stock Controller review");
  }
  function startRecount() {
    if (!active || active.status !== "Pending Recount") return;
    setSessions((list) => list.map((session) => session.id === active.id ? { ...session, status: "Recount" } : session));
    flash("Variance-only recount started");
  }
  function setRecount(code: string, value: string) {
    setSessions((list) => list.map((session) => session.id === activeId ? {
      ...session,
      lines: session.lines.map((line) => line.code === code ? { ...line, recountQty: value === "" ? null : Math.max(0, Number(value)) } : line),
    } : session));
  }
  function submitRecount() {
    if (!active || active.status !== "Recount") return;
    const varianceLines = active.lines.filter((line) => line.physicalQty !== line.systemQty);
    if (varianceLines.some((line) => line.recountQty == null)) {
      flash("Recount every variance item before submission");
      return;
    }
    setSessions((list) => list.map((session) => session.id === active.id ? { ...session, status: "Pending", submittedAt: new Date().toISOString() } : session));
    flash("Variance recount submitted for Stock Controller review");
  }
  function decide(approved: boolean) {
    if (!active || active.status !== "Pending" || !note.trim()) {
      flash("Enter an approval or rejection note");
      return;
    }
    if (
      approved &&
      active.lines.some(
        (line) => (stock[active.site]?.[line.code] ?? 0) !== line.systemQty,
      )
    ) {
      flash("Stock changed after counting. Create a new count session.");
      return;
    }
    const decided: StockCountSession = {
      ...active,
      status: approved ? "Approved" : "Rejected",
      decidedAt: new Date().toISOString(),
      decidedBy: user,
      decisionNote: note.trim(),
    };
    if (approved) {
      setStock((previous) => ({
        ...previous,
        [active.site]: {
          ...previous[active.site],
          ...Object.fromEntries(
            active.lines.map((line) => [
              line.code,
              line.recountQty ?? line.physicalQty ?? line.systemQty,
            ]),
          ),
        },
      }));
      const varianceTransactions = active.lines
        .filter(
          (line) => (line.recountQty ?? line.physicalQty ?? line.systemQty) !== line.systemQty,
        )
        .map((line) => ({
          id: uid(),
          date: nowDate(),
          type: "STOCK COUNT VARIANCE",
          site: active.site,
          other: "",
          code: line.code,
          qty: (line.recountQty ?? line.physicalQty ?? line.systemQty) - line.systemQty,
          by: user,
          status: "Approved",
          reference: active.id,
          reason: note.trim(),
          timestamp: new Date().toISOString(),
          previousQty: line.systemQty,
          newQty: line.recountQty ?? line.physicalQty ?? line.systemQty,
        }));
      setTransactions((list) => [...varianceTransactions, ...list]);
    }
    setSessions((list) =>
      list.map((session) => (session.id === active.id ? decided : session)),
    );
    setNote("");
    setReport(decided);
    flash(
      approved
        ? "Count approved and stock updated"
        : "Count rejected; stock unchanged",
    );
  }
  const shortages =
      active?.lines.filter(
        (line) =>
          line.physicalQty !== null && line.physicalQty < line.systemQty,
      ).length ?? 0,
    surpluses =
      active?.lines.filter(
        (line) =>
          line.physicalQty !== null && line.physicalQty > line.systemQty,
      ).length ?? 0;
  return (
    <>
      <div className="stock-count-layout">
        <article className="panel stock-count-list">
          <div className="panel-head">
            <div>
              <span className="eyebrow">CONTROLLED STOCKTAKE</span>
              <h3>Counting sessions</h3>
            </div>
            {canCount && (
              <div className="stock-count-create">
                <select value={site} onChange={(e) => setSite(e.target.value)}>
                  {accessibleSites.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
                <button className="primary" onClick={createSession}>
                  + New count
                </button>
              </div>
            )}
          </div>
          {sessions.length ? (
            <div className="count-session-cards">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  className={activeId === session.id ? "active" : ""}
                  onClick={() => setActiveId(session.id)}
                >
                  <strong>{session.id}</strong>
                  <span>
                    {session.site} ·{" "}
                    {new Date(session.createdAt).toLocaleDateString()}
                  </span>
                  <small
                    className={`status ${session.status === "Approved" ? "ok" : session.status === "Rejected" ? "danger" : "warn"}`}
                  >
                    {session.status}
                  </small>
                </button>
              ))}
            </div>
          ) : (
            <Empty text="No stock count sessions yet." />
          )}
        </article>
        {active && (
          <article className="panel stock-count-sheet">
            <div className="panel-head">
              <div>
                <span className="eyebrow">
                  {active.site} · {active.id}
                </span>
                <h3>{active.status === "Draft" ? "Blind physical count" : active.status === "Recount" ? "Variance-only recount" : "System quantity versus physical count"}</h3>
                <small>
                  {active.status === "Draft" ? "System quantity and variance stay hidden until submission." : `${shortages} shortages · ${surpluses} surpluses`}
                </small>
              </div>
              <span
                className={`status ${active.status === "Approved" ? "ok" : active.status === "Rejected" ? "danger" : "warn"}`}
              >
                {active.status}
              </span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>System Qty</th>
                    <th>1st Count</th>
                    <th>Recount</th>
                    <th>Final Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {active.lines.map((line) => {
                    const variance =
                      line.physicalQty === null
                        ? null
                        : (line.recountQty ?? line.physicalQty) - line.systemQty;
                    return (
                      <tr key={line.code}>
                        <td>
                          <strong>{itemName(line.code)}</strong>
                          <small className="code">{line.code}</small>
                        </td>
                        <td className="qty">{active.status === "Draft" ? "Hidden" : formatQty(line.systemQty)}</td>
                        <td>
                          {active.status === "Draft" && canCount ? (
                            <input
                              className="count-input"
                              type="number"
                              min="0"
                              step="any"
                              value={line.physicalQty ?? ""}
                              onChange={(e) =>
                                setPhysical(line.code, e.target.value)
                              }
                            />
                          ) : line.physicalQty === null ? (
                            "—"
                          ) : (
                            formatQty(line.physicalQty)
                          )}
                        </td>
                        <td>
                          {active.status === "Recount" && line.physicalQty !== line.systemQty && canCount ? (
                            <input className="count-input" type="number" min="0" step="any" value={line.recountQty ?? ""} onChange={(e) => setRecount(line.code, e.target.value)} />
                          ) : line.recountQty == null ? "—" : formatQty(line.recountQty)}
                        </td>
                        <td
                          className={
                            variance !== null && variance < 0
                              ? "negative qty"
                              : variance
                                ? "positive qty"
                                : "qty"
                          }
                        >
                          {active.status === "Draft"
                            ? "Hidden"
                            : variance === null
                              ? "—"
                              : `${variance > 0 ? "+" : ""}${formatQty(variance)}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="count-actions">
              {active.status === "Draft" && canCount && (
                <button className="primary" onClick={submitCount}>
                  Submit full count
                </button>
              )}
              {active.status === "Pending Recount" && canCount && (
                <button className="primary" onClick={startRecount}>Start variance recount</button>
              )}
              {active.status === "Recount" && canCount && (
                <button className="primary" onClick={submitRecount}>Submit recount</button>
              )}
              {active.status === "Pending" && canApprove && (
                <>
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Required decision note"
                  />
                  <button
                    className="secondary count-reject"
                    onClick={() => decide(false)}
                  >
                    Reject
                  </button>
                  <button className="primary" onClick={() => decide(true)}>
                    Approve & update stock
                  </button>
                </>
              )}
              {["Approved", "Rejected"].includes(active.status) && (
                <button className="secondary" onClick={() => setReport(active)}>
                  Signed variance report
                </button>
              )}
            </div>
          </article>
        )}
      </div>
      {report && (
        <div
          className="modal-backdrop count-report-backdrop"
          onClick={() => setReport(null)}
        >
          <section
            className="budget-modal count-report"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="count-report-print">
              <h2>MCB Stock Count Variance Report</h2>
              <p>
                {report.id} · Site {report.site} ·{" "}
                {new Date(report.createdAt).toLocaleDateString()}
              </p>
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Material</th>
                    <th>System</th>
                    <th>Physical</th>
                    <th>Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {report.lines.map((line) => (
                    <tr key={line.code}>
                      <td>{line.code}</td>
                      <td>{itemName(line.code)}</td>
                      <td>{formatQty(line.systemQty)}</td>
                      <td>{formatQty(line.recountQty ?? line.physicalQty ?? line.systemQty)}</td>
                      <td>
                        {formatQty(
                          (line.recountQty ?? line.physicalQty ?? line.systemQty) - line.systemQty,
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="report-signatures">
                <span>
                  Counted by<strong>{report.createdBy}</strong>
                </span>
                <span>
                  Approved / Reviewed by
                  <strong>{report.decidedBy ?? "Pending"}</strong>
                </span>
              </div>
              <p>
                Decision: {report.status} · {report.decisionNote}
              </p>
            </div>
            <div className="modal-actions">
              <button className="secondary" onClick={() => setReport(null)}>
                Close
              </button>
              <button className="confirm" onClick={() => window.print()}>
                Print signed report
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function CurrentStock({
  stock,
  setStock,
  siteFilter,
  accessibleSites,
  setTransactions,
  user,
  role,
  adjustments,
  setAdjustments,
  canEdit,
  flash,
}: {
  stock: Stock;
  setStock: React.Dispatch<React.SetStateAction<Stock>>;
  siteFilter: string;
  accessibleSites: string[];
  setTransactions: React.Dispatch<React.SetStateAction<Tx[]>>;
  user: string;
  role: Role;
  adjustments: StockAdjustment[];
  setAdjustments: React.Dispatch<React.SetStateAction<StockAdjustment[]>>;
  canEdit: boolean;
  flash: (m: string) => void;
}) {
  const [openingSite, setOpeningSite] = useState(
      siteFilter === "ALL SITES" || siteFilter === "ALL ASSIGNED SITES"
        ? accessibleSites[0] ?? ""
        : siteFilter,
    ),
    [code, setCode] = useState(items[0].code),
    [qty, setQty] = useState(""),
    [reference, setReference] = useState(""),
    [reason, setReason] = useState(""),
    [q, setQ] = useState(""),
    [onlyActive, setOnlyActive] = useState(false),
    [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({}),
    [drafts, setDrafts] = useState<
      Array<{
        site: string;
        code: string;
        qty: number;
        previousQty: number;
        reference: string;
        reason: string;
      }>
    >([]);
  const allRows = (siteFilter === "ALL SITES"
    ? sites
    : siteFilter === "ALL ASSIGNED SITES"
      ? accessibleSites
      : accessibleSites.includes(siteFilter)
        ? [siteFilter]
        : []).flatMap((s) =>
    items
      .filter((i) => Object.prototype.hasOwnProperty.call(stock[s] ?? {}, i.code))
      .map((i) => ({ site: s, item: i, qty: stock[s]?.[i.code] ?? 0 })),
  );
  const rows = allRows.filter(
    (r) =>
      (!onlyActive || r.qty > 0) &&
      `${r.site} ${r.item.code} ${r.item.name} ${r.item.khmer}`
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  const stockExportRows: Array<Array<string | number>> = [["Site", "Item Code", "Item", "Khmer Name", "Category", "UOM", "Minimum", "On Hand", "Status"], ...rows.map((row) => [row.site, row.item.code, row.item.name, row.item.khmer, row.item.category, row.item.unit, row.item.min, row.qty, row.qty <= 0 ? "OUT OF STOCK" : row.qty <= row.item.min ? "LOW STOCK" : "AVAILABLE"])];
  const selectedItem = items.find((i) => i.code === code)!;
  const currentQty = stock[openingSite]?.[code] ?? 0;
  function addDraft(e: FormEvent) {
    e.preventDefault();
    const n = Number(qty),
      cleanReference = reference.trim(),
      cleanReason = reason.trim();
    if (n < 0 || qty === "" || !cleanReference || !cleanReason) return;
    setDrafts((p) => [
      ...p.filter((d) => !(d.site === openingSite && d.code === code)),
      {
        site: openingSite,
        code,
        qty: n,
        previousQty: currentQty,
        reference: cleanReference,
        reason: cleanReason,
      },
    ]);
    setQty("");
    setReference("");
    setReason("");
    flash("Counted balance added to adjustment batch");
  }
  function postBatch() {
    if (!drafts.length) return;
    const requests: StockAdjustment[] = drafts.map((d) => ({
      id: uid(),
      site: d.site,
      code: d.code,
      previousQty: d.previousQty,
      requestedQty: d.qty,
      reference: d.reference,
      reason: d.reason,
      requestedBy: user,
      requestedAt: new Date().toISOString(),
      status: "Pending",
    }));
    setAdjustments((current) => [...requests, ...current]);
    setDrafts([]);
    flash(`${requests.length} stock adjustments submitted for approval`);
  }
  function decideAdjustment(
    request: StockAdjustment,
    decision: "Approved" | "Rejected",
  ) {
    const note = (decisionNotes[request.id] || "").trim();
    if (decision === "Rejected" && !note) {
      flash("Enter a rejection reason first");
      return;
    }
    if (
      decision === "Approved" &&
      (stock[request.site]?.[request.code] ?? 0) !== request.previousQty
    ) {
      flash(
        "Stock changed after this request. Reject it and submit a new count.",
      );
      return;
    }
    const decidedAt = new Date().toISOString();
    if (decision === "Approved") {
      setStock((current) => ({
        ...current,
        [request.site]: {
          ...current[request.site],
          [request.code]: request.requestedQty,
        },
      }));
      setTransactions((current) => [
        {
          id: uid(),
          date: nowDate(),
          type: "STOCK ADJUSTMENT",
          site: request.site,
          other: "",
          code: request.code,
          qty: request.requestedQty - request.previousQty,
          previousQty: request.previousQty,
          newQty: request.requestedQty,
          reason: request.reason,
          reference: request.reference,
          person: request.requestedBy,
          by: user,
          status: "Approved",
          timestamp: decidedAt,
        },
        ...current,
      ]);
    }
    setAdjustments((current) =>
      current.map((item) =>
        item.id === request.id
          ? {
              ...item,
              status: decision,
              decidedBy: user,
              decidedAt,
              decisionNote: note,
            }
          : item,
      ),
    );
    setDecisionNotes((current) => ({ ...current, [request.id]: "" }));
    flash(
      decision === "Approved"
        ? "Adjustment approved and stock updated"
        : "Adjustment rejected without changing stock",
    );
  }
  return (
    <div className="stock-page">
      {canEdit && (
        <>
          <form
            className="panel opening-card adjustment-card"
            onSubmit={addDraft}
          >
            <div>
              <span className="eyebrow">CONTROLLED BALANCE ENTRY</span>
              <h3>Opening balance & adjustment</h3>
              <p>
                Enter the verified physical count. The system posts only the
                difference and keeps the old and new quantities in the audit
                trail.
              </p>
            </div>
            <label>
              Site
              <select
                value={openingSite}
                onChange={(e) => setOpeningSite(e.target.value)}
              >
                {accessibleSites.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Item
              <select value={code} onChange={(e) => setCode(e.target.value)}>
                {items.map((i) => (
                  <option key={i.code} value={i.code}>
                    {i.code} — {i.name} | {i.khmer}
                  </option>
                ))}
              </select>
            </label>
            <div className="selected-item-photo">
              <ItemPhoto
                code={selectedItem.code}
                name={selectedItem.name}
                size="medium"
              />
              <small>Selected item</small>
            </div>
            <label>
              Current Qty
              <input
                readOnly
                value={`${formatQty(currentQty)} ${selectedItem.unit}`}
              />
            </label>
            <label>
              Verified Count ({selectedItem.unit})
              <input
                type="number"
                min="0"
                step="any"
                required
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="Physical count"
              />
            </label>
            <label>
              Reference
              <input
                required
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="COUNT-2026-001"
              />
            </label>
            <label>
              Reason
              <input
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Opening correction / count variance"
              />
            </label>
            <button className="primary">Add to batch</button>
          </form>
          {drafts.length > 0 && (
            <article className="panel opening-batch">
              <div className="batch-title">
                <div>
                  <span className="eyebrow">PENDING BATCH</span>
                  <h3>{drafts.length} controlled balances ready</h3>
                </div>
                <button className="primary" onClick={postBatch}>
                  Submit for approval
                </button>
              </div>
              <div className="batch-chips">
                {drafts.map((d) => (
                  <span key={`${d.site}-${d.code}`}>
                    <b>{d.site}</b> {d.code} · {formatQty(d.previousQty)} →{" "}
                    {formatQty(d.qty)} ({d.qty - d.previousQty > 0 ? "+" : ""}
                    {formatQty(d.qty - d.previousQty)})
                    <button
                      onClick={() => setDrafts((p) => p.filter((x) => x !== d))}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </article>
          )}
        </>
      )}
      <article className="panel adjustment-approval-panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">STOCK ADJUSTMENT CONTROL</span>
            <h3>Approval register</h3>
            <small>
              Stock changes only after Stock Controller approval. The Developer can intervene only for controlled recovery.
            </small>
          </div>
          <span className="record-count">
            {adjustments.filter((a) => a.status === "Pending").length} pending
          </span>
        </div>
        {adjustments.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {[
                    "Requested",
                    "Site",
                    "Item",
                    "Reference / Reason",
                    "Before",
                    "Requested",
                    "Variance",
                    "Requested By",
                    "Decision",
                    "Status",
                  ].map((heading) => (
                    <th key={heading}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {adjustments.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <strong>
                        {new Date(request.requestedAt).toLocaleDateString(
                          "en-GB",
                        )}
                      </strong>
                      <small>
                        {new Date(request.requestedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </small>
                    </td>
                    <td>
                      <span className="site-tag">{request.site}</span>
                    </td>
                    <td>
                      <strong>
                        {items.find((i) => i.code === request.code)?.name ||
                          request.code}
                      </strong>
                      <small className="code">{request.code}</small>
                    </td>
                    <td>
                      <strong>{request.reference}</strong>
                      <small>{request.reason}</small>
                    </td>
                    <td className="qty">{formatQty(request.previousQty)}</td>
                    <td className="qty">{formatQty(request.requestedQty)}</td>
                    <td
                      className={
                        request.requestedQty - request.previousQty < 0
                          ? "negative qty"
                          : "positive qty"
                      }
                    >
                      {request.requestedQty - request.previousQty > 0
                        ? "+"
                        : ""}
                      {formatQty(request.requestedQty - request.previousQty)}
                    </td>
                    <td>{request.requestedBy}</td>
                    <td>
                      {request.status === "Pending" &&
                      ["Admin", "Developer", "Management"].includes(role) ? (
                        <div className="approval-actions">
                          <input
                            value={decisionNotes[request.id] || ""}
                            onChange={(e) =>
                              setDecisionNotes((current) => ({
                                ...current,
                                [request.id]: e.target.value,
                              }))
                            }
                            placeholder="Decision note / rejection reason"
                          />
                          <button
                            type="button"
                            className="approve"
                            onClick={() =>
                              decideAdjustment(request, "Approved")
                            }
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="reject"
                            onClick={() =>
                              decideAdjustment(request, "Rejected")
                            }
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span>
                          {request.decisionNote ||
                            request.decidedBy ||
                            "Waiting for review"}
                        </span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`status ${request.status === "Approved" ? "ok" : request.status === "Rejected" ? "danger" : "warn"}`}
                      >
                        {request.status}
                      </span>
                      {request.decidedBy && (
                        <small>By {request.decidedBy}</small>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text="No stock adjustment requests yet." />
        )}
      </article>
      <article className="panel">
        <div className="panel-head register-head">
          <div>
            <span className="eyebrow">LIVE BALANCES</span>
            <h3>Stock on hand by site</h3>
          </div>
          <div className="register-tools">
            <input
              className="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search item, code or Khmer name"
            />
            <label className="toggle-filter">
              <input
                type="checkbox"
                checked={onlyActive}
                onChange={(e) => setOnlyActive(e.target.checked)}
              />
              <span />
              In stock only
            </label>
            <button type="button" className="secondary" onClick={() => downloadCsv(`MCB_Current_Stock_${nowDate()}.csv`, stockExportRows)}>Export CSV</button>
            <button type="button" className="secondary" onClick={() => downloadXlsx(`MCB_Current_Stock_${nowDate()}.xlsx`, [{ name: "Current Stock", rows: stockExportRows }])}>Export Excel</button>
            <span className="record-count">{rows.length} records</span>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {[
                  "Photo",
                  "Site",
                  "Item Code",
                  "Item Name",
                  "UOM",
                  "On Hand",
                  "Minimum",
                  "Status",
                ].map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.site}-${r.item.code}`}>
                  <td>
                    <ItemPhoto code={r.item.code} name={r.item.name} />
                  </td>
                  <td>
                    <span className="site-tag">{r.site}</span>
                  </td>
                  <td className="code">{r.item.code}</td>
                  <td>
                    <strong>{r.item.name}</strong>
                    <small className="khmer">{r.item.khmer}</small>
                  </td>
                  <td>{r.item.unit}</td>
                  <td className="qty">{formatQty(r.qty)}</td>
                  <td>{r.item.min}</td>
                  <td>
                    <StockStatus qty={r.qty} min={r.item.min} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}

function BomControl({
  accessibleSites,
  rows,
  setRows,
  transactions,
  canEdit,
  flash,
  costCodeLinks,
  setCostCodeLinks,
}: {
  accessibleSites: string[];
  rows: BomLine[];
  setRows: React.Dispatch<React.SetStateAction<BomLine[]>>;
  transactions: Tx[];
  canEdit: boolean;
  flash: (m: string) => void;
  costCodeLinks: CostCodeLink[];
  setCostCodeLinks: React.Dispatch<React.SetStateAction<CostCodeLink[]>>;
}) {
  const defaultLevel3 =
    costCodeLevel3.find((entry) => entry.code === "A02-04") ??
    costCodeLevel3[0];
  const [site, setSite] = useState(accessibleSites[0] ?? ""),
    [level2, setLevel2] = useState(defaultLevel3.parent),
    [costCode, setCostCode] = useState(defaultLevel3.code),
    [code, setCode] = useState(items[0].code),
    [approved, setApproved] = useState(""),
    [rate, setRate] = useState(""),
    [editingId, setEditingId] = useState<string | null>(null),
    [importMessage, setImportMessage] = useState(""),
    [importError, setImportError] = useState(""),
    [linkItemCode, setLinkItemCode] = useState(items[0].code);
  function addLine(e: FormEvent) {
    e.preventDefault();
    const q = Number(approved),
      r = Number(rate),
      normalized = costCode.trim().toUpperCase();
    if (
      !normalized ||
      q <= 0 ||
      r < 0 ||
      !linkedMaterials.some((item) => item.code === code)
    ) {
      setImportError(
        "Select a material linked to the chosen Level 3 Cost Code.",
      );
      return;
    }
    setImportError("");
    if (editingId) {
      setRows((p) =>
        p.map((line) =>
          line.id === editingId
            ? {
                ...line,
                site,
                costCode: normalized,
                code,
                approvedQty: q,
                rate: r,
                approvedBy: "Current QS",
              }
            : line,
        ),
      );
      flash("BOM revision approved");
    } else {
      setRows((p) => [
        ...p,
        {
          id: uid(),
          site,
          costCode: normalized,
          code,
          originalQty: q,
          approvedQty: q,
          rate: r,
          approvedBy: "Current QS",
        },
      ]);
      flash("Approved BOM line added");
    }
    setLevel2(defaultLevel3.parent);
    setCostCode(defaultLevel3.code);
    setCode(
      initialCostCodeLinks.find((link) => link.costCode === defaultLevel3.code)
        ?.itemCode ?? "",
    );
    setApproved("");
    setRate("");
    setEditingId(null);
  }
  function revise(line: BomLine) {
    setEditingId(line.id);
    setSite(line.site);
    setLevel2(
      costCodeLevel3.find((entry) => entry.code === line.costCode)?.parent ??
        costCodeLevel2[0].code,
    );
    setCostCode(line.costCode);
    setCode(line.code);
    setApproved(String(line.approvedQty));
    setRate(String(line.rate));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function downloadTemplate() {
    downloadCsv("MCB_BOM_Import_Template.csv", [
      [
        "Site",
        "QS Cost Code Level 2",
        "QS Cost Code Level 3",
        "Item Code",
        "Original BOM Qty",
        "Approved BOM Qty",
        "Budget Rate USD",
        "Approved By",
      ],
      ["VLS", "A02", "A02-04", "MA-AG-001", 20, 15, 15, "QS Manager"],
    ]);
  }
  async function importBom(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImportError("");
    setImportMessage("");
    const data = parseCsv((await file.text()).replace(/^\uFEFF/, ""));
    if (data.length < 2) {
      setImportError("The file has no BOM data rows.");
      return;
    }
    const headers = data[0].map((h) => h.trim());
    const required = [
      "Site",
      "QS Cost Code Level 2",
      "QS Cost Code Level 3",
      "Item Code",
      "Original BOM Qty",
      "Approved BOM Qty",
      "Budget Rate USD",
      "Approved By",
    ];
    const index = Object.fromEntries(
      required.map((h) => [h, headers.indexOf(h)]),
    );
    const missing = required.filter((h) => index[h] < 0);
    if (missing.length) {
      setImportError(`Missing columns: ${missing.join(", ")}`);
      return;
    }
    const imported: BomLine[] = [],
      errors: string[] = [];
    data.slice(1).forEach((r, n) => {
      const rowNo = n + 2,
        siteValue = r[index["Site"]]?.toUpperCase(),
        parentCost = r[index["QS Cost Code Level 2"]]?.toUpperCase(),
        cost = r[index["QS Cost Code Level 3"]]?.toUpperCase(),
        itemCode = r[index["Item Code"]]?.toUpperCase(),
        original = Number(r[index["Original BOM Qty"]]),
        approvedQty = Number(r[index["Approved BOM Qty"]]),
        budgetRate = Number(r[index["Budget Rate USD"]]),
        approvedBy = r[index["Approved By"]] || "Imported";
      if (!sites.includes(siteValue)) errors.push(`Row ${rowNo}: invalid Site`);
      else if (!items.some((i) => i.code === itemCode))
        errors.push(`Row ${rowNo}: unknown Item Code`);
      else if (!costCodeLevel2.some((entry) => entry.code === parentCost))
        errors.push(`Row ${rowNo}: unknown Level 2 Cost Code`);
      else if (
        !costCodeLevel3.some(
          (entry) => entry.code === cost && entry.parent === parentCost,
        )
      )
        errors.push(`Row ${rowNo}: Level 3 does not belong to Level 2`);
      else if (
        !costCodeLinks.some(
          (link) => link.costCode === cost && link.itemCode === itemCode,
        )
      )
        errors.push(
          `Row ${rowNo}: Material Code is not linked to this Level 3 Cost Code`,
        );
      else if (original <= 0 || approvedQty <= 0 || budgetRate < 0)
        errors.push(`Row ${rowNo}: invalid quantity or rate`);
      else
        imported.push({
          id: uid(),
          site: siteValue,
          costCode: cost,
          code: itemCode,
          originalQty: original,
          approvedQty,
          rate: budgetRate,
          approvedBy,
        });
    });
    if (errors.length) {
      setImportError(
        `${errors.slice(0, 4).join(" • ")}${errors.length > 4 ? ` • +${errors.length - 4} more` : ""}`,
      );
      return;
    }
    setRows((prev) => {
      const map = new Map(
        prev.map((line) => [
          `${line.site}|${line.costCode}|${line.code}`,
          line,
        ]),
      );
      imported.forEach((line) => {
        const key = `${line.site}|${line.costCode}|${line.code}`,
          old = map.get(key);
        map.set(key, old ? { ...old, ...line, id: old.id } : line);
      });
      return Array.from(map.values());
    });
    setImportMessage(`${imported.length} BOM rows imported successfully.`);
    flash("BOM import completed");
  }
  const enriched = rows.map((line) => {
    const used = transactions
      .filter(
        (t) =>
          t.type === "STOCK OUT" &&
          t.site === line.site &&
          t.code === line.code &&
          t.costCode === line.costCode,
      )
      .reduce((a, t) => a + Math.abs(t.qty), 0);
    return {
      ...line,
      used,
      balance: line.approvedQty - used,
      utilization: Math.round(
        (used / Math.max(line.approvedQty, 0.0001)) * 100,
      ),
    };
  });
  const approvedValue = enriched.reduce(
      (a, r) => a + r.approvedQty * r.rate,
      0,
    ),
    usedValue = enriched.reduce((a, r) => a + r.used * r.rate, 0),
    over = enriched.filter((r) => r.balance < 0).length,
    selectedLevel2 = costCodeLevel2.find((entry) => entry.code === level2)!,
    level3Options = costCodeLevel3.filter((entry) => entry.parent === level2),
    selectedLevel3 =
      costCodeLevel3.find((entry) => entry.code === costCode) ??
      level3Options[0],
    linkedMaterials = items.filter(
      (item) =>
        item.type === "Material" &&
        costCodeLinks.some(
          (link) =>
            link.costCode === selectedLevel3?.code &&
            link.itemCode === item.code,
        ),
    ),
    availableLinkItems = items.filter(
      (item) =>
        item.type === "Material" &&
        !costCodeLinks.some(
          (link) =>
            link.costCode === selectedLevel3?.code &&
            link.itemCode === item.code,
        ),
    ),
    linkSelection = availableLinkItems.some(
      (item) => item.code === linkItemCode,
    )
      ? linkItemCode
      : (availableLinkItems[0]?.code ?? "");
  function addMaterialLink() {
    if (!selectedLevel3 || !linkSelection) return;
    if (
      costCodeLinks.some(
        (link) =>
          link.costCode === selectedLevel3.code &&
          link.itemCode === linkSelection,
      )
    )
      return;
    setCostCodeLinks((links) => [
      ...links,
      { costCode: selectedLevel3.code, itemCode: linkSelection },
    ]);
    const nextAvailable = availableLinkItems.find(
      (item) => item.code !== linkSelection,
    );
    if (nextAvailable) setLinkItemCode(nextAvailable.code);
    flash("Material Code linked to Cost Code");
  }
  function removeMaterialLink(itemCode: string) {
    setCostCodeLinks((links) =>
      links.filter(
        (link) =>
          !(
            link.costCode === selectedLevel3?.code && link.itemCode === itemCode
          ),
      ),
    );
    if (code === itemCode) setCode("");
    flash("Material link removed");
  }
  function exportBom() {
    downloadCsv(`MCB_BOM_Data_${nowDate()}.csv`, [
      [
        "Site",
        "QS Cost Code Level 2",
        "QS Cost Code",
        "Item Code",
        "Item Name",
        "Original BOM Qty",
        "Approved BOM Qty",
        "Used Qty",
        "Balance Qty",
        "Budget Rate USD",
        "Approved Value USD",
        "Approved By",
        "Control",
      ],
      ...enriched.map((r) => [
        r.site,
        costCodeLevel3.find((entry) => entry.code === r.costCode)?.parent ?? "",
        r.costCode,
        r.code,
        itemName(r.code),
        r.originalQty,
        r.approvedQty,
        r.used,
        r.balance,
        r.rate,
        r.approvedQty * r.rate,
        r.approvedBy,
        r.balance < 0
          ? "OVER BOM"
          : r.balance === 0
            ? "LIMIT REACHED"
            : "WITHIN BOM",
      ]),
    ]);
  }
  const exportBomExcel = () => downloadXlsx(`MCB_BOM_Data_${nowDate()}.xlsx`, [{ name: "BOM Control", rows: [["Site", "QS Cost Code Level 2", "QS Cost Code", "Item Code", "Item Name", "Original BOM Qty", "Approved BOM Qty", "Used Qty", "Balance Qty", "Budget Rate USD", "Approved Value USD", "Approved By", "Control"], ...enriched.map((row) => [row.site, costCodeLevel3.find((entry) => entry.code === row.costCode)?.parent ?? "", row.costCode, row.code, itemName(row.code), row.originalQty, row.approvedQty, row.used, row.balance, row.rate, row.approvedQty * row.rate, row.approvedBy, row.balance < 0 ? "OVER BOM" : row.balance === 0 ? "LIMIT REACHED" : "WITHIN BOM"])] }]);
  return (
    <div className="bom-page">
      <article className="panel bom-file-tools">
        <div>
          <span className="eyebrow">BOM DATA EXCHANGE</span>
          <h3>Import or export BOM control data</h3>
          <p>
            Use the controlled UTF-8 template for compatibility with different
            Excel versions and Khmer item names.
          </p>
        </div>
        <div className="file-actions">
          <button type="button" onClick={downloadTemplate}>
            ↓ Download template
          </button>
          {canEdit && (
            <label>
              ↑ Import completed template
              <input type="file" accept=".csv,text/csv" onChange={importBom} />
            </label>
          )}
          <button type="button" onClick={exportBom}>
            ⇩ Export current BOM
          </button>
          <button type="button" onClick={exportBomExcel}>⇩ Export BOM Excel</button>
        </div>
        {importMessage && (
          <span className="import-result success">✓ {importMessage}</span>
        )}
        {importError && (
          <span className="import-result error">! {importError}</span>
        )}
      </article>
      <div className="bom-kpis">
        <Kpi
          label="Approved BOM value"
          value={Math.round(approvedValue)}
          tone="blue"
          note="USD approved budget"
        />
        <Kpi
          label="Consumed value"
          value={Math.round(usedValue)}
          tone="green"
          note="Linked Stock Out"
        />
        <Kpi
          label="Over BOM lines"
          value={over}
          tone="red"
          note="Requires QS action"
        />
      </div>
      {canEdit && (
        <form
          className={`panel bom-form ${editingId ? "editing" : ""}`}
          onSubmit={addLine}
        >
          <div>
            <span className="eyebrow">
              {editingId ? "BOM REVISION" : "QS COST CONTROL"}
            </span>
            <h3>
              {editingId ? "Revise approved BOM line" : "Add approved BOM line"}
            </h3>
            <p>
              {editingId
                ? "Original quantity remains protected while the approved quantity is revised."
                : "One item may use multiple cost codes for structural and architectural work."}
            </p>
          </div>
          <label>
            Site
            <select value={site} onChange={(e) => setSite(e.target.value)}>
              {sites.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Cost Code Level 2
            <select
              value={level2}
              onChange={(e) => {
                const parent = e.target.value,
                  first = costCodeLevel3.find(
                    (entry) => entry.parent === parent,
                  );
                setLevel2(parent);
                if (first) {
                  setCostCode(first.code);
                  const material = items.find(
                    (item) =>
                      item.type === "Material" &&
                      costCodeLinks.some(
                        (link) =>
                          link.costCode === first.code &&
                          link.itemCode === item.code,
                      ),
                  );
                  setCode(material?.code ?? "");
                }
              }}
            >
              {costCodeLevel2.map((entry) => (
                <option key={entry.code} value={entry.code}>
                  {entry.code} — {entry.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Cost Code Level 3
            <select
              required
              value={costCode}
              onChange={(e) => {
                const value = e.target.value;
                setCostCode(value);
                const material = items.find(
                  (item) =>
                    item.type === "Material" &&
                    costCodeLinks.some(
                      (link) =>
                        link.costCode === value && link.itemCode === item.code,
                    ),
                );
                setCode(material?.code ?? "");
              }}
            >
              {level3Options.map((entry) => (
                <option key={entry.code} value={entry.code}>
                  {entry.code} — {entry.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Material
            <select
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={!linkedMaterials.length}
            >
              {!linkedMaterials.length && (
                <option value="">No Material Codes linked</option>
              )}
              {linkedMaterials.map((i) => (
                <option key={i.code} value={i.code}>
                  {i.code} — {i.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Approved Qty
            <input
              type="number"
              min="0.01"
              step="any"
              required
              value={approved}
              onChange={(e) => setApproved(e.target.value)}
            />
          </label>
          <label>
            Budget Rate (USD)
            <input
              type="number"
              min="0"
              step="any"
              required
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </label>
          <button className="primary">
            {editingId ? "Approve revision" : "Add BOM line"}
          </button>
          <div className="cost-code-information">
            <section>
              <small>LEVEL 2 INFORMATION</small>
              <strong>
                {selectedLevel2.code} · {selectedLevel2.name}
              </strong>
              <p>{selectedLevel2.description}</p>
            </section>
            <section>
              <small>LEVEL 3 INFORMATION</small>
              <strong>
                {selectedLevel3?.code} · {selectedLevel3?.name}
              </strong>
              <p>{selectedLevel3?.description}</p>
              <span>{linkedMaterials.length} exact Material Code links</span>
            </section>
          </div>
        </form>
      )}
      {canEdit && (
        <article className="panel cost-code-link-master">
          <div className="panel-head">
            <div>
              <span className="eyebrow">DATA CORE LINK MASTER</span>
              <h3>Cost Code ↔ Material Code links</h3>
              <small>
                Only explicitly linked Material Codes appear in the BOM Material
                dropdown.
              </small>
            </div>
            <span className="record-count">
              {selectedLevel3?.code} · {linkedMaterials.length} links
            </span>
          </div>
          <div className="cost-code-link-tools">
            <div>
              <strong>
                {selectedLevel3?.code} · {selectedLevel3?.name}
              </strong>
              <small>
                Select Level 2 and Level 3 above to manage its links.
              </small>
            </div>
            <select
              value={linkSelection}
              onChange={(e) => setLinkItemCode(e.target.value)}
              disabled={!availableLinkItems.length}
            >
              {!availableLinkItems.length && (
                <option value="">All available materials are linked</option>
              )}
              {availableLinkItems.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.code} — {item.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="primary"
              onClick={addMaterialLink}
              disabled={!linkSelection}
            >
              + Link Material Code
            </button>
          </div>
          {linkedMaterials.length ? (
            <div className="material-link-list">
              {linkedMaterials.map((item) => (
                <div key={item.code}>
                  <ItemPhoto code={item.code} name={item.name} />
                  <span>
                    <strong>{item.code}</strong>
                    <small>
                      {item.name} · {item.category} · {item.unit}
                    </small>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeMaterialLink(item.code)}
                    aria-label={`Remove ${item.code} link`}
                  >
                    Remove link
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <Empty text="No Material Codes are linked to this Cost Code yet." />
          )}
        </article>
      )}
      <article className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">BOM USAGE CONTROL</span>
            <h3>Approved quantity against site consumption</h3>
          </div>
          <span className="record-count">{rows.length} lines</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {[
                  "Site",
                  "Level 2 / Level 3",
                  "Item",
                  "Original Qty",
                  "Approved Qty",
                  "Used Qty",
                  "Utilization",
                  "Balance",
                  "Rate USD",
                  "Control",
                  "Action",
                ].map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {enriched.map((r) => (
                <tr key={r.id}>
                  <td>
                    <span className="site-tag">{r.site}</span>
                  </td>
                  <td>
                    <strong className="code">
                      {costCodeLevel3.find((entry) => entry.code === r.costCode)
                        ?.parent ?? "—"}
                    </strong>
                    <small className="code">
                      {r.costCode} ·{" "}
                      {costCodeLevel3.find((entry) => entry.code === r.costCode)
                        ?.name ?? "Unclassified"}
                    </small>
                  </td>
                  <td>
                    <strong>{itemName(r.code)}</strong>
                    <small className="code">{r.code}</small>
                  </td>
                  <td>{formatQty(r.originalQty)}</td>
                  <td className="qty">{formatQty(r.approvedQty)}</td>
                  <td>{formatQty(r.used)}</td>
                  <td>
                    <div className="usage-cell">
                      <div>
                        <span
                          style={{ width: `${Math.min(100, r.utilization)}%` }}
                          className={r.utilization > 100 ? "over" : ""}
                        />
                      </div>
                      <b>{r.utilization}%</b>
                    </div>
                  </td>
                  <td className={r.balance < 0 ? "negative qty" : "qty"}>
                    {formatQty(r.balance)}
                  </td>
                  <td>${r.rate.toFixed(2)}</td>
                  <td>
                    <span
                      className={`status ${r.balance < 0 ? "danger" : r.balance === 0 ? "warn" : "ok"}`}
                    >
                      {r.balance < 0
                        ? "OVER BOM"
                        : r.balance === 0
                          ? "LIMIT REACHED"
                          : "WITHIN BOM"}
                    </span>
                  </td>
                  <td>
                    {canEdit ? (
                      <button
                        className="table-action"
                        onClick={() => revise(r)}
                      >
                        Revise
                      </button>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}
function StockStatus({ qty, min }: { qty: number; min: number }) {
  return qty <= 0 ? (
    <span className="status danger">Out of stock</span>
  ) : qty <= min ? (
    <span className="status warn">Low stock</span>
  ) : (
    <span className="status ok">Available</span>
  );
}

function MovementForm({
  mode,
  initialCode,
  accessibleSites,
  stock,
  setStock,
  setTransactions,
  transactions,
  user,
  role,
  flash,
  bom,
  suppliers,
  onNavigate,
}: {
  mode: "IN" | "OUT";
  initialCode?: string;
  accessibleSites: string[];
  stock: Stock;
  setStock: React.Dispatch<React.SetStateAction<Stock>>;
  setTransactions: React.Dispatch<React.SetStateAction<Tx[]>>;
  transactions: Tx[];
  user: string;
  role: Role;
  flash: (m: string) => void;
  bom: BomLine[];
  suppliers: Supplier[];
  onNavigate: (v: View) => void;
}) {
  const startingCode = items.some((item) => item.code === initialCode) ? initialCode! : items[0].code,
    startingItem = items.find((item) => item.code === startingCode);
  const [site, setSite] = useState(accessibleSites[0] ?? ""),
    [transactionDate, setTransactionDate] = useState(nowDate()),
    [code, setCode] = useState(startingCode),
    [qty, setQty] = useState(""),
    [costCode, setCostCode] = useState(""),
    [reference, setReference] = useState(""),
    [person, setPerson] = useState(""),
    [supplierId, setSupplierId] = useState(startingItem?.supplierIds?.[0] ?? ""),
    [evidence, setEvidence] = useState<File | null>(null),
    [error, setError] = useState(""),
    [pendingQty, setPendingQty] = useState<number | null>(null),
    [insufficientQty, setInsufficientQty] = useState<number | null>(null);
  const draftKey = `mcb-draft-${mode.toLowerCase()}-${user}`;
  const draftReady = useRef(false);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    try {
      const draft = JSON.parse(localStorage.getItem(draftKey) || "null") as { site?: string; transactionDate?: string; code?: string; qty?: string; costCode?: string; reference?: string; person?: string; supplierId?: string } | null;
      if (draft) {
        queueMicrotask(() => {
          if (draft.site && accessibleSites.includes(draft.site)) setSite(draft.site);
          if (draft.transactionDate && draft.transactionDate <= nowDate()) setTransactionDate(draft.transactionDate);
          if (draft.code && items.some((item) => item.code === draft.code)) setCode(draft.code);
          setQty(draft.qty ?? ""); setCostCode(draft.costCode ?? ""); setReference(draft.reference ?? ""); setPerson(draft.person ?? ""); setSupplierId(draft.supplierId ?? "");
        });
      }
    } catch {}
    window.setTimeout(() => { draftReady.current = true; }, 0);
  }, [draftKey]);
  useEffect(() => {
    if (!draftReady.current) return;
    localStorage.setItem(draftKey, JSON.stringify({ site, transactionDate, code, qty, costCode, reference, person, supplierId, savedAt: new Date().toISOString() }));
  }, [draftKey, site, transactionDate, code, qty, costCode, reference, person, supplierId]);
  useEffect(() => {
    if (!initialCode || !items.some((item) => item.code === initialCode)) return;
    const nextItem = items.find((item) => item.code === initialCode);
    queueMicrotask(() => {
      setCode(initialCode);
      setSupplierId(nextItem?.supplierIds?.[0] ?? "");
      setCostCode("");
    });
  }, [initialCode]);
  const available = stock[site]?.[code] ?? 0,
    item = items.find((i) => i.code === code)!,
    approvedSuppliers = suppliers.filter(
      (supplier) =>
        supplier.status === "Active" &&
        (item.supplierIds ?? []).includes(supplier.id),
    );
  const validCodes = Array.from(
    new Set(
      bom
        .filter((b) => b.site === site && b.code === code)
        .map((b) => b.costCode),
    ),
  );
  const bomLine = bom.find(
    (b) =>
      b.site === site &&
      b.code === code &&
      b.costCode === costCode.trim().toUpperCase(),
  );
  const purchasedBefore = transactions
      .filter(
        (t) =>
          t.type === "STOCK IN" &&
          t.site === site &&
          t.code === code &&
          t.costCode === costCode,
      )
      .reduce((a, t) => a + Math.max(0, t.qty), 0),
    issuedBefore = transactions
      .filter(
        (t) =>
          t.type === "STOCK OUT" &&
          t.site === site &&
          t.code === code &&
          t.costCode === costCode,
      )
      .reduce((a, t) => a + Math.abs(Math.min(0, t.qty)), 0),
    controlledBefore = mode === "IN" ? purchasedBefore : issuedBefore;
  async function postMovement(n: number) {
    const normalized = costCode.trim().toUpperCase();
    const requiresVerification = mode === "IN" && role === "Stockkeeper";
    const status = requiresVerification
      ? "Pending Verification"
      : mode === "IN"
        ? "Posted"
        : "BOM linked";
    const transactionId = uid();
    try { await uploadTransactionEvidence(transactionId, evidence, site); } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : "Evidence upload failed"); return; }
    if (!requiresVerification)
      setStock((prev) => ({
        ...prev,
        [site]: {
          ...prev[site],
          [code]: (prev[site]?.[code] ?? 0) + (mode === "IN" ? n : -n),
        },
      }));
    localStorage.removeItem(draftKey);
    const tx: Tx = {
      id: transactionId,
      date: transactionDate,
      type: mode === "IN" ? "STOCK IN" : "STOCK OUT",
      site,
      other: "",
      code,
      qty: mode === "IN" ? n : -n,
      by: user,
      status,
      costCode: normalized,
      reference: reference.trim(),
      person: person.trim(),
      supplierId: mode === "IN" ? supplierId : undefined,
      timestamp: new Date().toISOString(),
      evidenceName: evidence?.name,
      evidenceType: evidence?.type,
    };
    setTransactions((prev) => [tx, ...prev]);
    setQty("");
    setReference("");
    setPerson("");
    setEvidence(null);
    setError("");
    setPendingQty(null);
    flash(requiresVerification ? "Stock In submitted for Stock Controller verification. Stock has not changed yet." : `${tx.type} posted successfully`);
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    const n = Number(qty);
    const normalized = costCode.trim().toUpperCase();
    if (!n || n <= 0) {
      setError("Quantity must be greater than zero");
      return;
    }
    if (!normalized || !validCodes.includes(normalized)) {
      setError("Select an approved QS Cost Code");
      return;
    }
    if (!reference.trim() || !person.trim()) {
      setError(
        "Reference and responsible person are required for the audit trail",
      );
      return;
    }
    if (
      mode === "IN" &&
      !approvedSuppliers.some((supplier) => supplier.id === supplierId)
    ) {
      setError("Select an approved supplier linked to this Material Code");
      return;
    }
    if (mode === "OUT" && n > available) {
      setError("");
      setInsufficientQty(n);
      return;
    }
    if (bomLine && controlledBefore + n > bomLine.approvedQty) {
      setPendingQty(n);
      return;
    }
    postMovement(n);
  }
  const projected = controlledBefore + (pendingQty ?? (Number(qty) || 0)),
    overQty = bomLine ? Math.max(0, projected - bomLine.approvedQty) : 0,
    overValue = overQty * (bomLine?.rate ?? 0);
  function requestNewStock(requested: number) {
    const shortfall = Math.max(requested - available, 1);
    setTransactions((prev) => [
      {
        id: uid(),
        date: nowDate(),
        type: "STOCK REQUEST",
        site,
        other: "",
        code,
        qty: shortfall,
        by: user,
        status: "Pending",
        costCode: costCode.trim().toUpperCase(),
        reference:
          reference.trim() || `Shortfall request for ${requested} ${item.unit}`,
        person: person.trim() || user,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
    setInsufficientQty(null);
    setQty("");
    flash(`New stock request created for ${formatQty(shortfall)} ${item.unit}`);
  }
  return (
    <>
      <div className="form-layout">
        <form className="panel form-card" onSubmit={submit}>
          <div className="panel-head">
            <div>
              <span className="eyebrow">
                {mode === "IN" ? "RECEIVING" : "MATERIAL ISSUE"}
              </span>
              <h3>
                {mode === "IN"
                  ? "Post stock receipt"
                  : "Issue material from site"}
              </h3>
            </div>
            <span className={`movement-badge ${mode.toLowerCase()}`}>
              {mode === "IN" ? "+ IN" : "− OUT"}
            </span>
            <small className="draft-save-note">✓ Draft protected</small>
          </div>
          <div className="form-grid">
            <label>
              Date
              <input type="date" max={nowDate()} value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} />
            </label>
            <label>
              Site
              <select
                value={site}
                onChange={(e) => {
                  setSite(e.target.value);
                  setCostCode("");
                }}
              >
                {accessibleSites.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="full">
              Item
              <div className="scan-select-row">
              <select
                value={code}
                onChange={(e) => {
                  const nextCode = e.target.value,
                    nextItem = items.find((item) => item.code === nextCode),
                    nextSupplier = suppliers.find(
                      (supplier) =>
                        supplier.status === "Active" &&
                        (nextItem?.supplierIds ?? []).includes(supplier.id),
                    );
                  setCode(nextCode);
                  setSupplierId(nextSupplier?.id ?? "");
                  setCostCode("");
                }}
              >
                {items.map((i) => (
                  <option key={i.code} value={i.code}>
                    {i.code} — {i.name} | {i.khmer}
                  </option>
                ))}
              </select>
              <ItemCodeScanner onScan={(nextCode) => {
                const nextItem = items.find((item) => item.code === nextCode),
                  nextSupplier = suppliers.find((supplier) => supplier.status === "Active" && (nextItem?.supplierIds ?? []).includes(supplier.id));
                setCode(nextCode); setSupplierId(nextSupplier?.id ?? ""); setCostCode("");
              }} />
              </div>
            </label>
            <div className="form-item-photo full">
              <ItemPhoto code={item.code} name={item.name} size="medium" />
              <div>
                <strong>{item.name}</strong>
                <small>
                  {item.code} · {item.khmer}
                </small>
              </div>
            </div>
            <label>
              Quantity ({item.unit})
              <input
                ref={qtyInputRef}
                type="number"
                step="any"
                required
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="0"
              />
            </label>
            <label>
              QS Cost Code
              <select
                required
                value={costCode}
                onChange={(e) => setCostCode(e.target.value)}
                disabled={!validCodes.length}
              >
                <option value="">
                  {validCodes.length
                    ? "Select approved cost code"
                    : "No approved BOM cost code"}
                </option>
                {validCodes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {mode === "IN" ? "Delivery / PO reference" : "Reference"}
              <input
                required
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder={
                  mode === "IN" ? "PO / DO reference" : "Purpose / work area"
                }
              />
            </label>
            {mode === "IN" && (
              <label>
                Supplier
                <select
                  required
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  disabled={!approvedSuppliers.length}
                >
                  {!approvedSuppliers.length && (
                    <option value="">No approved supplier linked</option>
                  )}
                  {approvedSuppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.id} — {supplier.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Responsible person
              <input
                required
                value={person}
                onChange={(e) => setPerson(e.target.value)}
                placeholder={
                  mode === "IN" ? "Received by" : "Requested / issued by"
                }
              />
            </label>
            <label className="full evidence-upload">Evidence photo / document (optional)
              <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => setEvidence(event.target.files?.[0] ?? null)} />
              <small>{evidence ? `${evidence.name} · ${(evidence.size / 1024 / 1024).toFixed(1)} MB` : "JPG, PNG, WebP or PDF · maximum 10 MB"}</small>
            </label>
          </div>
          {error && <div className="form-error">{error}</div>}
          <button
            className="primary"
            type="submit"
            disabled={
              !validCodes.length || (mode === "IN" && !approvedSuppliers.length)
            }
          >
            {validCodes.length && (mode === "OUT" || approvedSuppliers.length)
              ? mode === "IN"
                ? role === "Stockkeeper" ? "Submit receipt for verification" : "Post stock receipt"
                : "Confirm stock issue"
              : mode === "IN" && !approvedSuppliers.length
                ? "Approved supplier required"
                : "Approved BOM required"}
          </button>
        </form>
        <aside className="panel balance-card">
          <span className="eyebrow">CONTROL CHECK</span>
          <h3>{item.name}</h3>
          <p className="khmer large">{item.khmer}</p>
          <div className="balance-number">
            <small>Available at {site}</small>
            <strong>
              {formatQty(available)} <em>{item.unit}</em>
            </strong>
          </div>
          <StockStatus qty={available} min={item.min} />
          <div className={`bom-link-state ${bomLine ? "linked" : "unlinked"}`}>
            <small>
              {mode === "IN" ? "BOM PURCHASE CONTROL" : "BOM ISSUE CONTROL"}
            </small>
            <strong>
              {bomLine
                ? `${bomLine.costCode} · ${formatQty(bomLine.approvedQty)} approved · ${formatQty(controlledBefore)} ${mode === "IN" ? "purchased" : "issued"}`
                : validCodes.length
                  ? "Select an approved cost code"
                  : "Create an approved BOM line first"}
            </strong>
          </div>
          <p className="control-note">
            {mode === "IN"
              ? "Stock In is checked against cumulative purchased quantity."
              : "Stock Out is checked against cumulative issued quantity."}{" "}
            Any amount above the approved BOM is blocked and must be resolved by QS through an approved BOM revision.
          </p>
        </aside>
      </div>
      {pendingQty !== null && bomLine && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="overbudget-title"
        >
          <section className="budget-modal">
            <div className="modal-icon">!</div>
            <span className="eyebrow">
              {mode === "IN" ? "BOM PURCHASE CONTROL" : "BOM ISSUE CONTROL"}
            </span>
            <h2 id="overbudget-title">Approved BOM limit reached</h2>
            <p>
              This {mode === "IN" ? "Stock In" : "Stock Out"} would exceed the
              approved BOM for <strong>{item.name}</strong> at{" "}
              <strong>{site}</strong>.
            </p>
            <div className="budget-summary">
              <div>
                <small>Approved BOM</small>
                <strong>
                  {formatQty(bomLine.approvedQty)} {item.unit}
                </strong>
                <span>${(bomLine.approvedQty * bomLine.rate).toFixed(2)}</span>
              </div>
              <div>
                <small>
                  {mode === "IN" ? "Purchased before" : "Issued before"}
                </small>
                <strong>
                  {formatQty(controlledBefore)} {item.unit}
                </strong>
                <span>${(controlledBefore * bomLine.rate).toFixed(2)}</span>
              </div>
              <div>
                <small>
                  {mode === "IN" ? "New Stock In" : "New Stock Out"}
                </small>
                <strong>
                  {formatQty(pendingQty)} {item.unit}
                </strong>
                <span>${(pendingQty * bomLine.rate).toFixed(2)}</span>
              </div>
              <div className="over">
                <small>Over budget</small>
                <strong>
                  +{formatQty(overQty)} {item.unit}
                </strong>
                <span>+${overValue.toFixed(2)}</span>
              </div>
            </div>
            <div className="modal-warning">
              Posting is blocked. Send the exception to QS for BOM revision; stock will not change until the approved BOM is sufficient.
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setPendingQty(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="confirm"
                onClick={() => {
                  const holdQty = pendingQty;
                  setTransactions((prev) => [
                    {
                      id: uid(),
                      date: nowDate(),
                      type: "BOM HOLD",
                      site,
                      other: "",
                      code,
                      qty: mode === "IN" ? holdQty : -holdQty,
                      by: user,
                      status: "Pending QS Revision",
                      costCode: costCode.trim().toUpperCase(),
                      reference: reference.trim(),
                      person: person.trim(),
                      reason: `${mode === "IN" ? "Stock In" : "Stock Out"} blocked: approved BOM ${formatQty(bomLine.approvedQty)}, current controlled ${formatQty(controlledBefore)}, requested ${formatQty(holdQty)}`,
                      timestamp: new Date().toISOString(),
                    },
                    ...prev,
                  ]);
                  setPendingQty(null);
                  flash("BOM Hold created and sent to QS. Stock was not changed.");
                  onNavigate("BOM Control");
                }}
              >
                Send to QS / Revise BOM
              </button>
            </div>
          </section>
        </div>
      )}
      {insufficientQty !== null && (
        <div
          className="modal-backdrop"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="insufficient-stock-title"
        >
          <section className="budget-modal stock-alert-modal">
            <div className="modal-icon critical">!</div>
            <span className="eyebrow">STOCK & BOM CONTROL</span>
            <h2 id="insufficient-stock-title">
              {bomLine &&
              controlledBefore + insufficientQty > bomLine.approvedQty
                ? "Stock and BOM limits exceeded"
                : "Not enough stock available"}
            </h2>
            <p>
              The requested Stock Out cannot be posted for{" "}
              <strong>{item.name}</strong> at <strong>{site}</strong>.{" "}
              {bomLine &&
              controlledBefore + insufficientQty > bomLine.approvedQty
                ? "There is not enough physical stock and the request also exceeds the approved BOM."
                : "There is not enough physical stock for this request."}
            </p>
            <div
              className={`stock-alert-summary ${bomLine && controlledBefore + insufficientQty > bomLine.approvedQty ? "combined" : ""}`}
            >
              <div>
                <small>Available stock</small>
                <strong>
                  {formatQty(available)} {item.unit}
                </strong>
              </div>
              <div className="over">
                <small>Requested Stock Out</small>
                <strong>
                  {formatQty(insufficientQty)} {item.unit}
                </strong>
              </div>
              <div className="shortfall">
                <small>Stock shortfall</small>
                <strong>
                  {formatQty(insufficientQty - available)} {item.unit}
                </strong>
              </div>
              {bomLine &&
                controlledBefore + insufficientQty > bomLine.approvedQty && (
                  <div className="shortfall">
                    <small>Over approved BOM</small>
                    <strong>
                      {formatQty(
                        controlledBefore +
                          insufficientQty -
                          bomLine.approvedQty,
                      )}{" "}
                      {item.unit}
                    </strong>
                  </div>
                )}
            </div>
            {bomLine &&
              controlledBefore + insufficientQty > bomLine.approvedQty && (
                <div className="combined-alert-note">
                  <span>
                    <small>Approved BOM</small>
                    <strong>
                      {formatQty(bomLine.approvedQty)} {item.unit}
                    </strong>
                  </span>
                  <span>
                    <small>Already issued</small>
                    <strong>
                      {formatQty(controlledBefore)} {item.unit}
                    </strong>
                  </span>
                </div>
              )}
            <div className="modal-warning danger">
              Stock Out is blocked. Request enough stock and obtain BOM approval
              before trying again.
            </div>
            <div className="modal-actions combined-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setInsufficientQty(null);
                  setQty("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="revise"
                onClick={() => {
                  setInsufficientQty(null);
                  setTimeout(() => {
                    qtyInputRef.current?.focus();
                    qtyInputRef.current?.select();
                  }, 0);
                }}
              >
                Revise quantity
              </button>
              <button
                type="button"
                className="receive"
                onClick={() => requestNewStock(insufficientQty)}
              >
                Request new stock
              </button>
              {bomLine &&
                controlledBefore + insufficientQty > bomLine.approvedQty && (
                  <button
                    type="button"
                    className="confirm"
                    onClick={() => {
                      setInsufficientQty(null);
                      onNavigate("BOM Control");
                    }}
                  >
                    Revise BOM
                  </button>
                )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}


type DailyStockOutRow = {
  id: string;
  code: string;
  costCode: string;
  qty: string;
  issuedTo: string;
  remark: string;
};

function blankDailyStockOutRow(code = ""): DailyStockOutRow {
  return { id: uid(), code, costCode: "", qty: "", issuedTo: "", remark: "" };
}

function DailyStockOutBatch({
  initialCode,
  accessibleSites,
  stock,
  setStock,
  transactions,
  setTransactions,
  user,
  role,
  flash,
  bom,
  onNavigate,
}: {
  initialCode?: string;
  accessibleSites: string[];
  stock: Stock;
  setStock: React.Dispatch<React.SetStateAction<Stock>>;
  transactions: Tx[];
  setTransactions: React.Dispatch<React.SetStateAction<Tx[]>>;
  user: string;
  role: Role;
  flash: (m: string) => void;
  bom: BomLine[];
  onNavigate: (v: View) => void;
}) {
  const initialItem = initialCode && items.some((item) => item.code === initialCode) ? initialCode : "";
  const [site, setSite] = useState(accessibleSites[0] ?? "");
  const [transactionDate, setTransactionDate] = useState(nowDate());
  const [sheetRef, setSheetRef] = useState("");
  const [rows, setRows] = useState<DailyStockOutRow[]>(() => [blankDailyStockOutRow(initialItem), blankDailyStockOutRow(), blankDailyStockOutRow()]);
  const [error, setError] = useState("");
  const [validated, setValidated] = useState(false);
  const draftKey = `mcb-daily-stock-out-${user}`;
  const draftReady = useRef(false);

  useEffect(() => {
    try {
      const draft = JSON.parse(localStorage.getItem(draftKey) || "null") as {
        site?: string; transactionDate?: string; sheetRef?: string; rows?: DailyStockOutRow[];
      } | null;
      if (draft) {
        queueMicrotask(() => {
          if (draft.site && accessibleSites.includes(draft.site)) setSite(draft.site);
          if (draft.transactionDate && draft.transactionDate <= nowDate()) setTransactionDate(draft.transactionDate);
          setSheetRef(draft.sheetRef ?? "");
          if (Array.isArray(draft.rows) && draft.rows.length) setRows(draft.rows.map((row) => ({ ...row, id: row.id || uid() })));
        });
      }
    } catch {}
    window.setTimeout(() => { draftReady.current = true; }, 0);
  }, [draftKey]);

  useEffect(() => {
    if (!draftReady.current) return;
    localStorage.setItem(draftKey, JSON.stringify({ site, transactionDate, sheetRef, rows, savedAt: new Date().toISOString() }));
    setValidated(false);
  }, [draftKey, site, transactionDate, sheetRef, rows]);

  useEffect(() => {
    if (!initialCode || !items.some((item) => item.code === initialCode)) return;
    queueMicrotask(() => setRows((current) => {
      if (current.some((row) => row.code === initialCode)) return current;
      const copy = [...current];
      const blankIndex = copy.findIndex((row) => !row.code && !row.qty);
      if (blankIndex >= 0) copy[blankIndex] = { ...copy[blankIndex], code: initialCode, costCode: "" };
      else copy.push(blankDailyStockOutRow(initialCode));
      return copy;
    }));
  }, [initialCode]);

  const activeRows = rows.filter((row) => row.code || row.qty || row.costCode || row.issuedTo || row.remark);
  const availableItemOptions = items.filter((item) => item.status !== "Inactive");

  function updateRow(id: string, patch: Partial<DailyStockOutRow>) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  function validateBatch(createHolds = false) {
    setError("");
    if (!site || !accessibleSites.includes(site)) {
      setError("Select an assigned site");
      return false;
    }
    if (!sheetRef.trim()) {
      setError("Daily Sheet Reference is required for the audit trail");
      return false;
    }
    if (!activeRows.length) {
      setError("Add at least one Stock Out row");
      return false;
    }

    const stockDemand = new Map<string, number>();
    const bomDemand = new Map<string, number>();
    const overBom: Array<{ row: DailyStockOutRow; approved: number; used: number; requested: number }> = [];

    for (let index = 0; index < activeRows.length; index += 1) {
      const row = activeRows[index];
      const lineNo = index + 1;
      const qty = Number(row.qty);
      if (!row.code || !items.some((item) => item.code === row.code)) {
        setError(`Row ${lineNo}: select a valid item`);
        return false;
      }
      if (!qty || qty <= 0) {
        setError(`Row ${lineNo}: quantity must be greater than zero`);
        return false;
      }
      if (!row.issuedTo.trim()) {
        setError(`Row ${lineNo}: Issued To / Responsible is required`);
        return false;
      }
      const normalizedCostCode = row.costCode.trim().toUpperCase();
      const line = bom.find((entry) => entry.site === site && entry.code === row.code && entry.costCode === normalizedCostCode);
      if (!normalizedCostCode || !line) {
        setError(`Row ${lineNo}: select an approved QS Cost Code linked to this item and site`);
        return false;
      }

      stockDemand.set(row.code, (stockDemand.get(row.code) ?? 0) + qty);
      const bomKey = `${row.code}::${normalizedCostCode}`;
      bomDemand.set(bomKey, (bomDemand.get(bomKey) ?? 0) + qty);
    }

    for (const [code, demand] of stockDemand) {
      const onHandQty = stock[site]?.[code] ?? 0;
      const reservedQty = reservedTransferQty(transactions, site, code);
      const available = Math.max(0, onHandQty - reservedQty);
      if (demand > available) {
        setError(`${code}: batch requests ${demand}, but only ${available} is available. Stock Out is blocked.`);
        return false;
      }
    }

    for (const [key, demand] of bomDemand) {
      const [code, costCode] = key.split("::");
      const line = bom.find((entry) => entry.site === site && entry.code === code && entry.costCode === costCode)!;
      const used = transactions
        .filter((transaction) => transaction.type === "STOCK OUT" && transaction.site === site && transaction.code === code && transaction.costCode === costCode)
        .reduce((sum, transaction) => sum + Math.abs(Math.min(0, transaction.qty)), 0);
      if (used + demand > line.approvedQty) {
        const row = activeRows.find((entry) => entry.code === code && entry.costCode.trim().toUpperCase() === costCode)!;
        overBom.push({ row, approved: line.approvedQty, used, requested: demand });
      }
    }

    if (overBom.length) {
      if (createHolds) {
        const now = new Date().toISOString();
        const holds: Tx[] = overBom.map(({ row, approved, used, requested }) => ({
          id: uid(), date: transactionDate, timestamp: now, type: "BOM HOLD", site, other: "", code: row.code,
          qty: -requested, by: user, status: "Pending QS Revision", costCode: row.costCode.trim().toUpperCase(),
          reference: sheetRef.trim(), person: row.issuedTo.trim(),
          reason: `Daily Stock Out blocked. Approved BOM ${approved}; used ${used}; requested batch ${requested}.`,
        }));
        setTransactions((current) => [...holds, ...current]);
      }
      setError(`${overBom.map((entry) => entry.row.code).join(", ")}: Approved BOM would be exceeded. Batch is blocked and QS must resolve the BOM.`);
      if (createHolds) onNavigate("BOM Control");
      return false;
    }

    setValidated(true);
    flash(`Daily Stock Out batch validated: ${activeRows.length} row${activeRows.length === 1 ? "" : "s"}`);
    return true;
  }

  function postBatch() {
    if (!validateBatch(true)) return;
    const now = new Date().toISOString();
    const batchId = `SO-${transactionDate.replaceAll("-", "")}-${uid().slice(0, 6).toUpperCase()}`;
    const postedRows = activeRows.map((row) => ({ ...row, costCode: row.costCode.trim().toUpperCase(), qtyNumber: Number(row.qty) }));
    const stockDelta = new Map<string, number>();
    postedRows.forEach((row) => stockDelta.set(row.code, (stockDelta.get(row.code) ?? 0) + row.qtyNumber));
    setStock((current) => {
      const siteStock = { ...(current[site] ?? {}) };
      for (const [code, qty] of stockDelta) siteStock[code] = (siteStock[code] ?? 0) - qty;
      return { ...current, [site]: siteStock };
    });
    const newTransactions: Tx[] = postedRows.map((row, index) => ({
      id: uid(), date: transactionDate, timestamp: now, type: "STOCK OUT", site, other: "", code: row.code,
      qty: -row.qtyNumber, by: user, status: "Posted", costCode: row.costCode,
      reference: `${sheetRef.trim()} · ${batchId} · Line ${index + 1}`,
      person: row.issuedTo.trim(), reason: row.remark.trim() || undefined,
    }));
    setTransactions((current) => [...newTransactions, ...current]);
    localStorage.removeItem(draftKey);
    setRows([blankDailyStockOutRow(), blankDailyStockOutRow(), blankDailyStockOutRow()]);
    setSheetRef("");
    setValidated(false);
    setError("");
    flash(`${batchId} posted successfully. ${newTransactions.length} Stock Out lines recorded atomically in this batch.`);
  }

  if (!accessibleSites.length) return <Empty title="No assigned site" text="Ask the Developer to assign a site before recording Stock Out." />;
  if (!["Developer", "Stock Controller"].includes(role)) return <Empty title="Stock Out restricted" text="Daily Stock Out entry is assigned to the Stock Controller by default." />;

  return (
    <div className="module-stack">
      <article className="panel">
        <div className="panel-head">
          <div><span className="eyebrow">DAILY CONTROL</span><h3>Daily Stock Out Batch</h3></div>
          <span className="status neutral">Draft until Post</span>
        </div>
        <p className="metric-note">Enter the site paper sheet as one controlled batch. The system checks aggregate Available Stock and Approved BOM before any quantity is posted.</p>
        <div className="form-grid three-col">
          <label>Site<select value={site} onChange={(e) => setSite(e.target.value)}>{accessibleSites.map((entry) => <option key={entry}>{entry}</option>)}</select></label>
          <label>Transaction Date<input type="date" max={nowDate()} value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} /></label>
          <label>Daily Sheet Reference<input value={sheetRef} onChange={(e) => setSheetRef(e.target.value)} placeholder="e.g. VLS-SO-2026-08-28" /></label>
        </div>
      </article>

      <article className="panel">
        <div className="panel-head"><div><span className="eyebrow">ISSUE LINES</span><h3>Paper sheet review grid</h3></div><button type="button" onClick={() => setRows((current) => [...current, blankDailyStockOutRow()])}>+ Add row</button></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Item</th><th>QS Cost Code</th><th>Qty Out</th><th>UOM</th><th>Issued To</th><th>Remark</th><th /></tr></thead>
            <tbody>{rows.map((row, index) => {
              const item = items.find((entry) => entry.code === row.code);
              const codes = Array.from(new Set(bom.filter((entry) => entry.site === site && entry.code === row.code).map((entry) => entry.costCode)));
              return <tr key={row.id}>
                <td>{index + 1}</td>
                <td><select value={row.code} onChange={(e) => updateRow(row.id, { code: e.target.value, costCode: "" })}><option value="">Select item</option>{availableItemOptions.map((entry) => <option key={entry.code} value={entry.code}>{entry.code} · {entry.name}</option>)}</select></td>
                <td><select value={row.costCode} onChange={(e) => updateRow(row.id, { costCode: e.target.value })} disabled={!row.code}><option value="">Select cost code</option>{codes.map((entry) => <option key={entry}>{entry}</option>)}</select></td>
                <td><input inputMode="decimal" value={row.qty} onChange={(e) => updateRow(row.id, { qty: e.target.value })} placeholder="0" /></td>
                <td>{item?.unit ?? "—"}</td>
                <td><input value={row.issuedTo} onChange={(e) => updateRow(row.id, { issuedTo: e.target.value })} placeholder="Worker / team" /></td>
                <td><input value={row.remark} onChange={(e) => updateRow(row.id, { remark: e.target.value })} placeholder="Work / remark" /></td>
                <td><button type="button" className="table-action" onClick={() => setRows((current) => current.length <= 1 ? [blankDailyStockOutRow()] : current.filter((entry) => entry.id !== row.id))}>Remove</button></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
        {error && <div className="form-error">{error}</div>}
        <div className="form-actions">
          <button type="button" className="secondary" onClick={() => validateBatch(false)}>Validate Batch</button>
          <button type="button" onClick={postBatch}>{validated ? "Post Validated Batch" : "Validate & Post Batch"}</button>
        </div>
      </article>
    </div>
  );
}

function TransferForm({
  initialCode,
  accessibleSites,
  stock,
  setStock,
  transactions,
  setTransactions,
  user,
  role,
  flash,
  onNavigate,
}: {
  initialCode?: string;
  accessibleSites: string[];
  stock: Stock;
  setStock: React.Dispatch<React.SetStateAction<Stock>>;
  transactions: Tx[];
  setTransactions: React.Dispatch<React.SetStateAction<Tx[]>>;
  user: string;
  role: Role;
  flash: (m: string) => void;
  onNavigate: (v: View) => void;
}) {
  const [from, setFrom] = useState(accessibleSites[0] ?? ""),
    [to, setTo] = useState(sites.find((site) => site !== (accessibleSites[0] ?? "")) ?? accessibleSites[0] ?? ""),
    [code, setCode] = useState(items.some((item) => item.code === initialCode) ? initialCode! : items[0].code),
    [qty, setQty] = useState(""),
    [approvedBy, setApprovedBy] = useState(""),
    [reference, setReference] = useState(""),
    [evidence, setEvidence] = useState<File | null>(null),
    [error, setError] = useState(""),
    [transferAlertQty, setTransferAlertQty] = useState<number | null>(null);
  const draftKey = `mcb-draft-transfer-${user}`;
  const draftReady = useRef(false);
  const transferQtyRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    try {
      const draft = JSON.parse(localStorage.getItem(draftKey) || "null") as { from?: string; to?: string; code?: string; qty?: string; approvedBy?: string; reference?: string } | null;
      if (draft) {
        queueMicrotask(() => {
          if (draft.from && accessibleSites.includes(draft.from)) setFrom(draft.from);
          if (draft.to && sites.includes(draft.to)) setTo(draft.to);
          if (draft.code && items.some((item) => item.code === draft.code)) setCode(draft.code);
          setQty(draft.qty ?? ""); setApprovedBy(draft.approvedBy ?? ""); setReference(draft.reference ?? "");
        });
      }
    } catch {}
    window.setTimeout(() => { draftReady.current = true; }, 0);
  }, [draftKey]);
  useEffect(() => {
    if (!draftReady.current) return;
    localStorage.setItem(draftKey, JSON.stringify({ from, to, code, qty, approvedBy, reference, savedAt: new Date().toISOString() }));
  }, [draftKey, from, to, code, qty, approvedBy, reference]);
  useEffect(() => {
    if (initialCode && items.some((item) => item.code === initialCode)) {
      queueMicrotask(() => { setCode(initialCode); setError(""); });
    }
  }, [initialCode]);
  const onHand = stock[from]?.[code] ?? 0;
  const reserved = reservedTransferQty(transactions, from, code);
  const available = Math.max(0, onHand - reserved);
  const pendingTransfers = transactions.filter(
    (t) =>
      t.type === "SITE TRANSFER" &&
      ["Pending Approval", "Approved / Reserved", "In Transit"].includes(t.status) &&
      (accessibleSites.includes(t.site) || accessibleSites.includes(t.other)),
  );
  async function submit(e: FormEvent) {
    e.preventDefault();
    const n = Number(qty);
    if (from === to) {
      setError("From Site and To Site cannot be the same");
      return;
    }
    if (!n || n <= 0) {
      setError("Quantity must be greater than zero");
      return;
    }
    if (!reference.trim()) {
      setError("Transfer reference is required");
      return;
    }
    if (n > available) {
      setError("");
      setTransferAlertQty(n);
      return;
    }
    const transactionId = uid();
    try { await uploadTransactionEvidence(transactionId, evidence, from); } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : "Evidence upload failed"); return; }
    setTransactions((p) => [
      {
        id: transactionId,
        date: nowDate(),
        type: "SITE TRANSFER",
        site: from,
        other: to,
        code,
        qty: n,
        by: user,
        status: "Pending Approval",
        reference: reference.trim(),
        person: approvedBy.trim(),
        timestamp: new Date().toISOString(),
        evidenceName: evidence?.name,
        evidenceType: evidence?.type,
      },
      ...p,
    ]);
    localStorage.removeItem(draftKey);
    setQty("");
    setApprovedBy("");
    setReference("");
    setEvidence(null);
    setError("");
    flash("Transfer request submitted · Stock Controller approval is required before dispatch");
  }
  function approveTransfer(t: Tx) {
    if (!["Developer", "Stock Controller"].includes(role) || !accessibleSites.includes(t.site)) return;
    const availableAtSource = Math.max(0, (stock[t.site]?.[t.code] ?? 0) - reservedTransferQty(transactions, t.site, t.code));
    if (t.qty > availableAtSource) {
      flash(`Transfer approval blocked: only ${formatQty(availableAtSource)} is available at ${t.site}.`);
      return;
    }
    setTransactions((current) => current.map((x) => x.id === t.id ? { ...x, status: "Approved / Reserved", approvedBy: user, reference: `${x.reference || ""} · Approved ${new Date().toISOString()}` } : x));
    flash(`Transfer approved and ${formatQty(t.qty)} reserved at ${t.site}`);
  }

  function dispatchTransfer(t: Tx) {
    if (!accessibleSites.includes(t.site)) return;
    const onHandAtSource = stock[t.site]?.[t.code] ?? 0;
    if (t.qty > onHandAtSource) {
      flash(`Dispatch blocked: source On Hand is only ${formatQty(onHandAtSource)}.`);
      return;
    }
    setStock((current) => ({ ...current, [t.site]: { ...current[t.site], [t.code]: (current[t.site]?.[t.code] ?? 0) - t.qty } }));
    setTransactions((current) => current.map((x) => x.id === t.id ? { ...x, status: "In Transit", reference: `${x.reference || ""} · Dispatched ${new Date().toISOString()}` } : x));
    flash(`Transfer dispatched from ${t.site} · destination receipt is required`);
  }

  function cancelTransfer(t: Tx) {
    if (!accessibleSites.includes(t.site) || !["Pending Approval", "Approved / Reserved"].includes(t.status)) return;
    setTransactions((current) => current.map((x) => x.id === t.id ? { ...x, status: "Cancelled", reference: `${x.reference || ""} · Cancelled ${new Date().toISOString()}` } : x));
    flash(`Transfer ${t.reference || t.id} cancelled before dispatch`);
  }

  function receiveTransfer(t: Tx) {
    if (!accessibleSites.includes(t.other) || t.status !== "In Transit") return;
    setStock((p) => ({
      ...p,
      [t.other]: {
        ...p[t.other],
        [t.code]: (p[t.other]?.[t.code] ?? 0) + t.qty,
      },
    }));
    setTransactions((p) =>
      p.map((x) =>
        x.id === t.id
          ? {
              ...x,
              status: "Received",
              reference: `${x.reference || ""} · Received ${new Date().toISOString()}`,
            }
          : x,
      ),
    );
    flash(`Transfer received at ${t.other}`);
  }
  function requestTransferStock(requested: number) {
    const shortfall = Math.max(requested - available, 1);
    setTransactions((p) => [
      {
        id: uid(),
        date: nowDate(),
        type: "STOCK REQUEST",
        site: from,
        other: "",
        code,
        qty: shortfall,
        by: user,
        status: "Pending",
        reference: `Transfer shortfall · ${reference.trim() || "No reference"}`,
        person: approvedBy.trim() || user,
        timestamp: new Date().toISOString(),
      },
      ...p,
    ]);
    setTransferAlertQty(null);
    setQty("");
    flash(`Stock request created for ${from}`);
  }
  return (
    <>
      <div className="form-layout">
        <form className="panel form-card" onSubmit={submit}>
          <div className="panel-head">
            <div>
              <span className="eyebrow">SITE TO SITE</span>
              <h3>Transfer available stock</h3>
            </div>
            <span className="movement-badge transfer">⇄ MOVE</span>
            <small className="draft-save-note">✓ Draft protected</small>
          </div>
          <div className="form-grid">
            <label>
              From site
              <select value={from} onChange={(e) => setFrom(e.target.value)}>
                {accessibleSites.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              To site
              <select value={to} onChange={(e) => setTo(e.target.value)}>
                {sites.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="full">
              Item
              <div className="scan-select-row">
              <select value={code} onChange={(e) => setCode(e.target.value)}>
                {items.map((i) => (
                  <option key={i.code} value={i.code}>
                    {i.code} — {i.name} | {i.khmer}
                  </option>
                ))}
              </select>
              <ItemCodeScanner onScan={setCode} />
              </div>
            </label>
            <div className="form-item-photo full">
              <ItemPhoto
                code={code}
                name={items.find((i) => i.code === code)?.name || code}
                size="medium"
              />
              <div>
                <strong>{items.find((i) => i.code === code)?.name}</strong>
                <small>
                  {code} · {items.find((i) => i.code === code)?.khmer}
                </small>
              </div>
            </div>
            <label>
              Quantity
              <input
                ref={transferQtyRef}
                type="number"
                step="any"
                required
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="0"
              />
            </label>
            <label>
              Transfer reference
              <input
                required
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="TRF-0001 / DO"
              />
            </label>
            <label className="full">
              Transfer note / requested approver (optional)
              <input
                value={approvedBy}
                onChange={(e) => setApprovedBy(e.target.value)}
                placeholder="Optional note"
              />
            </label>
            <label className="full evidence-upload">Transfer slip / photo (optional)
              <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => setEvidence(event.target.files?.[0] ?? null)} />
              <small>{evidence ? `${evidence.name} · ${(evidence.size / 1024 / 1024).toFixed(1)} MB` : "JPG, PNG, WebP or PDF · maximum 10 MB"}</small>
            </label>
          </div>
          {error && <div className="form-error">{error}</div>}
          <button className="primary">Submit transfer request</button>
        </form>
        <aside className="panel balance-card">
          <span className="eyebrow">BALANCE CONTROL</span>
          <h3>{itemName(code)}</h3>
          <div className="transfer-route">
            <div>
              <small>{from} available</small>
              <strong>{formatQty(available)}</strong>
              <span>{formatQty(onHand)} on hand · {formatQty(reserved)} reserved</span>
            </div>
            <span>→</span>
            <div>
              <small>{to}</small>
              <strong>{formatQty(stock[to]?.[code] ?? 0)}</strong>
            </div>
          </div>
          <p className="control-note">
            Request → approval/reservation → dispatch → destination receipt. Reserved quantity reduces Available Stock before physical dispatch.
          </p>
        </aside>
      </div>
      <article className="panel transfer-queue">
        <div className="panel-head">
          <div>
            <span className="eyebrow">TRANSFER RECEIPT CONTROL</span>
            <h3>Active transfer workflow</h3>
            <small>
              Approval reserves stock; dispatch reduces source On Hand; destination stock increases only after receipt.
            </small>
          </div>
          <span className="record-count">
            {pendingTransfers.length} active
          </span>
        </div>
        {pendingTransfers.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Route</th>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Dispatched by</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingTransfers.map((t) => (
                  <tr key={t.id}>
                    <td>{t.reference}</td>
                    <td>
                      <span className="site-tag">{t.site}</span> →{" "}
                      <span className="site-tag">{t.other}</span>
                    </td>
                    <td>{itemName(t.code)}</td>
                    <td className="qty">{formatQty(t.qty)}</td>
                    <td>{t.by}</td>
                    <td>
                      <div className="inline-actions">
                        {t.status === "Pending Approval" && ["Developer", "Stock Controller"].includes(role) && accessibleSites.includes(t.site) && (
                          <button type="button" className="table-action" onClick={() => approveTransfer(t)}>Approve & reserve</button>
                        )}
                        {t.status === "Approved / Reserved" && accessibleSites.includes(t.site) && (
                          <button type="button" className="table-action" onClick={() => dispatchTransfer(t)}>Dispatch</button>
                        )}
                        {t.status === "In Transit" && accessibleSites.includes(t.other) && (
                          <button type="button" className="table-action" onClick={() => receiveTransfer(t)}>Confirm receipt</button>
                        )}
                        {["Pending Approval", "Approved / Reserved"].includes(t.status) && accessibleSites.includes(t.site) && (
                          <button type="button" className="table-action" onClick={() => cancelTransfer(t)}>Cancel</button>
                        )}
                        <span className="status neutral">{t.status}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text="No transfers are awaiting receipt." />
        )}
      </article>
      {transferAlertQty !== null && (
        <div
          className="modal-backdrop"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="transfer-stock-title"
        >
          <section className="budget-modal stock-alert-modal">
            <div className="modal-icon critical">!</div>
            <span className="eyebrow">SITE TRANSFER CONTROL</span>
            <h2 id="transfer-stock-title">Not enough stock to transfer</h2>
            <p>
              The requested transfer from <strong>{from}</strong> to{" "}
              <strong>{to}</strong> cannot be completed because the source site
              does not have enough <strong>{itemName(code)}</strong>.
            </p>
            <div className="stock-alert-summary">
              <div>
                <small>Available at {from}</small>
                <strong>{formatQty(available)}</strong>
              </div>
              <div className="over">
                <small>Requested transfer</small>
                <strong>{formatQty(transferAlertQty)}</strong>
              </div>
              <div className="shortfall">
                <small>Stock shortfall</small>
                <strong>{formatQty(transferAlertQty - available)}</strong>
              </div>
            </div>
            <div className="modal-warning danger">
              The transfer is blocked to prevent a negative source-site balance.
            </div>
            <div className="modal-actions combined-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setTransferAlertQty(null);
                  setQty("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="revise"
                onClick={() => {
                  setTransferAlertQty(null);
                  setTimeout(() => {
                    transferQtyRef.current?.focus();
                    transferQtyRef.current?.select();
                  }, 0);
                }}
              >
                Revise quantity
              </button>
              <button
                type="button"
                className="receive"
                onClick={() => requestTransferStock(transferAlertQty)}
              >
                Request new stock
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function EquipmentPanel({
  initialCode,
  accessibleSites,
  records,
  setRecords,
  stock,
  setTransactions,
  user,
  flash,
}: {
  initialCode?: string;
  accessibleSites: string[];
  records: Equipment[];
  setRecords: React.Dispatch<React.SetStateAction<Equipment[]>>;
  stock: Stock;
  setTransactions: React.Dispatch<React.SetStateAction<Tx[]>>;
  user: string;
  flash: (m: string) => void;
}) {
  const equipmentCodes = items.filter((item) => item.type === "Equipment" || item.type === "Small Tools").map((item) => item.code);
  const [borrower, setBorrower] = useState(""),
    [site, setSite] = useState(accessibleSites[0] ?? ""),
    [code, setCode] = useState(initialCode && equipmentCodes.includes(initialCode) ? initialCode : equipmentCodes[0] ?? "EQ-EQ-002"),
    [checkoutQty, setCheckoutQty] = useState("1"),
    [checkoutTime, setCheckoutTime] = useState(nowTime()),
    [expected, setExpected] = useState(nowDate()),
    [condition, setCondition] = useState("Good"),
    [error, setError] = useState(""),
    [checkoutAlertQty, setCheckoutAlertQty] = useState<number | null>(null),
    [borrowerBlock, setBorrowerBlock] = useState<Equipment[] | null>(null),
    [returnId, setReturnId] = useState(""),
    [returnDate, setReturnDate] = useState(nowDate()),
    [returnTime, setReturnTime] = useState(nowTime()),
    [goodReturnQty, setGoodReturnQty] = useState("0"),
    [damagedReturnQty, setDamagedReturnQty] = useState("0"),
    [lostReturnQty, setLostReturnQty] = useState("0"),
    [incidentNote, setIncidentNote] = useState(""),
    [receivedBy, setReceivedBy] = useState(""),
    [returnEvidence, setReturnEvidence] = useState<File | null>(null),
    [returnError, setReturnError] = useState(""),
    [returnValidation, setReturnValidation] = useState<
      "missing" | "invalid" | "over" | "partial" | null
    >(null),
    [damageReview, setDamageReview] = useState(false),
    [scrapRecord, setScrapRecord] = useState<Equipment | null>(null),
    [scrapReason, setScrapReason] = useState(""),
    [checkoutEvidence, setCheckoutEvidence] = useState<File | null>(null);
  const draftKey = `mcb-draft-equipment-${user}`;
  const draftReady = useRef(false);
  const equipmentQtyRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    try {
      const draft = JSON.parse(localStorage.getItem(draftKey) || "null") as { borrower?: string; site?: string; code?: string; checkoutQty?: string; checkoutTime?: string; expected?: string; condition?: string } | null;
      if (draft) {
        queueMicrotask(() => {
          setBorrower(draft.borrower ?? "");
          if (draft.site && accessibleSites.includes(draft.site)) setSite(draft.site);
          if (draft.code && equipmentCodes.includes(draft.code)) setCode(draft.code);
          setCheckoutQty(draft.checkoutQty ?? "1"); setCheckoutTime(draft.checkoutTime ?? nowTime()); setExpected(draft.expected ?? nowDate()); setCondition(draft.condition ?? "Good");
        });
      }
    } catch {}
    window.setTimeout(() => { draftReady.current = true; }, 0);
  }, [draftKey]);
  useEffect(() => {
    if (!draftReady.current) return;
    localStorage.setItem(draftKey, JSON.stringify({ borrower, site, code, checkoutQty, checkoutTime, expected, condition, savedAt: new Date().toISOString() }));
  }, [draftKey, borrower, site, code, checkoutQty, checkoutTime, expected, condition]);
  useEffect(() => {
    if (initialCode && equipmentCodes.includes(initialCode)) {
      queueMicrotask(() => { setCode(initialCode); setError(""); });
    }
  }, [initialCode]);
  const damagedQtyRef = useRef<HTMLInputElement>(null);
  const visibleRecords = records.filter((record) => accessibleSites.includes(record.site));
  const issued = visibleRecords
      .filter(
        (r) => r.site === site && r.code === code && r.status === "Checked Out",
      )
      .reduce((a, r) => a + r.qty, 0),
    unavailable = visibleRecords
      .filter(
        (r) =>
          r.site === site &&
          r.code === code &&
          [
            "Checked Out",
            "Awaiting Repair",
            "Under Repair",
            "Lost",
            "Scrapped",
          ].includes(r.status),
      )
      .reduce((a, r) => a + r.qty, 0);
  const registered = stock[site]?.[code] ?? 0,
    available = Math.max(0, registered - unavailable),
    outstanding = visibleRecords.filter((r) => r.status === "Checked Out"),
    returnRecord = visibleRecords.find((r) => r.id === returnId);
  async function submit(e: FormEvent) {
    e.preventDefault();
    const n = Number(checkoutQty);
    if (!borrower) return;
    const borrowerKey = borrower.trim().toLocaleLowerCase();
    const unresolved = outstanding.filter(
      (r) => r.borrower.trim().toLocaleLowerCase() === borrowerKey,
    );
    if (unresolved.length) {
      setError("");
      setBorrowerBlock(unresolved);
      return;
    }
    if (!Number.isInteger(n) || n <= 0) {
      setError("Checkout quantity must be a whole number greater than zero.");
      return;
    }
    if (n > available) {
      setError("");
      setCheckoutAlertQty(n);
      return;
    }
    const transactionId = uid();
    try { await uploadTransactionEvidence(transactionId, checkoutEvidence, site); } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : "Evidence upload failed"); return; }
    const i = items.find((x) => x.code === code)!;
    const record = {
      id: uid(),
      code,
      item: i.name,
      site,
      borrower,
      qty: n,
      expected,
      status: "Checked Out",
      checkoutDate: nowDate(),
      checkoutTime,
      conditionOut: condition,
      issuedBy: user,
    };
    setRecords((p) => [record, ...p]);
    localStorage.removeItem(draftKey);
    setTransactions((p) => [
      {
        id: transactionId,
        date: nowDate(),
        type: "EQUIPMENT CHECKOUT",
        site,
        other: "",
        code,
        qty: -n,
        by: user,
        status: "Checked Out",
        reference: `Expected ${expected} · Checkout ${checkoutTime}`,
        person: borrower,
        timestamp: new Date().toISOString(),
        evidenceName: checkoutEvidence?.name,
        evidenceType: checkoutEvidence?.type,
      },
      ...p,
    ]);
    setBorrower("");
    setCheckoutQty("1");
    setCheckoutTime(nowTime());
    setCheckoutEvidence(null);
    setError("");
    flash(`${n} equipment item${n > 1 ? "s" : ""} checked out`);
  }
  async function finalizeReturn(record: Equipment) {
    const good = Number(goodReturnQty) || 0,
      damaged = Number(damagedReturnQty) || 0,
      lost = Number(lostReturnQty) || 0,
      total = good + damaged + lost,
      remaining = record.qty - total,
      timestamp = new Date().toISOString(),
      goodTxId = good ? uid() : "",
      damagedTxId = damaged ? uid() : "",
      lostTxId = lost ? uid() : "";
    try { await Promise.all([goodTxId, damagedTxId, lostTxId].filter(Boolean).map((id) => uploadTransactionEvidence(id, returnEvidence, record.site))); } catch (uploadError) { setReturnError(uploadError instanceof Error ? uploadError.message : "Return evidence upload failed"); return; }
    const returnedRecords: Equipment[] = [
      ...(good
        ? [
            {
              ...record,
              id: goodTxId,
              qty: good,
              status: "Returned",
              partialReturn: false,
              actualReturn: returnDate,
              returnTime,
              conditionReturn: "Good",
            },
          ]
        : []),
      ...(damaged
        ? [
            {
              ...record,
              id: uid(),
              qty: damaged,
              status: "Awaiting Repair",
              partialReturn: false,
              actualReturn: returnDate,
              returnTime,
              conditionReturn: "Damaged",
              incidentNote: incidentNote.trim(),
              repairStatus: "Awaiting assessment",
            },
          ]
        : []),
      ...(lost
        ? [
            {
              ...record,
              id: uid(),
              qty: lost,
              status: "Lost",
              partialReturn: false,
              actualReturn: returnDate,
              returnTime,
              conditionReturn: "Lost",
              incidentNote: incidentNote.trim(),
            },
          ]
        : []),
    ];
    setRecords((p) => [
      ...returnedRecords,
      ...p.flatMap((x) =>
        x.id !== record.id
          ? [x]
          : remaining > 0
            ? [{ ...x, qty: remaining, partialReturn: true }]
            : [],
      ),
    ]);
    const returnTx: Tx[] = [
      ...(good
        ? [
            {
              id: uid(),
              date: returnDate,
              type: "EQUIPMENT RETURN",
              site: record.site,
              other: "",
              code: record.code,
              qty: good,
              by: user,
              status: "Returned",
              reference: `Good return · ${returnTime}`,
              person: receivedBy.trim(),
              timestamp,
              evidenceName: returnEvidence?.name,
              evidenceType: returnEvidence?.type,
            },
          ]
        : []),
      ...(damaged
        ? [
            {
              id: damagedTxId,
              date: returnDate,
              type: "EQUIPMENT DAMAGED",
              site: record.site,
              other: "",
              code: record.code,
              qty: 0,
              by: user,
              status: "Awaiting Repair",
              reference: `${damaged} damaged · ${incidentNote.trim()}`,
              person: receivedBy.trim(),
              timestamp,
              evidenceName: returnEvidence?.name,
              evidenceType: returnEvidence?.type,
            },
          ]
        : []),
      ...(lost
        ? [
            {
              id: lostTxId,
              date: returnDate,
              type: "EQUIPMENT LOST",
              site: record.site,
              other: "",
              code: record.code,
              qty: 0,
              by: user,
              status: "Lost",
              reference: `${lost} lost · ${incidentNote.trim()}`,
              person: receivedBy.trim(),
              timestamp,
              evidenceName: returnEvidence?.name,
              evidenceType: returnEvidence?.type,
            },
          ]
        : []),
    ];
    setTransactions((p) => [...returnTx, ...p]);
    setReturnId("");
    setReceivedBy("");
    setGoodReturnQty("0");
    setDamagedReturnQty("0");
    setLostReturnQty("0");
    setIncidentNote("");
    setReturnEvidence(null);
    setReturnTime(nowTime());
    setReturnError("");
    setDamageReview(false);
    flash(
      `${total} PCS processed${remaining > 0 ? ` · ${remaining} PCS still checked out` : ""}`,
    );
  }
  function continueValidatedReturn() {
    if (!returnRecord) return;
    setReturnValidation(null);
    if (Number(damagedReturnQty) > 0) {
      setDamageReview(true);
      return;
    }
    finalizeReturn(returnRecord);
  }
  function receive(e: FormEvent) {
    e.preventDefault();
    setReturnError("");
    if (!returnRecord || !receivedBy.trim() || !returnDate || !returnTime) {
      setReturnValidation("missing");
      return;
    }
    if (
      returnDate > nowDate() ||
      returnDate < (returnRecord.checkoutDate || "0000-00-00")
    ) {
      setReturnValidation("invalid");
      return;
    }
    const values = [goodReturnQty, damagedReturnQty, lostReturnQty].map(Number);
    if (
      values.some((n) => !Number.isInteger(n) || n < 0) ||
      values.reduce((a, n) => a + n, 0) <= 0
    ) {
      setReturnValidation("invalid");
      return;
    }
    if ((values[1] > 0 || values[2] > 0) && !incidentNote.trim()) {
      setReturnValidation("missing");
      return;
    }
    if ((values[1] > 0 || values[2] > 0) && !returnEvidence) {
      setReturnError("A photo or PDF is required for damaged or lost equipment.");
      return;
    }
    const total = values.reduce((a, n) => a + n, 0);
    if (total > returnRecord.qty) {
      setReturnValidation("over");
      return;
    }
    if (total < returnRecord.qty) {
      setReturnValidation("partial");
      return;
    }
    continueValidatedReturn();
  }
  function updateRepair(record: Equipment) {
    const starting = record.status === "Awaiting Repair";
    const timestamp = new Date().toISOString();
    const nextStatus = starting ? "Under Repair" : "Returned";
    setRecords((p) =>
      p.map((x) =>
        x.id === record.id
          ? {
              ...x,
              status: nextStatus,
              repairStatus: starting
                ? "Repair in progress"
                : "Repaired and available",
              repairStartedAt: starting ? timestamp : x.repairStartedAt,
              repairCompletedAt: starting ? undefined : timestamp,
            }
          : x,
      ),
    );
    setTransactions((p) => [
      {
        id: uid(),
        date: nowDate(),
        type: starting ? "EQUIPMENT REPAIR START" : "EQUIPMENT REPAIRED",
        site: record.site,
        other: "",
        code: record.code,
        qty: starting ? 0 : record.qty,
        by: user,
        status: nextStatus,
        reference: starting
          ? "Repair work started"
          : "Repair completed and returned to service",
        person: user,
        timestamp,
      },
      ...p,
    ]);
    flash(
      starting
        ? "Repair work started"
        : "Equipment repaired and available again",
    );
  }
  function confirmScrap() {
    if (!scrapRecord || !scrapReason.trim()) return;
    const timestamp = new Date().toISOString();
    setRecords((p) =>
      p.map((x) =>
        x.id === scrapRecord.id
          ? {
              ...x,
              status: "Scrapped",
              repairStatus: "Unrepairable / Scrapped",
              scrapReason: scrapReason.trim(),
              scrappedAt: timestamp,
            }
          : x,
      ),
    );
    setTransactions((p) => [
      {
        id: uid(),
        date: nowDate(),
        type: "EQUIPMENT SCRAP",
        site: scrapRecord.site,
        other: "",
        code: scrapRecord.code,
        qty: 0,
        by: user,
        status: "Scrapped",
        reference: scrapReason.trim(),
        person: user,
        timestamp,
      },
      ...p,
    ]);
    setScrapRecord(null);
    setScrapReason("");
    flash("Unrepairable equipment moved to scrap");
  }
  return (
    <>
      <div className="form-layout equipment-top">
        <form className="panel form-card" onSubmit={submit}>
          <div className="panel-head">
            <div>
              <span className="eyebrow">EQUIPMENT CONTROL</span>
              <h3>New checkout</h3>
            </div>
            <span className="record-count">{issued} currently out</span>
            <small className="draft-save-note">✓ Draft protected</small>
          </div>
          <div className="form-grid">
            <label>
              Site
              <select
                value={site}
                onChange={(e) => {
                  setSite(e.target.value);
                  setError("");
                }}
              >
                {accessibleSites.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Equipment
              <div className="scan-select-row">
              <select
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setError("");
                }}
              >
                {items
                  .filter(
                    (i) => i.type === "Equipment" || i.type === "Small Tools",
                  )
                  .map((i) => (
                    <option key={i.code} value={i.code}>
                      {i.code} — {i.name}
                    </option>
                  ))}
              </select>
              <ItemCodeScanner
                allowedCodes={items.filter((item) => item.type === "Equipment" || item.type === "Small Tools").map((item) => item.code)}
                onScan={(nextCode) => { setCode(nextCode); setError(""); }}
              />
              </div>
            </label>
            <div className="form-item-photo full">
              <ItemPhoto
                code={code}
                name={items.find((i) => i.code === code)?.name || code}
                size="medium"
              />
              <div>
                <strong>{items.find((i) => i.code === code)?.name}</strong>
                <small>{code} · selected equipment</small>
              </div>
            </div>
            <label>
              Borrower / Worker ID
              <input
                required
                value={borrower}
                onChange={(e) => setBorrower(e.target.value)}
                placeholder="Name or worker ID"
              />
            </label>
            <label>
              Quantity to take out
              <input
                ref={equipmentQtyRef}
                type="number"
                min="1"
                step="1"
                required
                value={checkoutQty}
                onChange={(e) => setCheckoutQty(e.target.value)}
              />
            </label>
            <label>
              Checkout time
              <input
                type="time"
                required
                value={checkoutTime}
                onChange={(e) => setCheckoutTime(e.target.value)}
              />
            </label>
            <label>
              Expected return
              <input
                type="date"
                min={nowDate()}
                value={expected}
                onChange={(e) => setExpected(e.target.value)}
              />
            </label>
            <label className="full">
              Condition out
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
              >
                <option>Good</option>
                <option>Fair</option>
                <option>Damaged</option>
              </select>
            </label>
            <label className="full evidence-upload">Checkout form / equipment photo (optional)
              <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => setCheckoutEvidence(event.target.files?.[0] ?? null)} />
              <small>{checkoutEvidence ? `${checkoutEvidence.name} · ${(checkoutEvidence.size / 1024 / 1024).toFixed(1)} MB` : "JPG, PNG, WebP or PDF · maximum 10 MB"}</small>
            </label>
          </div>
          {error && <div className="form-error">{error}</div>}
          <button className="primary">Check out equipment</button>
        </form>
        <aside className="panel balance-card">
          <span className="eyebrow">LIVE AVAILABILITY</span>
          <h3>{itemName(code)}</h3>
          <div className="balance-number">
            <small>Available at {site}</small>
            <strong>
              {formatQty(available)} <em>PCS</em>
            </strong>
          </div>
          <div className="equipment-math">
            <span>
              Registered <b>{registered}</b>
            </span>
            <span>
              Unavailable <b>{unavailable}</b>
            </span>
          </div>
          <span className={`status ${available > 0 ? "ok" : "danger"}`}>
            {available > 0 ? "Ready to issue" : "Unavailable"}
          </span>
        </aside>
      </div>
      <form
        id="equipment-return-form"
        className="panel return-card equipment-return-card"
        onSubmit={receive}
      >
        <div className="return-card-head">
          <span className="eyebrow">EQUIPMENT RETURN</span>
          <h3>Process returned, damaged or lost equipment</h3>
          <p>
            Good returns restore availability. Damaged items enter the repair
            queue; lost items remain unavailable.
          </p>
        </div>
        <label>
          Outstanding checkout
          <select
            value={returnId}
            onChange={(e) => {
              setReturnId(e.target.value);
              setReturnError("");
            }}
          >
            <option value="">Select equipment / borrower</option>
            {outstanding.map((r) => (
              <option key={r.id} value={r.id}>
                {r.site} — {r.item} — {r.borrower} — {r.qty} PCS{" "}
                {r.partialReturn ? "remaining" : "out"}
              </option>
            ))}
          </select>
        </label>
        <label>
          Actual return date
          <input
            type="date"
            max={nowDate()}
            value={returnDate}
            onChange={(e) => setReturnDate(e.target.value)}
          />
        </label>
        <label>
          Return time
          <input
            type="time"
            required
            value={returnTime}
            onChange={(e) => setReturnTime(e.target.value)}
          />
        </label>
        <label>
          Good Qty
          <input
            type="number"
            min="0"
            step="1"
            value={goodReturnQty}
            onChange={(e) => setGoodReturnQty(e.target.value)}
          />
        </label>
        <label>
          Damaged Qty
          <input
            ref={damagedQtyRef}
            type="number"
            min="0"
            step="1"
            value={damagedReturnQty}
            onChange={(e) => setDamagedReturnQty(e.target.value)}
          />
        </label>
        <label>
          Lost Qty
          <input
            type="number"
            min="0"
            step="1"
            value={lostReturnQty}
            onChange={(e) => setLostReturnQty(e.target.value)}
          />
        </label>
        <label className="incident-note">
          Damage / lost comment
          <input
            value={incidentNote}
            onChange={(e) => setIncidentNote(e.target.value)}
            placeholder="Required reason, incident details or observed damage"
          />
        </label>
        <label>
          Received by
          <input
            value={receivedBy}
            onChange={(e) => setReceivedBy(e.target.value)}
            placeholder="Stockkeeper name"
          />
        </label>
        <label className="evidence-upload">
          Return / damage evidence
          <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => setReturnEvidence(event.target.files?.[0] ?? null)} />
          <small>{returnEvidence ? `${returnEvidence.name} · ${(returnEvidence.size / 1024 / 1024).toFixed(1)} MB` : "Required for damaged/lost cases · optional for good return"}</small>
        </label>
        <button className="primary" disabled={!outstanding.length}>
          Process return
        </button>
        {returnError && (
          <div className="form-error full-error">{returnError}</div>
        )}
      </form>
      <article className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">CHECKOUT REGISTER</span>
            <h3>Current equipment activity</h3>
          </div>
          <span className="record-count">{outstanding.length} outstanding</span>
        </div>
        {visibleRecords.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Site</th>
                  <th>Equipment</th>
                  <th>Qty</th>
                  <th>Borrower</th>
                  <th>Checkout</th>
                  <th>Expected</th>
                  <th>Return</th>
                  <th>Condition</th>
                  <th>Repair</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleRecords.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <span className="site-tag">{r.site}</span>
                    </td>
                    <td>
                      <strong>{r.item}</strong>
                      <small className="code">{r.code}</small>
                    </td>
                    <td className="qty">{r.qty}</td>
                    <td>{r.borrower}</td>
                    <td>
                      <strong>{r.checkoutDate || "—"}</strong>
                      <small>{r.checkoutTime || "—"}</small>
                    </td>
                    <td
                      className={
                        r.status === "Checked Out" && r.expected < nowDate()
                          ? "negative"
                          : ""
                      }
                    >
                      {r.expected}
                    </td>
                    <td>
                      <strong>{r.actualReturn || "—"}</strong>
                      <small>{r.returnTime || "—"}</small>
                    </td>
                    <td>
                      <strong>
                        {r.conditionOut || "—"} → {r.conditionReturn || "—"}
                      </strong>
                    </td>
                    <td>
                      <strong>{r.repairStatus || "—"}</strong>
                      {r.incidentNote && <small>{r.incidentNote}</small>}
                      {r.scrapReason && <small>Scrap: {r.scrapReason}</small>}
                    </td>
                    <td>
                      <span
                        className={`status ${r.status === "Returned" ? "ok" : ["Awaiting Repair", "Under Repair", "Lost"].includes(r.status) || r.expected < nowDate() ? "danger" : "warn"}`}
                      >
                        {r.status === "Checked Out" && r.expected < nowDate()
                          ? "Overdue"
                          : r.partialReturn
                            ? `Partially Returned · ${r.qty} remaining`
                            : r.status}
                      </span>
                    </td>
                    <td>
                      {r.status === "Checked Out" ? (
                        <button
                          type="button"
                          className="table-action"
                          onClick={() => setReturnId(r.id)}
                        >
                          {r.partialReturn
                            ? "Return remaining"
                            : "Process return"}
                        </button>
                      ) : r.status === "Awaiting Repair" ? (
                        <button
                          type="button"
                          className="table-action"
                          onClick={() => updateRepair(r)}
                        >
                          Start repair
                        </button>
                      ) : r.status === "Under Repair" ? (
                        <span className="repair-actions">
                          <button
                            type="button"
                            className="table-action"
                            onClick={() => updateRepair(r)}
                          >
                            Mark repaired
                          </button>
                          <button
                            type="button"
                            className="table-action scrap"
                            onClick={() => setScrapRecord(r)}
                          >
                            Scrap
                          </button>
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text="No equipment checkout records yet." />
        )}
      </article>
      {checkoutAlertQty !== null && (
        <div
          className="modal-backdrop"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="equipment-stock-title"
        >
          <section className="budget-modal stock-alert-modal">
            <div className="modal-icon critical">!</div>
            <span className="eyebrow">EQUIPMENT AVAILABILITY CONTROL</span>
            <h2 id="equipment-stock-title">Not enough equipment available</h2>
            <p>
              This checkout cannot be completed for{" "}
              <strong>{itemName(code)}</strong> at <strong>{site}</strong>{" "}
              because the requested quantity exceeds the available balance.
            </p>
            <div className="stock-alert-summary">
              <div>
                <small>Available equipment</small>
                <strong>{formatQty(available)} PCS</strong>
              </div>
              <div className="over">
                <small>Requested checkout</small>
                <strong>{formatQty(checkoutAlertQty)} PCS</strong>
              </div>
              <div className="shortfall">
                <small>Shortfall</small>
                <strong>{formatQty(checkoutAlertQty - available)} PCS</strong>
              </div>
            </div>
            <div className="modal-warning danger">
              Equipment checkout is blocked to prevent a negative available
              balance.
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setCheckoutAlertQty(null);
                  setCheckoutQty("1");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="revise"
                onClick={() => {
                  setCheckoutAlertQty(null);
                  setTimeout(() => {
                    equipmentQtyRef.current?.focus();
                    equipmentQtyRef.current?.select();
                  }, 0);
                }}
              >
                Revise
              </button>
              <button
                type="button"
                className="confirm"
                onClick={() => setCheckoutAlertQty(null)}
              >
                OK
              </button>
            </div>
          </section>
        </div>
      )}
      {borrowerBlock && (
        <div
          className="modal-backdrop"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="borrower-outstanding-title"
        >
          <section className="budget-modal stock-alert-modal">
            <div className="modal-icon critical">!</div>
            <span className="eyebrow">BORROWER RETURN CONTROL</span>
            <h2 id="borrower-outstanding-title">
              Resolve remaining tools first
            </h2>
            <p>
              <strong>{borrower.trim()}</strong> cannot make a new checkout
              while equipment from an earlier checkout is still outstanding.
            </p>
            <div className="stock-alert-summary combined">
              <div>
                <small>Outstanding records</small>
                <strong>{borrowerBlock.length}</strong>
              </div>
              <div className="shortfall">
                <small>Total still out</small>
                <strong>
                  {formatQty(borrowerBlock.reduce((sum, r) => sum + r.qty, 0))}{" "}
                  PCS
                </strong>
              </div>
            </div>
            <div className="borrower-outstanding-list">
              {borrowerBlock.map((r) => (
                <div key={r.id}>
                  <strong>{r.item}</strong>
                  <span>
                    {r.site} · {r.qty} PCS remaining · Due {r.expected}
                  </span>
                </div>
              ))}
            </div>
            <div className="modal-warning danger">
              New checkout is blocked. Process each remaining quantity as Good,
              Damaged or Lost before issuing more tools.
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setBorrowerBlock(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="confirm"
                onClick={() => {
                  const first = borrowerBlock[0];
                  setBorrowerBlock(null);
                  setReturnId(first.id);
                  setTimeout(
                    () =>
                      document
                        .getElementById("equipment-return-form")
                        ?.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        }),
                    0,
                  );
                }}
              >
                Resolve remaining now
              </button>
            </div>
          </section>
        </div>
      )}
      {returnValidation && (
        <div
          className="modal-backdrop"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="return-validation-title"
        >
          <section className="budget-modal return-validation-modal">
            <div className="modal-icon critical">!</div>
            <span className="eyebrow">RETURN QUANTITY CONTROL</span>
            <h2 id="return-validation-title">
              {returnValidation === "partial"
                ? "Return quantity is incomplete"
                : returnValidation === "over"
                  ? "Return quantity is too high"
                  : returnValidation === "missing"
                    ? "Required return data is missing"
                    : "Return data is not valid"}
            </h2>
            <p>
              {returnValidation === "partial"
                ? "Some checked-out equipment is not included in this return. You may continue, but the remaining quantity will stay outstanding."
                : returnValidation === "over"
                  ? "The combined Good, Damaged and Lost quantities exceed the selected checkout quantity."
                  : returnValidation === "missing"
                    ? "Select an outstanding checkout and complete the receiver, date and time fields. A damage/lost comment is also required when either quantity is above zero."
                    : "Use whole quantities of zero or more and enter at least one returned, damaged or lost item."}
            </p>
            {returnRecord && (
              <div className="stock-alert-summary combined">
                <div>
                  <small>Checked out</small>
                  <strong>{formatQty(returnRecord.qty)} PCS</strong>
                </div>
                <div>
                  <small>Good</small>
                  <strong>{formatQty(Number(goodReturnQty) || 0)} PCS</strong>
                </div>
                <div className="over">
                  <small>Damaged / Lost</small>
                  <strong>
                    {formatQty(
                      (Number(damagedReturnQty) || 0) +
                        (Number(lostReturnQty) || 0),
                    )}{" "}
                    PCS
                  </strong>
                </div>
                <div className="shortfall">
                  <small>
                    {returnValidation === "over"
                      ? "Over entered"
                      : "Still outstanding"}
                  </small>
                  <strong>
                    {formatQty(
                      Math.abs(
                        returnRecord.qty -
                          ((Number(goodReturnQty) || 0) +
                            (Number(damagedReturnQty) || 0) +
                            (Number(lostReturnQty) || 0)),
                      ),
                    )}{" "}
                    PCS
                  </strong>
                </div>
              </div>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setReturnValidation(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="revise"
                onClick={() => {
                  setReturnValidation(null);
                  setTimeout(() => {
                    damagedQtyRef.current?.focus();
                    damagedQtyRef.current?.select();
                  }, 0);
                }}
              >
                Revise data
              </button>
              {returnValidation === "partial" ? (
                <button
                  type="button"
                  className="confirm"
                  onClick={continueValidatedReturn}
                >
                  Continue partial return
                </button>
              ) : (
                <button
                  type="button"
                  className="confirm"
                  onClick={() => setReturnValidation(null)}
                >
                  OK
                </button>
              )}
            </div>
          </section>
        </div>
      )}
      {damageReview && returnRecord && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="damage-return-title"
        >
          <section className="budget-modal damage-review-modal">
            <div className="modal-icon critical">!</div>
            <span className="eyebrow">DAMAGED RETURN CONTROL</span>
            <h2 id="damage-return-title">Send damaged equipment to repair?</h2>
            <p>
              This return will keep the equipment unavailable and create an
              active repair alert until the repair is completed.
            </p>
            <div className="stock-alert-summary combined">
              <div>
                <small>Good return</small>
                <strong>{formatQty(Number(goodReturnQty) || 0)} PCS</strong>
              </div>
              <div className="over">
                <small>Damaged → Repair</small>
                <strong>{formatQty(Number(damagedReturnQty) || 0)} PCS</strong>
              </div>
              <div className="shortfall">
                <small>Lost</small>
                <strong>{formatQty(Number(lostReturnQty) || 0)} PCS</strong>
              </div>
              <div>
                <small>Return time</small>
                <strong>
                  {returnDate} · {returnTime}
                </strong>
              </div>
            </div>
            <div className="modal-warning">Comment: {incidentNote}</div>
            <div className="repair-flow">
              <span>
                <b>1</b>Awaiting Repair
              </span>
              <i>→</i>
              <span>
                <b>2</b>Under Repair
              </span>
              <i>→</i>
              <span>
                <b>3</b>Repaired & Available
              </span>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setDamageReview(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="revise"
                onClick={() => {
                  setDamageReview(false);
                  setTimeout(() => {
                    damagedQtyRef.current?.focus();
                    damagedQtyRef.current?.select();
                  }, 0);
                }}
              >
                Revise
              </button>
              <button
                type="button"
                className="confirm"
                onClick={() => finalizeReturn(returnRecord)}
              >
                Send to repair
              </button>
            </div>
          </section>
        </div>
      )}
      {scrapRecord && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="scrap-title"
        >
          <section className="budget-modal scrap-modal">
            <div className="modal-icon critical">!</div>
            <span className="eyebrow">UNREPAIRABLE EQUIPMENT</span>
            <h2 id="scrap-title">Move equipment to scrap?</h2>
            <p>
              <strong>{scrapRecord.item}</strong> · {scrapRecord.qty} PCS will
              be permanently unavailable. Enter the inspection result or reason
              repair is not possible.
            </p>
            <label className="scrap-reason">
              Scrap reason
              <input
                autoFocus
                value={scrapReason}
                onChange={(e) => setScrapReason(e.target.value)}
                placeholder="Example: motor burned, repair cost exceeds replacement"
              />
            </label>
            <div className="modal-warning danger">
              This creates a permanent Scrap record in Transactions and the
              equipment register.
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setScrapRecord(null);
                  setScrapReason("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="confirm"
                disabled={!scrapReason.trim()}
                onClick={confirmScrap}
              >
                Confirm scrap
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
function Transactions({ rows, setRows, stock, setStock, user, role, canCorrect, flash }: { rows: Tx[]; setRows: React.Dispatch<React.SetStateAction<Tx[]>>; stock: Stock; setStock: React.Dispatch<React.SetStateAction<Stock>>; user: string; role: Role; canCorrect: boolean; flash: (message: string) => void }) {
  const [q, setQ] = useState(""),
    [type, setType] = useState("ALL"),
    [target, setTarget] = useState<Tx | null>(null),
    [voucher, setVoucher] = useState<Tx | null>(null),
    [verificationTarget, setVerificationTarget] = useState<Tx | null>(null),
    [verificationNote, setVerificationNote] = useState(""),
    [verificationConfirmed, setVerificationConfirmed] = useState(false),
    [correctionMode, setCorrectionMode] = useState<"Reverse" | "Correct">("Reverse"),
    [reason, setReason] = useState(""), [reference, setReference] = useState(""), [correctQty, setCorrectQty] = useState("");
  const types = Array.from(new Set(rows.map((r) => r.type)));
  const filtered = rows.filter(
    (r) =>
      (type === "ALL" || r.type === type) &&
      `${r.type} ${r.site} ${r.code} ${r.costCode || ""} ${r.reference || ""} ${r.person || ""} ${r.reason || ""}`
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  const correctedIds = new Set(rows.map((row) => row.linkedTransactionId).filter(Boolean));
  const canVerify = ["Developer", "Stock Controller"].includes(role);
  const sameActor = (left: string, right: string) => left.trim().replaceAll(" ", "").toLowerCase() === right.trim().replaceAll(" ", "").toLowerCase();
  const mayVerify = (transaction: Tx) => canVerify && (role === "Developer" || !sameActor(transaction.by, user));
  const transactionExportRows: Array<Array<string | number>> = [["Date", "Time", "Type", "From Site", "To Site", "Item Code", "Item", "QS Cost Code", "Reference", "Responsible", "Evidence", "Previous", "Change", "After", "Posted By", "Approved By", "Status", "Verification Status", "Verified By", "Verification Role", "Verified At", "Verification Note", "Linked Transaction"], ...filtered.map((row) => [row.date, row.timestamp ? new Date(row.timestamp).toLocaleTimeString() : "", row.type, row.site, row.other ?? "", row.code, itemName(row.code), row.costCode ?? "", row.reference ?? row.reason ?? "", row.person ?? "", row.evidenceName ?? "", row.previousQty ?? "", row.qty, row.newQty ?? "", row.by, row.approvedBy ?? "", row.status, row.verifiedAt ? "Digitally verified" : "Pending verification", row.verifiedBy ?? "", row.verificationRole ?? "", row.verifiedAt ?? "", row.verificationNote ?? "", row.linkedTransactionId ?? ""])];
  function submitVerification(e: FormEvent) {
    e.preventDefault();
    if (!verificationTarget || !verificationConfirmed || !verificationNote.trim()) return;
    if (!mayVerify(verificationTarget)) { flash("Independent verification required: another Stock Controller or the Developer must sign this transaction"); return; }
    const verifiedAt = new Date().toISOString();
    const postsPendingStockIn = verificationTarget.type === "STOCK IN" && verificationTarget.status === "Pending Verification";
    if (postsPendingStockIn)
      setStock((current) => ({
        ...current,
        [verificationTarget.site]: {
          ...current[verificationTarget.site],
          [verificationTarget.code]: (current[verificationTarget.site]?.[verificationTarget.code] ?? 0) + verificationTarget.qty,
        },
      }));
    setRows((list) => list.map((row) => row.id === verificationTarget.id ? {
      ...row,
      status: postsPendingStockIn ? "Posted" : row.status,
      approvedBy: postsPendingStockIn ? user : row.approvedBy,
      verifiedBy: user,
      verifiedAt,
      verificationRole: role,
      verificationNote: verificationNote.trim(),
    } : row));
    setVerificationTarget(null);
    setVerificationNote("");
    setVerificationConfirmed(false);
    flash(postsPendingStockIn ? "Stock In verified and posted to Current Stock" : "Transaction digitally verified and added to the audit trail");
  }
  function submitCorrection(e: FormEvent) {
    e.preventDefault(); if (!target || !reason.trim() || !reference.trim()) return;
    const current = stock[target.site]?.[target.code] ?? 0, reverseQty = -target.qty,
      correctedSigned = correctionMode === "Correct" ? Math.sign(target.qty || 1) * Number(correctQty) : 0,
      nextQty = current + reverseQty + correctedSigned;
    if (nextQty < 0 || (correctionMode === "Correct" && (!Number(correctQty) || Number(correctQty) <= 0))) { flash("Correction would create invalid stock quantity"); return; }
    const now = new Date().toISOString(), reversal: Tx = { ...target, id: uid(), date: nowDate(), timestamp: now, type: "REVERSE TRANSACTION", qty: reverseQty, previousQty: current, newQty: current + reverseQty, status: "Approved", by: user, approvedBy: user, linkedTransactionId: target.id, reference: reference.trim(), reason: reason.trim() };
    const created: Tx[] = [reversal];
    if (correctionMode === "Correct") created.push({ ...target, id: uid(), date: nowDate(), timestamp: now, type: "CORRECT TRANSACTION", qty: correctedSigned, previousQty: current + reverseQty, newQty: nextQty, status: "Approved", by: user, approvedBy: user, linkedTransactionId: target.id, reference: reference.trim(), reason: reason.trim() });
    setStock((previous) => ({ ...previous, [target.site]: { ...previous[target.site], [target.code]: nextQty } })); setRows((list) => [...created, ...list]); setTarget(null); setReason(""); setReference(""); setCorrectQty(""); flash(correctionMode === "Correct" ? "Correction posted with linked reversal" : "Transaction reversed; original retained");
  }
  return (
    <>
    <article className="panel">
      <div className="panel-head register-head">
        <div>
          <span className="eyebrow">AUDIT TRAIL</span>
          <h3>Posted inventory transactions</h3>
        </div>
        <div className="register-tools">
          <input
            className="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search code, reference, person or reason"
          />
          <select
            className="compact-select"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option>ALL</option>
            {types.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <button type="button" className="secondary" disabled={!filtered.length} onClick={() => downloadCsv(`MCB_Transactions_${nowDate()}.csv`, transactionExportRows)}>CSV</button>
          <button type="button" className="secondary" disabled={!filtered.length} onClick={() => downloadXlsx(`MCB_Transactions_${nowDate()}.xlsx`, [{ name: "Transactions", rows: transactionExportRows }])}>Excel</button>
          <span className="record-count">{filtered.length} records</span>
        </div>
      </div>
      {filtered.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Site</th>
                <th>Item</th>
                <th>Reference / Reason</th>
                <th className="tx-detail-column">Responsible</th>
                <th className="tx-detail-column">Evidence</th>
                <th className="tx-detail-column">Previous</th>
                <th>Change</th>
                <th className="tx-detail-column">New Balance</th>
                <th className="tx-detail-column">Posted By</th>
                <th>Status</th>
                <th>Verification</th>
                <th>Voucher</th>
                {canCorrect && <th>Correction</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td data-label="Date">
                    <strong>{r.date}</strong>
                    <small>
                      {r.timestamp
                        ? new Date(r.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </small>
                  </td>
                  <td data-label="Type">
                    <strong>{r.type}</strong>
                    {r.other && <small>To {r.other}</small>}
                    {r.costCode && (
                      <small className="code">QS {r.costCode}</small>
                    )}
                    {r.linkedTransactionId && (
                      <small className="code">Linked to {r.linkedTransactionId}</small>
                    )}
                  </td>
                  <td data-label="Site">
                    <span className="site-tag">{r.site}</span>
                  </td>
                  <td data-label="Item">
                    <strong>{itemName(r.code)}</strong>
                    <small className="code">{r.code}</small>
                  </td>
                  <td data-label="Reference">
                    <strong>{r.reference || "—"}</strong>
                    <small>{r.reason || "—"}</small>
                  </td>
                  <td className="tx-detail-column">{r.person || "—"}</td>
                  <td className="tx-detail-column">{r.evidenceName ? <a className="evidence-link" href={`/api/transaction-evidence?id=${encodeURIComponent(r.id)}`} target="_blank" rel="noreferrer">▧ {r.evidenceName}</a> : "—"}</td>
                  <td className="qty tx-detail-column">
                    {r.previousQty === undefined
                      ? "—"
                      : formatQty(r.previousQty)}
                  </td>
                  <td data-label="Change" className={r.qty < 0 ? "negative qty" : "positive qty"}>
                    {r.qty > 0 ? "+" : ""}
                    {formatQty(r.qty)}
                  </td>
                  <td className="qty tx-detail-column">
                    {r.newQty === undefined ? "—" : formatQty(r.newQty)}
                  </td>
                  <td className="tx-detail-column">
                    {r.by}
                    {r.approvedBy && <small>Approved by {r.approvedBy}</small>}
                  </td>
                  <td data-label="Status">
                    <span
                      className={`status ${["No Approved BOM", "Pending QS Revision", "Lost", "Scrapped"].includes(r.status) ? "danger" : r.status === "Checked Out" ? "warn" : "ok"}`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td data-label="Verification">
                    {r.verifiedAt ? <div className="verification-cell"><span className="status ok">Verified</span><small>{r.verifiedBy} · {r.verificationRole}</small><small>{new Date(r.verifiedAt).toLocaleString()}</small></div> : canVerify ? <button type="button" className="table-action" title={mayVerify(r) ? "Verify this transaction" : "Open to see the independent-verifier requirement"} onClick={() => { setVerificationTarget(r); setVerificationNote(""); setVerificationConfirmed(false); }}>Verify</button> : <span className="status neutral">Pending</span>}
                  </td>
                  <td data-label="Details"><button type="button" className="table-action" onClick={() => setVoucher(r)}>Details / Print</button></td>
                  {canCorrect && (
                    <td>
                      {["STOCK IN", "STOCK OUT", "STOCK ADJUSTMENT", "STOCK COUNT VARIANCE"].includes(r.type) && !correctedIds.has(r.id) ? (
                        <button
                          type="button"
                          className="table-action"
                          onClick={() => {
                            setTarget(r);
                            setCorrectionMode("Reverse");
                            setReason("");
                            setReference("");
                            setCorrectQty(String(Math.abs(r.qty)));
                          }}
                        >
                          Reverse / Correct
                        </button>
                      ) : correctedIds.has(r.id) ? (
                        <span className="status neutral">Corrected</span>
                      ) : (
                        "—"
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty text="No matching transactions." />
      )}
    </article>
    {target && (
      <div className="modal-backdrop" role="presentation">
        <section className="modal-card transaction-correction-modal" role="dialog" aria-modal="true" aria-labelledby="correction-title">
          <div className="modal-head">
            <div>
              <span className="eyebrow">POSTED TRANSACTION</span>
              <h3 id="correction-title">Reverse or correct transaction</h3>
            </div>
            <button type="button" className="icon-button" aria-label="Close" onClick={() => setTarget(null)}>×</button>
          </div>
          <div className="correction-original">
            <strong>{target.type} · {target.code}</strong>
            <span>{target.site} · {target.date} · {target.qty > 0 ? "+" : ""}{formatQty(target.qty)}</span>
            <small>Original ID: {target.id}</small>
          </div>
          <form onSubmit={submitCorrection} className="modal-form">
            <label>Action
              <select value={correctionMode} onChange={(event) => setCorrectionMode(event.target.value as "Reverse" | "Correct")}>
                <option value="Reverse">Reverse transaction</option>
                <option value="Correct">Reverse and post corrected quantity</option>
              </select>
            </label>
            {correctionMode === "Correct" && (
              <label>Correct quantity
                <input type="number" min="0.01" step="0.01" required value={correctQty} onChange={(event) => setCorrectQty(event.target.value)} />
              </label>
            )}
            <label>Correction reference
              <input required value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Document or approval reference" />
            </label>
            <label>Reason
              <textarea required value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain why this posted transaction must change" />
            </label>
            <label>Approver
              <input value={user} readOnly />
            </label>
            <div className="modal-warning danger">The original transaction is never deleted. A permanent linked reversal and, when selected, correction record will be posted.</div>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setTarget(null)}>Cancel</button>
              <button type="submit" className="confirm">{correctionMode === "Correct" ? "Post correction" : "Post reversal"}</button>
            </div>
          </form>
        </section>
      </div>
    )}
    {verificationTarget && (
      <div className="modal-backdrop" role="presentation">
        <section className="modal-card verification-modal" role="dialog" aria-modal="true" aria-labelledby="verification-title">
          <div className="modal-head"><div><span className="eyebrow">INDEPENDENT CONTROL</span><h3 id="verification-title">Digitally verify transaction</h3></div><button type="button" className="icon-button" aria-label="Close" onClick={() => setVerificationTarget(null)}>×</button></div>
          <div className="correction-original"><strong>{verificationTarget.type} · {verificationTarget.code}</strong><span>{verificationTarget.site} · {verificationTarget.date} · {verificationTarget.qty > 0 ? "+" : ""}{formatQty(verificationTarget.qty)}</span><small>Posted by {verificationTarget.by} · ID {verificationTarget.id}</small></div>
          <form onSubmit={submitVerification} className="modal-form">
            <label>Verifier<input value={`${user} · ${role}`} readOnly /></label>
            <label>Verification note<textarea required value={verificationNote} onChange={(event) => setVerificationNote(event.target.value)} placeholder="State what you checked and the supporting document reference" /></label>
            {mayVerify(verificationTarget) ? <><label className="verification-declaration"><input type="checkbox" checked={verificationConfirmed} onChange={(event) => setVerificationConfirmed(event.target.checked)} /><span>I checked the source document, item, quantity, site, balance and reference. I confirm this transaction is correct.{role === "Developer" && sameActor(verificationTarget.by, user) ? " Developer override is recorded because you posted this transaction." : ""}</span></label><div className="modal-warning">This sign-off records your logged-in identity and timestamp. It does not change stock.</div></> : <div className="modal-warning danger">You posted this transaction, so you cannot independently verify it. Ask another Admin, Management or Developer user to sign it.</div>}
            <div className="modal-actions"><button type="button" className="secondary" onClick={() => setVerificationTarget(null)}>Cancel</button><button type="submit" className="confirm" disabled={!mayVerify(verificationTarget) || !verificationConfirmed || !verificationNote.trim()}>Sign and verify</button></div>
          </form>
        </section>
      </div>
    )}
    {voucher && (
      <div className="modal-backdrop transaction-voucher-backdrop" role="dialog" aria-modal="true" onClick={() => setVoucher(null)}>
        <section className="budget-modal transaction-voucher-modal" onClick={(event) => event.stopPropagation()}>
          <div className="transaction-voucher">
            <header><div><span className="voucher-brand">MCB INVENTORY CONTROL</span><h2>{voucher.type.replaceAll("_", " ")} VOUCHER</h2><p>Official inventory transaction record</p></div><ItemQrCode code={voucher.id} /></header>
            <div className="voucher-id"><span>TRANSACTION ID</span><strong>{voucher.id}</strong><b className={`status ${["No Approved BOM", "Pending QS Revision", "Lost", "Scrapped"].includes(voucher.status) ? "danger" : voucher.status === "Checked Out" ? "warn" : "ok"}`}>{voucher.status}</b></div>
            <div className="voucher-grid">
              <div><small>Date / Time</small><strong>{voucher.date}</strong><span>{voucher.timestamp ? new Date(voucher.timestamp).toLocaleString() : "Time not recorded"}</span></div>
              <div><small>Site movement</small><strong>{voucher.site}{voucher.other ? ` → ${voucher.other}` : ""}</strong><span>{voucher.type}</span></div>
              <div><small>Item</small><strong>{itemName(voucher.code)}</strong><span>{voucher.code}</span></div>
              <div><small>Quantity change</small><strong className={voucher.qty < 0 ? "negative" : "positive"}>{voucher.qty > 0 ? "+" : ""}{formatQty(voucher.qty)}</strong><span>{items.find((item) => item.code === voucher.code)?.unit ?? "Unit"}</span></div>
              <div><small>QS Cost Code</small><strong>{voucher.costCode || "Not applicable"}</strong><span>{voucher.costCode ? costCodeLevel3.find((entry) => entry.code === voucher.costCode)?.name || "Linked cost code" : "—"}</span></div>
              <div><small>Balance</small><strong>{voucher.previousQty === undefined ? "—" : formatQty(voucher.previousQty)} → {voucher.newQty === undefined ? "—" : formatQty(voucher.newQty)}</strong><span>Before → after</span></div>
            </div>
            <div className="voucher-reference"><div><small>Reference</small><strong>{voucher.reference || "—"}</strong></div><div><small>Reason / Note</small><strong>{voucher.reason || "—"}</strong></div><div><small>Responsible person</small><strong>{voucher.person || "—"}</strong></div></div>
            {voucher.evidenceName && <div className="voucher-evidence"><small>ATTACHED EVIDENCE</small><strong>{voucher.evidenceName}</strong><a href={`/api/transaction-evidence?id=${encodeURIComponent(voucher.id)}`} target="_blank" rel="noreferrer">Open attachment</a></div>}
            {voucher.linkedTransactionId && <div className="voucher-linked">Linked original transaction: <strong>{voucher.linkedTransactionId}</strong></div>}
            <div className={`voucher-verification ${voucher.verifiedAt ? "verified" : "pending"}`}><small>DIGITAL VERIFICATION</small>{voucher.verifiedAt ? <><strong>Verified by {voucher.verifiedBy} · {voucher.verificationRole}</strong><span>{new Date(voucher.verifiedAt).toLocaleString()}</span><p>{voucher.verificationNote}</p></> : <strong>Pending independent verification</strong>}</div>
            <div className="voucher-people"><div><small>Posted by</small><strong>{voucher.by}</strong></div><div><small>Approved by</small><strong>{voucher.approvedBy || "—"}</strong></div></div>
            <div className="voucher-signatures"><div><span>Prepared / Issued by</span><b>Signature & date</b></div><div><span>Received / Checked by</span><b>Signature & date</b></div><div><span>{voucher.verifiedBy || "Approved by"}</span><b>{voucher.verifiedAt ? `Digitally verified · ${new Date(voucher.verifiedAt).toLocaleDateString()}` : "Signature & date"}</b></div></div>
            <footer>Scan the QR code to identify this transaction in the MCB audit trail.</footer>
          </div>
          <div className="modal-actions voucher-actions"><button type="button" className="secondary" onClick={() => setVoucher(null)}>Close</button><button type="button" className="confirm" onClick={() => window.print()}>Print voucher</button></div>
        </section>
      </div>
    )}
    </>
  );
}
function AuditReport({ transactions }: { transactions: Tx[] }) {
  const [logs, setLogs] = useState<SystemAudit[]>([]),
    [loading, setLoading] = useState(true),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [site, setSite] = useState("ALL"),
    [actor, setActor] = useState(""),
    [action, setAction] = useState("ALL");
  useEffect(() => {
    let active = true;
    fetch("/api/audit", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load the audit log");
        return response.json() as Promise<{ logs?: SystemAudit[] }>;
      })
      .then((result) => active && setLogs(result.logs ?? []))
      .catch(() => active && setLogs([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);
  const transactionRows = transactions.map((t) => ({
      id: `tx-${t.id}`,
      occurredAt: t.timestamp || `${t.date}T00:00:00`,
      action: t.type,
      site: t.site,
      actor: t.by,
      role: "Inventory user",
      subject: `${itemName(t.code)} (${t.code})`,
      reference: `${t.reference || t.reason || t.person || "—"}${t.verifiedAt ? ` · Verified by ${t.verifiedBy} (${t.verificationRole}) at ${new Date(t.verifiedAt).toLocaleString()} · ${t.verificationNote}` : ""}`,
      before: t.previousQty === undefined ? "—" : formatQty(t.previousQty),
      change: `${t.qty > 0 ? "+" : ""}${formatQty(t.qty)}`,
      after: t.newQty === undefined ? "—" : formatQty(t.newQty),
      status: `${t.status}${t.verifiedAt ? " · Digitally verified" : " · Verification pending"}`,
    })),
    systemRows = logs.map((log) => {
      let summary: Record<string, unknown> = {};
      try {
        summary = JSON.parse(log.summary) as Record<string, unknown>;
      } catch {}
      const adjustment =
        summary.latestAdjustment && typeof summary.latestAdjustment === "object"
          ? (summary.latestAdjustment as Record<string, unknown>)
          : undefined;
      const details = Object.entries(summary)
        .filter(([, value]) => value !== undefined && typeof value !== "object")
        .map(([key, value]) => `${key}: ${String(value)}`)
        .join(" · ");
      return {
        id: `audit-${log.id}`,
        occurredAt: log.occurredAt,
        action: log.action,
        site: String(adjustment?.site ?? summary.site ?? "System"),
        actor: log.actorEmail,
        role: log.actorRole,
        subject: String(
          adjustment?.code ??
            summary.itemCode ??
            summary.email ??
            "Application state",
        ),
        reference: String(
          adjustment?.reference ?? adjustment?.reason ?? details ?? "—",
        ),
        before: String(adjustment?.previousQty ?? log.fromRevision),
        change: adjustment
          ? `${Number(adjustment.requestedQty ?? 0) - Number(adjustment.previousQty ?? 0) >= 0 ? "+" : ""}${Number(adjustment.requestedQty ?? 0) - Number(adjustment.previousQty ?? 0)}`
          : `Revision +${log.toRevision - log.fromRevision}`,
        after: String(adjustment?.requestedQty ?? log.toRevision),
        status: String(adjustment?.status ?? "Recorded"),
      };
    }),
    rows = [...transactionRows, ...systemRows].sort((a, b) =>
      b.occurredAt.localeCompare(a.occurredAt),
    ),
    actions = Array.from(new Set(rows.map((row) => row.action))).sort(),
    reportSites = Array.from(
      new Set(rows.map((row) => row.site).filter(Boolean)),
    ).sort(),
    filtered = rows.filter((row) => {
      const date = row.occurredAt.slice(0, 10);
      return (
        (!from || date >= from) &&
        (!to || date <= to) &&
        (site === "ALL" || row.site === site) &&
        (action === "ALL" || row.action === action) &&
        `${row.actor} ${row.role}`.toLowerCase().includes(actor.toLowerCase())
      );
    });
  const auditExportRows: Array<Array<string | number>> = [
      [
        "Date & Time",
        "Action",
        "Site",
        "User",
        "Role",
        "Subject",
        "Reference / Detail",
        "Before",
        "Change",
        "After",
        "Status",
      ],
      ...filtered.map((row) => [
        row.occurredAt,
        row.action,
        row.site,
        row.actor,
        row.role,
        row.subject,
        row.reference,
        row.before,
        row.change,
        row.after,
        row.status,
      ]),
    ];
  const exportAudit = () => downloadCsv(`mcb-audit-${nowDate()}.csv`, auditExportRows);
  const exportAuditExcel = () => downloadXlsx(`MCB_Complete_Audit_${nowDate()}.xlsx`, [{ name: "Complete Audit", rows: auditExportRows }]);
  return (
    <article className="panel audit-report">
      <div className="panel-head register-head">
        <div>
          <span className="eyebrow">COMPLETE AUDIT REPORT</span>
          <h3>Operational and access history</h3>
          <small>
            Stock, users, roles, profiles, BOM, equipment, transfers and
            approvals.
          </small>
        </div>
        <div className="export-button-group"><button className="secondary" onClick={exportAudit} disabled={!filtered.length}>Export CSV</button><button className="primary" onClick={exportAuditExcel} disabled={!filtered.length}>Export Excel</button></div>
      </div>
      <div className="audit-filters">
        <label>
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <label>
          Site
          <select value={site} onChange={(e) => setSite(e.target.value)}>
            <option>ALL</option>
            {reportSites.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Action
          <select value={action} onChange={(e) => setAction(e.target.value)}>
            <option>ALL</option>
            {actions.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="audit-user-filter">
          User
          <input
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            placeholder="Email, name or role"
          />
        </label>
        <span className="record-count">{filtered.length} records</span>
      </div>
      {loading ? (
        <Empty text="Loading complete audit history…" />
      ) : filtered.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date & time</th>
                <th>Action</th>
                <th>Site</th>
                <th>User</th>
                <th>Subject</th>
                <th>Reference / Detail</th>
                <th>Before</th>
                <th>Change</th>
                <th>After</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>
                      {new Date(row.occurredAt).toLocaleDateString()}
                    </strong>
                    <small>
                      {new Date(row.occurredAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </small>
                  </td>
                  <td>
                    <strong>{row.action}</strong>
                  </td>
                  <td>
                    <span className="site-tag">{row.site}</span>
                  </td>
                  <td>
                    <strong>{row.actor}</strong>
                    <small>{row.role}</small>
                  </td>
                  <td>{row.subject}</td>
                  <td>{row.reference}</td>
                  <td className="qty">{row.before}</td>
                  <td className="qty">{row.change}</td>
                  <td className="qty">{row.after}</td>
                  <td>
                    <span className="status ok">{row.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty text="No audit records match these filters." />
      )}
    </article>
  );
}
function SupplierMaster({
  suppliers,
  setSuppliers,
  transactions,
  canEdit,
  flash,
}: {
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  transactions: Tx[];
  canEdit: boolean;
  flash: (message: string) => void;
}) {
  const empty: Supplier = {
    id: "",
    name: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
    taxId: "",
    status: "Active",
  };
  const [draft, setDraft] = useState<Supplier>(empty),
    [editingId, setEditingId] = useState(""),
    [error, setError] = useState(""),
    [selectedSupplier, setSelectedSupplier] = useState("ALL");
  const save = (event: FormEvent) => {
    event.preventDefault();
    const next = {
      ...draft,
      id: draft.id.trim().toUpperCase(),
      name: draft.name.trim(),
      email: draft.email.trim().toLowerCase(),
    };
    if (!/^[A-Z0-9-]{3,20}$/.test(next.id) || !next.name) {
      setError("Enter a valid Supplier ID and supplier name");
      return;
    }
    if (!editingId && suppliers.some((supplier) => supplier.id === next.id)) {
      setError("This Supplier ID already exists");
      return;
    }
    setSuppliers((list) =>
      editingId
        ? list.map((supplier) => (supplier.id === editingId ? next : supplier))
        : [next, ...list],
    );
    setDraft(empty);
    setEditingId("");
    setError("");
    flash(editingId ? "Supplier information updated" : "New supplier added");
  };
  const purchaseHistory = transactions.filter(
    (transaction) =>
      transaction.type === "STOCK IN" &&
      (selectedSupplier === "ALL" ||
        transaction.supplierId === selectedSupplier),
  );
  const supplierHistoryRows: Array<Array<string | number>> = [
      [
        "Date",
        "Supplier ID",
        "Supplier",
        "Site",
        "Material Code",
        "Material",
        "Quantity",
        "Delivery / PO Reference",
        "Received By",
      ],
      ...purchaseHistory.map((transaction) => [
        transaction.date,
        transaction.supplierId ?? "Unassigned",
        suppliers.find((supplier) => supplier.id === transaction.supplierId)
          ?.name ?? "Historical / unassigned",
        transaction.site,
        transaction.code,
        itemName(transaction.code),
        transaction.qty,
        transaction.reference ?? "",
        transaction.person ?? "",
      ]),
    ];
  const exportHistory = () => downloadCsv(`MCB_Supplier_Purchases_${nowDate()}.csv`, supplierHistoryRows);
  const exportHistoryExcel = () => downloadXlsx(`MCB_Supplier_Purchases_${nowDate()}.xlsx`, [{ name: "Supplier Purchases", rows: supplierHistoryRows }]);
  return (
    <div className="supplier-master-layout">
      {canEdit && (
        <form
          className={`panel supplier-master-form ${editingId ? "editing" : ""}`}
          onSubmit={save}
        >
          <div className="supplier-form-head">
            <span className="eyebrow">SUPPLIER MASTER</span>
            <h3>{editingId ? `Edit ${editingId}` : "Add approved supplier"}</h3>
            <p>Maintain supplier identity, contacts, tax details and status.</p>
          </div>
          <label>
            Supplier ID
            <input
              required
              disabled={Boolean(editingId)}
              value={draft.id}
              onChange={(e) =>
                setDraft({ ...draft, id: e.target.value.toUpperCase() })
              }
              placeholder="SUP-002"
            />
          </label>
          <label>
            Supplier name
            <input
              required
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>
          <label>
            Contact person
            <input
              value={draft.contactPerson}
              onChange={(e) =>
                setDraft({ ...draft, contactPerson: e.target.value })
              }
            />
          </label>
          <label>
            Phone
            <input
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
            />
          </label>
          <label>
            Tax / VAT ID
            <input
              value={draft.taxId}
              onChange={(e) => setDraft({ ...draft, taxId: e.target.value })}
            />
          </label>
          <label className="supplier-address">
            Address
            <input
              value={draft.address}
              onChange={(e) => setDraft({ ...draft, address: e.target.value })}
            />
          </label>
          <label>
            Status
            <select
              value={draft.status}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  status: e.target.value as Supplier["status"],
                })
              }
            >
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </label>
          {error && (
            <div className="form-error supplier-form-error">{error}</div>
          )}
          <div className="supplier-form-actions">
            {editingId && (
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setEditingId("");
                  setDraft(empty);
                  setError("");
                }}
              >
                Cancel
              </button>
            )}
            <button type="submit" className="primary">
              {editingId ? "Save supplier" : "+ Add supplier"}
            </button>
          </div>
        </form>
      )}
      <article className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">APPROVED VENDOR DIRECTORY</span>
            <h3>Supplier register</h3>
          </div>
          <span className="record-count">
            {
              suppliers.filter((supplier) => supplier.status === "Active")
                .length
            }{" "}
            active
          </span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Supplier</th>
                <th>Contact</th>
                <th>Address</th>
                <th>Tax information</th>
                <th>Linked items</th>
                <th>Status</th>
                {canEdit && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td className="code">{supplier.id}</td>
                  <td>
                    <strong>{supplier.name}</strong>
                    <small>{supplier.email || "—"}</small>
                  </td>
                  <td>
                    <strong>{supplier.contactPerson || "—"}</strong>
                    <small>{supplier.phone || "—"}</small>
                  </td>
                  <td>{supplier.address || "—"}</td>
                  <td>{supplier.taxId || "—"}</td>
                  <td>
                    {
                      items.filter((item) =>
                        (item.supplierIds ?? []).includes(supplier.id),
                      ).length
                    }
                  </td>
                  <td>
                    <span
                      className={`status ${supplier.status === "Active" ? "ok" : "danger"}`}
                    >
                      {supplier.status}
                    </span>
                  </td>
                  {canEdit && (
                    <td>
                      <button
                        type="button"
                        className="table-action"
                        onClick={() => {
                          setEditingId(supplier.id);
                          setDraft(supplier);
                          setError("");
                        }}
                      >
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
      <article className="panel">
        <div className="panel-head register-head">
          <div>
            <span className="eyebrow">PURCHASING HISTORY</span>
            <h3>Stock receipts by supplier</h3>
          </div>
          <div className="register-tools">
            <select
              className="compact-select"
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
            >
              <option value="ALL">ALL SUPPLIERS</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.id} — {supplier.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="secondary"
              onClick={exportHistory}
              disabled={!purchaseHistory.length}
            >
              Export CSV
            </button>
            <button type="button" className="secondary" onClick={exportHistoryExcel} disabled={!purchaseHistory.length}>Export Excel</button>
            <span className="record-count">
              {purchaseHistory.length} receipts
            </span>
          </div>
        </div>
        {purchaseHistory.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Supplier</th>
                  <th>Site</th>
                  <th>Material</th>
                  <th>Quantity</th>
                  <th>Delivery / PO</th>
                  <th>Received by</th>
                </tr>
              </thead>
              <tbody>
                {purchaseHistory.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{transaction.date}</td>
                    <td>
                      <strong>
                        {suppliers.find(
                          (supplier) => supplier.id === transaction.supplierId,
                        )?.name ?? "Historical / unassigned"}
                      </strong>
                      <small className="code">
                        {transaction.supplierId ?? "—"}
                      </small>
                    </td>
                    <td>
                      <span className="site-tag">{transaction.site}</span>
                    </td>
                    <td>
                      <strong>{itemName(transaction.code)}</strong>
                      <small className="code">{transaction.code}</small>
                    </td>
                    <td className="positive qty">
                      +{formatQty(transaction.qty)}
                    </td>
                    <td>{transaction.reference || "—"}</td>
                    <td>{transaction.person || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text="No supplier-linked Stock In receipts yet." />
        )}
      </article>
    </div>
  );
}

function ProjectSiteMaster({
  records,
  setRecords,
  setStock,
  flash,
  canEdit,
}: {
  records: ProjectSite[];
  setRecords: (records: ProjectSite[]) => void;
  setStock: (update: (previous: Stock) => Stock) => void;
  flash: (message: string) => void;
  canEdit: boolean;
}) {
  const empty: ProjectSite = {
    code: "",
    name: "",
    location: "",
    manager: "",
    startDate: "",
    status: "Active",
  };
  const [editingCode, setEditingCode] = useState(""),
    [draft, setDraft] = useState<ProjectSite>(empty),
    [error, setError] = useState("");
  const save = (event: FormEvent) => {
    event.preventDefault();
    const next = {
      ...draft,
      code: draft.code.trim().toUpperCase(),
      name: draft.name.trim(),
    };
    if (!/^[A-Z0-9-]{2,12}$/.test(next.code)) {
      setError("Site code must use 2–12 capital letters, numbers or hyphens");
      return;
    }
    if (!next.name) {
      setError("Enter the project or site name");
      return;
    }
    if (!editingCode && records.some((site) => site.code === next.code)) {
      setError("This site code already exists");
      return;
    }
    const updated = editingCode
      ? records.map((site) => (site.code === editingCode ? next : site))
      : [next, ...records];
    setRecords(updated);
    sites = updated
      .filter((site) => site.status === "Active")
      .map((site) => site.code);
    if (!editingCode)
      setStock((previous) => ({
        ...previous,
        [next.code]: {},
      }));
    setDraft(empty);
    setEditingCode("");
    setError("");
    flash(
      editingCode
        ? "Project/site information updated"
        : "New project/site activated",
    );
  };
  const edit = (site: ProjectSite) => {
    setEditingCode(site.code);
    setDraft(site);
    setError("");
  };
  const changeStatus = (record: ProjectSite) => {
    if (
      record.status === "Active" &&
      records.filter((site) => site.status === "Active").length === 1
    ) {
      setError("At least one site must remain active");
      return;
    }
    const status = record.status === "Active" ? "Closed" : "Active";
    const updated = records.map((site) =>
      site.code === record.code ? { ...site, status } : site,
    ) as ProjectSite[];
    setRecords(updated);
    sites = updated
      .filter((site) => site.status === "Active")
      .map((site) => site.code);
    flash(`${record.code} is now ${status.toLowerCase()}`);
  };
  return (
    <div className="site-master-layout">
      {canEdit && (
        <form
          className={`panel site-master-form ${editingCode ? "editing" : ""}`}
          onSubmit={save}
        >
          <div>
            <span className="eyebrow">PROJECT/SITE MASTER</span>
            <h3>
              {editingCode ? `Edit ${editingCode}` : "Add a project or site"}
            </h3>
            <p>
              Live site records feed every inventory dropdown and user
              assignment.
            </p>
          </div>
          <label>
            Site code
            <input
              required
              disabled={Boolean(editingCode)}
              value={draft.code}
              onChange={(e) =>
                setDraft({ ...draft, code: e.target.value.toUpperCase() })
              }
              placeholder="Example: BF6A"
            />
          </label>
          <label>
            Project/site name
            <input
              required
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>
          <label>
            Location
            <input
              value={draft.location}
              onChange={(e) => setDraft({ ...draft, location: e.target.value })}
            />
          </label>
          <label>
            Site manager
            <input
              value={draft.manager}
              onChange={(e) => setDraft({ ...draft, manager: e.target.value })}
            />
          </label>
          <label>
            Start date
            <input
              type="date"
              value={draft.startDate}
              onChange={(e) =>
                setDraft({ ...draft, startDate: e.target.value })
              }
            />
          </label>
          <label>
            Status
            <select
              value={draft.status}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  status: e.target.value as ProjectSite["status"],
                })
              }
            >
              <option>Active</option>
              <option>Closed</option>
            </select>
          </label>
          {error && <div className="form-error site-master-error">{error}</div>}
          <div className="site-master-actions">
            {editingCode && (
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setEditingCode("");
                  setDraft(empty);
                  setError("");
                }}
              >
                Cancel
              </button>
            )}
            <button className="primary" type="submit">
              {editingCode ? "Save changes" : "+ Add site"}
            </button>
          </div>
        </form>
      )}
      <article className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">LIVE SITE DIRECTORY</span>
            <h3>Projects, sites and warehouses</h3>
            <small>
              Closed sites retain all historical stock and transaction records.
            </small>
          </div>
          <span className="record-count">
            {records.filter((site) => site.status === "Active").length} active ·{" "}
            {records.filter((site) => site.status === "Closed").length} closed
          </span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Project/site</th>
                <th>Location</th>
                <th>Manager</th>
                <th>Start date</th>
                <th>Status</th>
                {canEdit && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {records.map((site) => (
                <tr key={site.code}>
                  <td>
                    <strong className="code">{site.code}</strong>
                  </td>
                  <td>
                    <strong>{site.name}</strong>
                  </td>
                  <td>{site.location || "—"}</td>
                  <td>{site.manager || "—"}</td>
                  <td>{site.startDate || "—"}</td>
                  <td>
                    <span
                      className={`status ${site.status === "Active" ? "ok" : "warn"}`}
                    >
                      {site.status}
                    </span>
                  </td>
                  {canEdit && (
                    <td>
                      <div className="site-row-actions">
                        <button
                          type="button"
                          className="table-action"
                          onClick={() => edit(site)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className={`table-action ${site.status === "Active" ? "close-site" : "activate-site"}`}
                          onClick={() => changeStatus(site)}
                        >
                          {site.status === "Active" ? "Close" : "Activate"}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}
function HelpAndSop({ role, allowed, onNavigate }: { role: Role; allowed: View[]; onNavigate: (view: View) => void }) {
  const [guideRole, setGuideRole] = useState<Role>(role),
    displayedRole = role === "Developer" ? guideRole : role,
    displayedAccess = roleViews[displayedRole];
  const guides: Record<Role, Array<{ title: string; text: string; view: View }>> = {
    Admin: [
      { title: "Review approvals", text: "Open Alerts and decide pending adjustments, stock counts and user registrations.", view: "Alerts" },
      { title: "Maintain master data", text: "Control items, sites, suppliers, roles and Cost Code links before operations begin.", view: "Item Master" },
      { title: "Correct posted records", text: "Use linked reversal and correction entries. Never remove a posted transaction.", view: "Transactions" },
      { title: "Protect company data", text: "Export a complete backup and review automatic revision history regularly.", view: "Backup & Recovery" },
    ],
    Developer: [
      { title: "Full system access", text: "Inspect and operate every module while preserving permanent transaction and audit controls.", view: "Dashboard" },
      { title: "Manage users and roles", text: "Create users, assign any role and control access across one or multiple sites.", view: "User Access" },
      { title: "Diagnose operations", text: "Use the complete audit report, notifications and management reports to trace data issues.", view: "Audit Report" },
      { title: "Protect and recover", text: "Export complete backups, restore validated data and review automatic version history.", view: "Backup & Recovery" },
    ],
    "Stock Controller": [
      { title: "Verify deliveries", text: "Review pending Stock In evidence and post only accepted quantities within approved BOM.", view: "Stock In" },
      { title: "Post daily issues", text: "Enter and validate each Daily Stock Out batch against Available Stock and approved BOM.", view: "Stock Out" },
      { title: "Control transfers", text: "Review reservations, dispatch, receipts and quantity mismatches for assigned sites.", view: "Site Transfer" },
      { title: "Review counts", text: "Manage recounts and approve final physical-count variances with a complete audit trail.", view: "Stock Count" },
    ],
    Stockkeeper: [
      { title: "Receive material", text: "Verify delivery reference, supplier, site, item, quantity and QS Cost Code before Stock In.", view: "Stock In" },
      { title: "Issue material", text: "Select an approved QS Cost Code and confirm available stock before Stock Out.", view: "Stock Out" },
      { title: "Transfer between sites", text: "Dispatch with reference and approver; destination confirms receipt before its stock increases.", view: "Site Transfer" },
      { title: "Count and adjust", text: "Submit stock counts or quantity-adjustment requests. Management approval changes the balance.", view: "Stock Count" },
    ],
    "Site Team": [
      { title: "Review site stock", text: "View current material availability for assigned sites without changing posted balances.", view: "Current Stock" },
      { title: "Review movement", text: "Trace posted site transactions and their references for construction coordination.", view: "Transactions" },
      { title: "Monitor exceptions", text: "Follow site alerts and pending actions routed to responsible control roles.", view: "Alerts" },
      { title: "Follow procedures", text: "Use the role guide to understand responsibilities and escalation routes.", view: "Help & SOP" },
    ],
    QS: [
      { title: "Maintain BOM control", text: "Select Level 2 and Level 3 Cost Codes, link exact materials and set approved quantities.", view: "BOM Control" },
      { title: "Check actual usage", text: "Compare BOM approved versus used and investigate negative balances or exceptions.", view: "Reports" },
      { title: "Review item links", text: "Confirm every Material Code is linked to the correct QS Cost Code before site issuing.", view: "Item Master" },
      { title: "Monitor exceptions", text: "Review No Approved BOM and Over BOM activity in the notification centre.", view: "Alerts" },
    ],
    Management: [
      { title: "Approve controlled changes", text: "Review evidence, reference and reason before approving adjustments and stock-count variances.", view: "Alerts" },
      { title: "Review monthly performance", text: "Use management reports for valuation, movement, consumption, BOM and equipment exceptions.", view: "Reports" },
      { title: "Inspect audit history", text: "Filter by date, site, user and action to verify before, change and after values.", view: "Audit Report" },
      { title: "Protect records", text: "Export periodic complete backups. Restore remains restricted to the Developer.", view: "Backup & Recovery" },
    ],
    PM: [
      { title: "Monitor project stock", text: "Review project-level stock, movement and operational exceptions without posting transactions.", view: "Dashboard" },
      { title: "Review reports", text: "Use project reports to monitor valuation, consumption, BOM and equipment exceptions.", view: "Reports" },
      { title: "Inspect exceptions", text: "Review alerts and escalation items requiring project coordination.", view: "Alerts" },
      { title: "Trace decisions", text: "Use the audit report to review who changed controlled records and when.", view: "Audit Report" },
    ],
  };
  const permissions: Array<{ module: View; purpose: string }> = [
    { module: "Item Master", purpose: "Material catalogue and photos" },
    { module: "BOM Control", purpose: "QS budget and material links" },
    { module: "Current Stock", purpose: "Live site balances and adjustments" },
    { module: "Stock Count", purpose: "Physical count and variance approval" },
    { module: "Transactions", purpose: "Permanent posted activity" },
    { module: "Reports", purpose: "Management reporting and export" },
    { module: "Backup & Recovery", purpose: "Data protection and history" },
    { module: "User Access", purpose: "Roles, sites and approvals" },
  ];
  return (
    <div className="help-sop-layout">
      <article className="panel sop-hero"><div><span className="eyebrow">ROLE WORKSPACE GUIDE</span><h3>{displayedRole} standard operating procedure</h3><p>{role === "Developer" ? "Developer can review every role workflow and open every module." : "Follow these controls to keep stock balances, BOM usage and audit records accurate."}</p></div><span className={`role-pill ${displayedRole === "Developer" ? "developer-role" : ""}`}>{displayedRole}</span></article>
      {role === "Developer" && <div className="developer-guide-tabs" role="tablist" aria-label="Role workflow guides">{(["Developer", "Admin", "Management", "QS", "Stockkeeper"] as Role[]).map((option) => <button type="button" role="tab" aria-selected={displayedRole === option} className={displayedRole === option ? "active" : ""} key={option} onClick={() => setGuideRole(option)}><span>{option === "Developer" ? "⌘" : option === "Admin" ? "A" : option === "Management" ? "M" : option === "QS" ? "Q" : "S"}</span>{option}</button>)}</div>}
      <div className="sop-step-grid">{guides[displayedRole].map((guide, index) => <button type="button" key={guide.title} onClick={() => allowed.includes(guide.view) && onNavigate(guide.view)}><b>{index + 1}</b><span><strong>{guide.title}</strong><small>{guide.text}</small></span><i>Open {guide.view} →</i></button>)}</div>
      <article className="panel sop-rules"><div className="panel-head"><div><span className="eyebrow">MANDATORY CONTROL RULES</span><h3>Rules for every user</h3></div></div><div className="sop-rule-grid"><div><b>01</b><strong>Never delete posted records</strong><small>Reverse or correct with a reason, reference and approver.</small></div><div><b>02</b><strong>Use exact site and item codes</strong><small>Verify the live dropdown selection before saving any movement.</small></div><div><b>03</b><strong>Respect approval separation</strong><small>The requester must not approve their own controlled stock change.</small></div><div><b>04</b><strong>Keep evidence</strong><small>Every delivery, issue, transfer and correction requires a traceable reference.</small></div></div></article>
      <article className="panel"><div className="panel-head"><div><span className="eyebrow">ROLE ACCESS</span><h3>Available modules for {displayedRole}</h3></div><span className="record-count">{displayedAccess.length} modules</span></div><div className="permission-guide-grid">{permissions.map((entry) => <div key={entry.module} className={displayedAccess.includes(entry.module) ? "enabled" : "locked"}><span>{displayedAccess.includes(entry.module) ? "✓" : "×"}</span><div><strong>{entry.module}</strong><small>{entry.purpose}</small></div><b>{displayedAccess.includes(entry.module) ? "AVAILABLE" : "RESTRICTED"}</b></div>)}</div></article>
    </div>
  );
}
type InventoryBackup = {
  format: "MCB-INVENTORY-BACKUP";
  schemaVersion: 1;
  createdAt: string;
  sourceRevision: number;
  items: Item[];
  stock: Stock;
  transactions: Tx[];
  equipment: Equipment[];
  bom: BomLine[];
  adjustments: StockAdjustment[];
  sites: ProjectSite[];
  costCodeLinks: CostCodeLink[];
  suppliers: Supplier[];
  stockCounts: StockCountSession[];
  integrityHash?: string;
};
function BackupRecovery({
  stock,
  transactions,
  equipment,
  bom,
  adjustments,
  siteRecords,
  costCodeLinks,
  suppliers,
  stockCounts,
  revision,
  canRestore,
  onRestore,
}: {
  stock: Stock;
  transactions: Tx[];
  equipment: Equipment[];
  bom: BomLine[];
  adjustments: StockAdjustment[];
  siteRecords: ProjectSite[];
  costCodeLinks: CostCodeLink[];
  suppliers: Supplier[];
  stockCounts: StockCountSession[];
  revision: number;
  canRestore: boolean;
  onRestore: (backup: InventoryBackup) => void;
}) {
  const [integrityCheckedAt] = useState(() => Date.now());
  const [history, setHistory] = useState<SystemAudit[]>([]),
    [selected, setSelected] = useState<InventoryBackup | null>(null),
    [selectedName, setSelectedName] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [error, setError] = useState(""),
    [restoring, setRestoring] = useState(false);
  const fingerprint = (value: Omit<InventoryBackup, "integrityHash">) => {
    const text = JSON.stringify(value); let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) { hash ^= text.charCodeAt(index); hash = Math.imul(hash, 16777619); }
    return `MCB-${(hash >>> 0).toString(16).padStart(8, "0").toUpperCase()}`;
  };
  const currentBackup = (): InventoryBackup => {
    const payload: Omit<InventoryBackup, "integrityHash"> = { format: "MCB-INVENTORY-BACKUP", schemaVersion: 1, createdAt: new Date().toISOString(), sourceRevision: revision, items, stock, transactions, equipment, bom, adjustments, sites: siteRecords, costCodeLinks, suppliers, stockCounts };
    return { ...payload, integrityHash: fingerprint(payload) };
  };
  type IntegrityIssue = { severity: "Critical" | "Warning"; area: string; record: string; detail: string };
  const duplicateValues = (values: string[]) => Array.from(new Set(values.filter((value, index) => values.indexOf(value) !== index)));
  const activeSiteCodes = new Set(siteRecords.filter((site) => site.status === "Active").map((site) => site.code));
  const allSiteCodes = new Set(siteRecords.map((site) => site.code));
  const itemCodes = new Set(items.map((item) => item.code));
  const validCostCodes = new Set(costCodeLevel3.map((entry) => entry.code));
  const integrityIssues: IntegrityIssue[] = [
    ...duplicateValues(items.map((item) => item.code)).map((code) => ({ severity: "Critical" as const, area: "Item Master", record: code, detail: "Duplicate item code" })),
    ...duplicateValues(transactions.map((entry) => entry.id)).map((id) => ({ severity: "Critical" as const, area: "Transactions", record: id, detail: "Duplicate transaction ID" })),
    ...transactions.filter((entry) => !itemCodes.has(entry.code)).map((entry) => ({ severity: "Critical" as const, area: "Transactions", record: entry.id, detail: `Unknown item code ${entry.code}` })),
    ...transactions.filter((entry) => !allSiteCodes.has(entry.site)).map((entry) => ({ severity: "Warning" as const, area: "Transactions", record: entry.id, detail: `Unknown source site ${entry.site}` })),
    ...transactions.filter((entry) => entry.other && !allSiteCodes.has(entry.other)).map((entry) => ({ severity: "Warning" as const, area: "Transfers", record: entry.id, detail: `Unknown destination site ${entry.other}` })),
    ...transactions.filter((entry) => entry.previousQty !== undefined && entry.newQty !== undefined && Math.abs(entry.previousQty + entry.qty - entry.newQty) > 0.0001).map((entry) => ({ severity: "Critical" as const, area: "Transactions", record: entry.id, detail: `Balance equation mismatch: ${entry.previousQty} + ${entry.qty} ≠ ${entry.newQty}` })),
    ...costCodeLinks.filter((link) => !itemCodes.has(link.itemCode) || !validCostCodes.has(link.costCode)).map((link) => ({ severity: "Warning" as const, area: "Cost Code Links", record: `${link.costCode} → ${link.itemCode}`, detail: !itemCodes.has(link.itemCode) ? "Linked item does not exist" : "Linked Level 3 cost code does not exist" })),
    ...Object.entries(stock).flatMap(([site, balances]) => Object.entries(balances).filter(([, qty]) => qty < 0).map(([code, qty]) => ({ severity: "Critical" as const, area: "Current Stock", record: `${site} · ${code}`, detail: `Negative balance ${formatQty(qty)}` }))),
    ...Object.entries(stock).flatMap(([site, balances]) => activeSiteCodes.has(site) ? [] : Object.entries(balances).filter(([, qty]) => qty !== 0).map(([code, qty]) => ({ severity: "Warning" as const, area: "Project/Site", record: `${site} · ${code}`, detail: `Inactive or unknown site retains ${formatQty(qty)} units` }))),
    ...adjustments.filter((entry) => entry.status === "Pending" && integrityCheckedAt - new Date(entry.requestedAt).getTime() > 7 * 86400000).map((entry) => ({ severity: "Warning" as const, area: "Approvals", record: entry.id, detail: "Stock adjustment pending more than 7 days" })),
  ];
  const criticalIssues = integrityIssues.filter((issue) => issue.severity === "Critical");
  const integrityExportRows: Array<Array<string>> = [["Severity", "Area", "Record", "Detail"], ...integrityIssues.map((issue) => [issue.severity, issue.area, issue.record, issue.detail])];
  function downloadBackup(backup = currentBackup(), prefix = "MCB_Complete_Backup") {
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }),
      link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${prefix}_${nowDate()}_R${backup.sourceRevision}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }
  useEffect(() => {
    fetch("/api/audit", { cache: "no-store" })
      .then((response) => (response.ok ? readJson<{ logs?: SystemAudit[] }>(response) : { logs: [] }))
      .then((data) => setHistory(data.logs ?? []))
      .catch(() => setHistory([]));
  }, []);
  async function selectBackup(event: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    setSelected(null);
    setConfirmation("");
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as Partial<InventoryBackup>;
      if (
        parsed.format !== "MCB-INVENTORY-BACKUP" ||
        parsed.schemaVersion !== 1 ||
        !Array.isArray(parsed.items) ||
        !parsed.stock ||
        !Array.isArray(parsed.transactions) ||
        !Array.isArray(parsed.sites)
      )
        throw new Error("This is not a valid MCB complete backup file.");
      if (parsed.integrityHash) {
        const { integrityHash, ...payload } = parsed as InventoryBackup;
        if (integrityHash !== fingerprint(payload)) throw new Error("Backup integrity check failed. The file may be incomplete or modified.");
      }
      setSelected(parsed as InventoryBackup);
      setSelectedName(file.name);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Backup validation failed");
    }
  }
  function restore() {
    if (!selected || confirmation !== "RESTORE") return;
    setRestoring(true);
    downloadBackup(currentBackup(), "MCB_Pre_Restore_Safety_Backup");
    onRestore(selected);
    setSelected(null);
    setSelectedName("");
    setConfirmation("");
    setRestoring(false);
  }
  return (
    <div className="backup-layout">
      <article className="panel backup-hero">
        <div>
          <span className="eyebrow">DATA PROTECTION</span>
          <h3>Backup and Recovery</h3>
          <p>Export the complete operating database and restore a validated backup without deleting the audit trail.</p>
        </div>
        <div className="backup-health"><span className="status ok">PROTECTED</span><strong>Revision {revision}</strong><small>Automatic history is recorded after every shared-data save.</small></div>
      </article>
      <div className="backup-actions-grid">
        <article className="panel backup-action-card">
          <span className="backup-action-icon">↓</span>
          <div><span className="eyebrow">COMPLETE EXPORT</span><h3>Download current backup</h3><p>Items, stock, transactions, BOM, equipment, sites, suppliers, counts and approvals are included.</p></div>
          <div className="backup-stats"><span><b>{items.length}</b> items</span><span><b>{transactions.length}</b> transactions</span><span><b>{siteRecords.length}</b> sites</span></div>
          <button type="button" className="primary" onClick={() => downloadBackup()}>Export complete backup</button>
        </article>
        <article className="panel backup-action-card restore-card">
          <span className="backup-action-icon">↻</span>
          <div><span className="eyebrow">CONTROLLED RESTORE</span><h3>Restore selected backup</h3><p>Admin only. The system validates the file and downloads a safety backup before replacing current data.</p></div>
          {canRestore ? <>
            <label className="backup-file-picker">Choose backup file<input type="file" accept="application/json,.json" onChange={selectBackup} /></label>
            {error && <div className="form-error">{error}</div>}
            {selected && <div className="backup-selected"><strong>{selectedName}</strong><small>Created {new Date(selected.createdAt).toLocaleString()} · Revision {selected.sourceRevision} · {selected.items.length} items · {selected.transactions.length} transactions</small><span className={`status ${selected.integrityHash ? "ok" : "warn"}`}>{selected.integrityHash ? `INTEGRITY VERIFIED · ${selected.integrityHash}` : "LEGACY BACKUP · STRUCTURE VALIDATED"}</span><label>Type RESTORE to confirm<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label><button type="button" className="confirm danger-button" disabled={confirmation !== "RESTORE" || restoring} onClick={restore}>{restoring ? "Restoring…" : "Restore backup"}</button></div>}
          </> : <div className="modal-warning">Management may export backups. Only an Admin can restore data.</div>}
        </article>
      </div>
      <article className="panel backup-history">
        <div className="panel-head"><div><span className="eyebrow">AUTOMATIC VERSION HISTORY</span><h3>Recent protected changes</h3><small>Each successful save creates a permanent revision and audit record.</small></div><span className="record-count">{history.length} records</span></div>
        {history.length ? <div className="table-wrap"><table><thead><tr><th>Date & time</th><th>Revision</th><th>Action</th><th>User</th><th>Role</th></tr></thead><tbody>{history.slice(0, 50).map((entry) => <tr key={entry.id}><td>{new Date(entry.occurredAt).toLocaleString()}</td><td><strong>R{entry.fromRevision} → R{entry.toRevision}</strong></td><td>{entry.action}</td><td>{entry.actorEmail}</td><td>{entry.actorRole}</td></tr>)}</tbody></table></div> : <Empty text="No saved revision history is available yet." />}
      </article>
      <article className="panel integrity-center">
        <div className="panel-head"><div><span className="eyebrow">SYSTEM INTEGRITY CENTER</span><h3>Automatic data consistency checks</h3><small>Checks master data, transaction mathematics, stock, site links and approval aging.</small></div><div className="integrity-actions"><span className={`status ${criticalIssues.length ? "danger" : integrityIssues.length ? "warn" : "ok"}`}>{criticalIssues.length ? `${criticalIssues.length} CRITICAL` : integrityIssues.length ? `${integrityIssues.length} WARNINGS` : "ALL CHECKS PASSED"}</span><button type="button" className="secondary" disabled={!integrityIssues.length} onClick={() => downloadCsv(`MCB_Integrity_Report_${nowDate()}.csv`, integrityExportRows)}>Export report</button></div></div>
        <div className="integrity-summary"><div><small>CHECKS RUN</small><strong>10</strong></div><div><small>CRITICAL</small><strong className={criticalIssues.length ? "danger-text" : ""}>{criticalIssues.length}</strong></div><div><small>WARNINGS</small><strong>{integrityIssues.length - criticalIssues.length}</strong></div><div><small>LAST CHECK</small><strong>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong></div></div>
        {integrityIssues.length ? <div className="table-wrap"><table><thead><tr><th>Severity</th><th>Area</th><th>Record</th><th>Finding</th></tr></thead><tbody>{integrityIssues.slice(0, 100).map((issue, index) => <tr key={`${issue.area}-${issue.record}-${index}`}><td><span className={`status ${issue.severity === "Critical" ? "danger" : "warn"}`}>{issue.severity}</span></td><td><strong>{issue.area}</strong></td><td><span className="code">{issue.record}</span></td><td>{issue.detail}</td></tr>)}</tbody></table></div> : <div className="integrity-clear"><b>✓</b><div><strong>No integrity problems detected</strong><small>Master data, transaction balances, stock and links passed all automatic checks.</small></div></div>}
      </article>
    </div>
  );
}
function ManagementReports({
  stock,
  transactions,
  bom,
  equipment,
}: {
  stock: Stock;
  transactions: Tx[];
  bom: BomLine[];
  equipment: Equipment[];
}) {
  type ReportType = "Movement" | "Valuation" | "Cost Code" | "BOM" | "Equipment" | "Monthly";
  const [report, setReport] = useState<ReportType>("Movement"),
    [site, setSite] = useState("ALL"),
    [itemCode, setItemCode] = useState("ALL"),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [month, setMonth] = useState(nowDate().slice(0, 7));
  const movements = transactions.filter(
      (row) =>
        (site === "ALL" || row.site === site) &&
        (itemCode === "ALL" || row.code === itemCode) &&
        (!from || row.date >= from) &&
        (!to || row.date <= to),
    ),
    rateFor = (code: string) => bom.find((line) => line.code === code)?.rate ?? 0,
    valuation = sites.flatMap((siteCode) =>
      items
        .map((item) => {
          const qty = stock[siteCode]?.[item.code] ?? 0,
            rate = rateFor(item.code);
          return { site: siteCode, item, qty, rate, value: qty * rate };
        })
        .filter((row) => row.qty !== 0 && (site === "ALL" || row.site === site) && (itemCode === "ALL" || row.item.code === itemCode)),
    ),
    consumption = Object.values(
      movements
        .filter((row) => row.qty < 0 && row.costCode)
        .reduce<Record<string, { costCode: string; code: string; site: string; qty: number; value: number }>>((result, row) => {
          const key = `${row.site}|${row.costCode}|${row.code}`;
          result[key] ??= { costCode: row.costCode!, code: row.code, site: row.site, qty: 0, value: 0 };
          result[key].qty += Math.abs(row.qty);
          result[key].value += Math.abs(row.qty) * rateFor(row.code);
          return result;
        }, {}),
    ),
    bomComparison = bom
      .filter((line) => (site === "ALL" || line.site === site) && (itemCode === "ALL" || line.code === itemCode))
      .map((line) => {
        const used = transactions
          .filter((row) => row.site === line.site && row.code === line.code && row.costCode === line.costCode && row.qty < 0)
          .reduce((sum, row) => sum + Math.abs(row.qty), 0);
        return { ...line, used, balance: line.approvedQty - used };
      }),
    equipmentExceptions = equipment.filter((row) => ["Lost", "Damaged", "Awaiting Repair", "Under Repair", "Scrapped"].includes(row.status) && (site === "ALL" || row.site === site)),
    monthlyTransactions = transactions.filter((row) => row.date.startsWith(month) && (site === "ALL" || row.site === site)),
    monthlyIn = monthlyTransactions.filter((row) => row.qty > 0).reduce((sum, row) => sum + row.qty, 0),
    monthlyOut = monthlyTransactions.filter((row) => row.qty < 0).reduce((sum, row) => sum + Math.abs(row.qty), 0),
    stockValue = valuation.reduce((sum, row) => sum + row.value, 0);
  function reportRows() {
    let rows: Array<Array<string | number>> = [];
    if (report === "Movement") rows = [["Date", "Type", "Site", "Item Code", "Item", "Reference", "Cost Code", "Previous", "Change", "After", "Status"], ...movements.map((row) => [row.date, row.type, row.site, row.code, itemName(row.code), row.reference ?? "", row.costCode ?? "", row.previousQty ?? "", row.qty, row.newQty ?? "", row.status])];
    if (report === "Valuation") rows = [["Site", "Item Code", "Item", "UOM", "Quantity", "Rate USD", "Value USD"], ...valuation.map((row) => [row.site, row.item.code, row.item.name, row.item.unit, row.qty, row.rate, row.value.toFixed(2)])];
    if (report === "Cost Code") rows = [["Site", "QS Cost Code", "Item Code", "Item", "Consumed Qty", "Value USD"], ...consumption.map((row) => [row.site, row.costCode, row.code, itemName(row.code), row.qty, row.value.toFixed(2)])];
    if (report === "BOM") rows = [["Site", "QS Cost Code", "Item Code", "Approved", "Used", "Balance", "Rate USD"], ...bomComparison.map((row) => [row.site, row.costCode, row.code, row.approvedQty, row.used, row.balance, row.rate])];
    if (report === "Equipment") rows = [["Site", "Equipment", "Borrower", "Qty", "Status", "Expected Return", "Incident"], ...equipmentExceptions.map((row) => [row.site, row.item, row.borrower, row.qty, row.status, row.expected, row.incidentNote ?? row.scrapReason ?? ""])];
    if (report === "Monthly") rows = [["Month", "Site", "Transactions", "Stock In Qty", "Stock Out Qty", "Current Stock Value USD", "Equipment Exceptions"], [month, site, monthlyTransactions.length, monthlyIn, monthlyOut, stockValue.toFixed(2), equipmentExceptions.length]];
    return rows;
  }
  const exportReport = () => downloadCsv(`MCB_${report.replace(" ", "_")}_${nowDate()}.csv`, reportRows());
  const exportReportExcel = () => downloadXlsx(`MCB_${report.replace(" ", "_")}_${nowDate()}.xlsx`, [{ name: report, rows: reportRows() }]);
  return (
    <div className="management-reports">
      <article className="panel report-control-panel">
        <div className="panel-head">
          <div><span className="eyebrow">MANAGEMENT INFORMATION</span><h3>Inventory and project control reports</h3></div>
          <div className="export-button-group"><button type="button" className="secondary" onClick={exportReport}>Export CSV</button><button type="button" className="primary" onClick={exportReportExcel}>Export Excel</button></div>
        </div>
        <div className="report-tabs">
          {(["Movement", "Valuation", "Cost Code", "BOM", "Equipment", "Monthly"] as ReportType[]).map((name) => <button type="button" key={name} className={report === name ? "active" : ""} onClick={() => setReport(name)}>{name}</button>)}
        </div>
        <div className="report-filters">
          <label>Site<select value={site} onChange={(event) => setSite(event.target.value)}><option value="ALL">All sites</option>{sites.map((code) => <option key={code}>{code}</option>)}</select></label>
          {!["Equipment", "Monthly"].includes(report) && <label>Item<select value={itemCode} onChange={(event) => setItemCode(event.target.value)}><option value="ALL">All items</option>{items.map((item) => <option value={item.code} key={item.code}>{item.code} · {item.name}</option>)}</select></label>}
          {report === "Monthly" ? <label>Month<input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></label> : <><label>From<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label>To<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label></>}
        </div>
      </article>
      {report === "Monthly" && <div className="report-kpis"><div><small>TRANSACTIONS</small><strong>{monthlyTransactions.length}</strong></div><div><small>STOCK IN</small><strong>{formatQty(monthlyIn)}</strong></div><div><small>STOCK OUT</small><strong>{formatQty(monthlyOut)}</strong></div><div><small>STOCK VALUE</small><strong>${stockValue.toFixed(2)}</strong></div><div><small>EQUIPMENT EXCEPTIONS</small><strong>{equipmentExceptions.length}</strong></div></div>}
      <article className="panel report-result">
        <div className="panel-head"><div><span className="eyebrow">{report.toUpperCase()} REPORT</span><h3>{report === "Movement" ? "Stock movement by site, item and date" : report === "Valuation" ? "Current stock valuation" : report === "Cost Code" ? "Consumption by QS Cost Code" : report === "BOM" ? "BOM approved versus used" : report === "Equipment" ? "Equipment lost, damaged and repair exceptions" : `Monthly management summary · ${month}`}</h3></div></div>
        {report === "Movement" && (movements.length ? <div className="table-wrap"><table><thead><tr><th>Date</th><th>Type</th><th>Site</th><th>Item</th><th>Reference / Cost Code</th><th>Before</th><th>Change</th><th>After</th><th>Status</th></tr></thead><tbody>{movements.map((row) => <tr key={row.id}><td>{row.date}</td><td>{row.type}</td><td><span className="site-tag">{row.site}</span></td><td><strong>{itemName(row.code)}</strong><small>{row.code}</small></td><td>{row.reference || "—"}<small>{row.costCode || "—"}</small></td><td>{row.previousQty ?? "—"}</td><td className={row.qty < 0 ? "negative qty" : "positive qty"}>{row.qty > 0 ? "+" : ""}{formatQty(row.qty)}</td><td>{row.newQty ?? "—"}</td><td>{row.status}</td></tr>)}</tbody></table></div> : <EmptyReport />)}
        {report === "Valuation" && (valuation.length ? <div className="table-wrap"><table><thead><tr><th>Site</th><th>Item</th><th>UOM</th><th>Quantity</th><th>Rate USD</th><th>Value USD</th></tr></thead><tbody>{valuation.map((row) => <tr key={`${row.site}-${row.item.code}`}><td>{row.site}</td><td><strong>{row.item.name}</strong><small>{row.item.code}</small></td><td>{row.item.unit}</td><td>{formatQty(row.qty)}</td><td>${row.rate.toFixed(2)}</td><td><strong>${row.value.toFixed(2)}</strong></td></tr>)}</tbody><tfoot><tr><th colSpan={5}>Total value</th><th>${stockValue.toFixed(2)}</th></tr></tfoot></table></div> : <EmptyReport />)}
        {report === "Cost Code" && (consumption.length ? <div className="table-wrap"><table><thead><tr><th>Site</th><th>QS Cost Code</th><th>Item</th><th>Consumed Qty</th><th>Value USD</th></tr></thead><tbody>{consumption.map((row) => <tr key={`${row.site}-${row.costCode}-${row.code}`}><td>{row.site}</td><td>{row.costCode}</td><td>{itemName(row.code)}<small>{row.code}</small></td><td>{formatQty(row.qty)}</td><td>${row.value.toFixed(2)}</td></tr>)}</tbody></table></div> : <EmptyReport />)}
        {report === "BOM" && (bomComparison.length ? <div className="table-wrap"><table><thead><tr><th>Site</th><th>QS Cost Code</th><th>Item</th><th>Approved</th><th>Used</th><th>Balance</th><th>Status</th></tr></thead><tbody>{bomComparison.map((row) => <tr key={row.id}><td>{row.site}</td><td>{row.costCode}</td><td>{itemName(row.code)}<small>{row.code}</small></td><td>{formatQty(row.approvedQty)}</td><td>{formatQty(row.used)}</td><td className={row.balance < 0 ? "negative qty" : "qty"}>{formatQty(row.balance)}</td><td><span className={`status ${row.balance < 0 ? "danger" : "ok"}`}>{row.balance < 0 ? "OVER BOM" : "CONTROLLED"}</span></td></tr>)}</tbody></table></div> : <EmptyReport />)}
        {report === "Equipment" && (equipmentExceptions.length ? <div className="table-wrap"><table><thead><tr><th>Site</th><th>Equipment</th><th>Borrower</th><th>Qty</th><th>Expected</th><th>Status</th><th>Incident</th></tr></thead><tbody>{equipmentExceptions.map((row) => <tr key={row.id}><td>{row.site}</td><td>{row.item}<small>{row.code}</small></td><td>{row.borrower}</td><td>{row.qty}</td><td>{row.expected}</td><td><span className="status danger">{row.status}</span></td><td>{row.incidentNote || row.scrapReason || "—"}</td></tr>)}</tbody></table></div> : <EmptyReport />)}
        {report === "Monthly" && (monthlyTransactions.length ? <div className="monthly-summary-note"><strong>{month} operating summary</strong><p>{monthlyTransactions.length} posted transactions recorded {formatQty(monthlyIn)} units in and {formatQty(monthlyOut)} units out. Current filtered stock value is ${stockValue.toFixed(2)}, with {equipmentExceptions.length} equipment exceptions requiring management attention.</p></div> : <EmptyReport />)}
      </article>
    </div>
  );
}
function Alerts({
  stock,
  equipment,
  transactions,
  adjustments,
  stockCounts,
  pendingUserCount,
  canManageUsers,
  onNavigate,
}: {
  stock: Stock;
  equipment: Equipment[];
  transactions: Tx[];
  adjustments: StockAdjustment[];
  stockCounts: StockCountSession[];
  pendingUserCount: number;
  canManageUsers: boolean;
  onNavigate: (view: View) => void;
}) {
  const [alertsCheckedAt] = useState(() => Date.now());
  const stockAlerts = sites
    .flatMap((s) =>
      items.map((i) => ({ site: s, item: i, qty: stock[s]?.[i.code] ?? 0 })),
    )
    .filter((x) => x.qty <= x.item.min);
  const equipmentAlerts = equipment.filter((e) =>
      ["Checked Out", "Awaiting Repair", "Under Repair", "Lost"].includes(
        e.status,
      ),
    ),
    bomExceptions = transactions.filter((t) =>
      ["No Approved BOM", "Pending QS Revision"].includes(t.status),
    ),
    pendingTransfers = transactions.filter(
      (t) => t.type === "SITE TRANSFER" && t.status === "In Transit",
    ),
    pendingAdjustments = adjustments.filter((a) => a.status === "Pending"),
    pendingCounts = stockCounts.filter((session) => session.status === "Pending"),
    unverifiedTransactions = transactions.filter((transaction) => !transaction.verifiedAt),
    ageDays = (value: string) => Math.max(0, Math.floor((alertsCheckedAt - new Date(value).getTime()) / 86400000)),
    reconciliationQueue = [
      ...pendingAdjustments.map((entry) => ({ id: `adjustment-${entry.id}`, category: "Stock adjustment", site: entry.site, subject: `${itemName(entry.code)} · ${entry.code}`, owner: entry.requestedBy, createdAt: entry.requestedAt, view: "Current Stock" as View })),
      ...pendingCounts.map((entry) => ({ id: `count-${entry.id}`, category: "Stock count", site: entry.site, subject: `${entry.lines.length} counted items`, owner: entry.createdBy, createdAt: entry.submittedAt || entry.createdAt, view: "Stock Count" as View })),
      ...pendingTransfers.map((entry) => ({ id: `transfer-${entry.id}`, category: "Transfer receipt", site: `${entry.site} → ${entry.other}`, subject: `${itemName(entry.code)} · ${formatQty(entry.qty)}`, owner: entry.by, createdAt: entry.timestamp || `${entry.date}T00:00:00`, view: "Site Transfer" as View })),
      ...unverifiedTransactions.map((entry) => ({ id: `verify-${entry.id}`, category: "Transaction verification", site: entry.site, subject: `${entry.type} · ${itemName(entry.code)}`, owner: entry.by, createdAt: entry.timestamp || `${entry.date}T00:00:00`, view: "Transactions" as View })),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    overdueQueue = reconciliationQueue.filter((entry) => ageDays(entry.createdAt) >= 2),
    total =
      stockAlerts.length +
      equipmentAlerts.length +
      bomExceptions.length +
      pendingTransfers.length +
      pendingAdjustments.length +
      pendingCounts.length +
      unverifiedTransactions.length +
      pendingUserCount;
  return (
    <div className="alerts-board">
      <article className="panel notification-summary">
        <div>
          <span className="eyebrow">NOTIFICATION CENTRE</span>
          <h3>{total} items need attention</h3>
          <small>Live operational exceptions and approvals across all active sites.</small>
        </div>
        <div className="notification-chips">
          <span>{pendingAdjustments.length + pendingCounts.length} approvals</span>
          <span>{pendingTransfers.length} transfers</span>
          <span>{unverifiedTransactions.length} unverified</span>
          <span>{overdueQueue.length} overdue</span>
          <span>{pendingUserCount} users</span>
        </div>
      </article>
      <article className="panel reconciliation-panel">
        <div className="panel-head"><div><span className="eyebrow">RECONCILIATION DASHBOARD</span><h3>Approval aging and control queue</h3><small>Items waiting two days or more are marked overdue.</small></div><div className="reconciliation-kpis"><span><b>{reconciliationQueue.length}</b> open</span><span className={overdueQueue.length ? "danger-text" : ""}><b>{overdueQueue.length}</b> overdue</span></div></div>
        {reconciliationQueue.length ? <div className="table-wrap"><table><thead><tr><th>Age</th><th>Control</th><th>Site</th><th>Subject</th><th>Responsible</th><th>Action</th></tr></thead><tbody>{reconciliationQueue.slice(0, 50).map((entry) => { const days = ageDays(entry.createdAt); return <tr key={entry.id}><td><span className={`status ${days >= 2 ? "danger" : days >= 1 ? "warn" : "neutral"}`}>{days === 0 ? "TODAY" : `${days} DAY${days === 1 ? "" : "S"}`}</span></td><td><strong>{entry.category}</strong><small>{new Date(entry.createdAt).toLocaleString()}</small></td><td><span className="site-tag">{entry.site}</span></td><td>{entry.subject}</td><td>{entry.owner}</td><td><button type="button" className="table-action" onClick={() => onNavigate(entry.view)}>Review</button></td></tr>; })}</tbody></table></div> : <Empty text="All approvals, receipts and verifications are reconciled." />}
      </article>
      <article className="panel notification-approvals">
        <div className="panel-head">
          <div>
            <span className="eyebrow">PENDING APPROVALS</span>
            <h3>Management action queue</h3>
          </div>
          <span className="record-count danger-text">
            {pendingAdjustments.length + pendingCounts.length + pendingUserCount}
          </span>
        </div>
        <div className="approval-notification-grid four-columns">
          <button type="button" onClick={() => onNavigate("Current Stock")}>
            <strong>{pendingAdjustments.length}</strong>
            <span>Stock adjustments</span>
            <small>Review opening-balance and quantity changes</small>
          </button>
          <button type="button" onClick={() => onNavigate("Stock Count")}>
            <strong>{pendingCounts.length}</strong>
            <span>Stock counts</span>
            <small>Approve submitted variance sessions</small>
          </button>
          <button type="button" disabled={!canManageUsers} onClick={() => canManageUsers && onNavigate("User Access")}>
            <strong>{pendingUserCount}</strong>
            <span>User registrations</span>
            <small>{canManageUsers ? "Assign role, sites and system access" : "Developer access required"}</small>
          </button>
          <button type="button" onClick={() => onNavigate("Transactions")}><strong>{unverifiedTransactions.length}</strong><span>Transaction verification</span><small>Independent digital sign-off required</small></button>
        </div>
      </article>
      <article className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">TRANSFER RECEIPTS</span>
            <h3>Transfers awaiting destination receipt</h3>
          </div>
          <button type="button" className="table-action" onClick={() => onNavigate("Site Transfer")}>{pendingTransfers.length} pending</button>
        </div>
        {pendingTransfers.length ? (
          <div className="alert-list">
            {pendingTransfers.map((transfer) => (
              <div key={transfer.id}>
                <span className="alert-icon amber">⇄</span>
                <div>
                  <strong>{transfer.site} → {transfer.other} · {itemName(transfer.code)}</strong>
                  <small>{transfer.reference || transfer.id} · {formatQty(transfer.qty)} awaiting receipt</small>
                </div>
                <span className="status warn">IN TRANSIT</span>
              </div>
            ))}
          </div>
        ) : <Empty text="No transfers are awaiting receipt." />}
      </article>
      <article className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">STOCK EXCEPTIONS</span>
            <h3>Items requiring attention</h3>
          </div>
          <span className="record-count danger-text">
            {stockAlerts.length} alerts
          </span>
        </div>
        <div className="alert-list">
          {stockAlerts.map((a) => (
            <div key={`${a.site}-${a.item.code}`}>
              <span className={`alert-icon ${a.qty <= 0 ? "red" : "amber"}`}>
                !
              </span>
              <div>
                <strong>
                  {a.item.name} · {a.site}
                </strong>
                <small>
                  {a.item.code} · On hand {a.qty} {a.item.unit} · Minimum{" "}
                  {a.item.min}
                </small>
              </div>
              <StockStatus qty={a.qty} min={a.item.min} />
            </div>
          ))}
        </div>
      </article>
      <article className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">BOM EXCEPTIONS</span>
            <h3>Purchase and usage exceptions</h3>
          </div>
          <span className="record-count">{bomExceptions.length}</span>
        </div>
        {bomExceptions.length ? (
          <div className="alert-list">
            {bomExceptions.map((t) => (
              <div key={t.id}>
                <span className="alert-icon red">!</span>
                <div>
                  <strong>
                    {itemName(t.code)} · {t.site}
                  </strong>
                  <small>
                    {t.costCode} · {Math.abs(t.qty)} · {t.status}
                  </small>
                </div>
                <span className="status danger">QS REVIEW</span>
              </div>
            ))}
          </div>
        ) : (
          <Empty text="No BOM purchase or usage exceptions." />
        )}
      </article>
      <article className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">EQUIPMENT</span>
            <h3>Exceptions and returns</h3>
          </div>
          <span className="record-count">{equipmentAlerts.length}</span>
        </div>
        {equipmentAlerts.length ? (
          equipmentAlerts.map((e) => (
            <div className="equipment-alert" key={e.id}>
              <strong>{e.item}</strong>
              <span>
                {e.site} · {e.borrower} · Due {e.expected}
              </span>
              <small
                className={`status ${["Awaiting Repair", "Under Repair", "Lost"].includes(e.status) || e.expected < nowDate() ? "danger" : "warn"}`}
              >
                {["Awaiting Repair", "Under Repair", "Lost"].includes(e.status)
                  ? e.status.toUpperCase()
                  : e.expected < nowDate()
                    ? "OVERDUE"
                    : "OUTSTANDING"}
              </small>
            </div>
          ))
        ) : (
          <Empty text="No equipment exceptions." />
        )}
      </article>
    </div>
  );
}
function Empty({ title, text }: { title?: string; text: string }) {
  void title;
  return (
    <div className="empty">
      <span>◎</span>
      <p>{text}</p>
    </div>
  );
}

function EmptyReport() {
  return <Empty text="No records match the selected report filters." />;
}
function UserAccess({
  currentUser,
  availableSites,
}: {
  currentUser: string;
  availableSites: ProjectSite[];
}) {
  type AccessUser = {
    userId: string;
    email: string;
    name: string;
    role: Role;
    active: boolean | number;
    createdAt: string;
    updatedAt: string;
    employeeId?: string;
    phone?: string;
    site?: string;
    sites?: string[];
    requestedRole?: Role;
    note?: string;
  };
  type LoginRow = {
    sessionId: string;
    email: string;
    name: string;
    role: Role;
    loginAt: string;
    userAgent: string;
  };
  const [users, setUsers] = useState<AccessUser[]>([]),
    [history, setHistory] = useState<LoginRow[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [saved, setSaved] = useState(""),
    [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState(false),
    [resetText, setResetText] = useState("");
  const [draft, setDraft] = useState({
    name: "",
    email: "",
    employeeId: "",
    phone: "",
    sites: [] as string[],
    role: "Stockkeeper" as Role,
  });
  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/users", { cache: "no-store" });
      const data = await readJson<ApiError & { users: AccessUser[]; history?: LoginRow[] }>(response);
      if (!response.ok) throw new Error(data.error);
      setUsers(data.users);
      setHistory(data.history || []);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load users");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    queueMicrotask(() => void load());
    // Initial account data is loaded once; subsequent refreshes are explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function update(row: AccessUser) {
    setSaved("");
    setError("");
    try {
      const response = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: row.userId,
          name: row.name,
          role: row.role,
          active: Boolean(row.active),
          sites: row.sites ?? (row.site ? [row.site] : []),
          employeeId: row.employeeId || "",
          phone: row.phone || "",
        }),
      });
      const data = await readJson<ApiError>(response);
      if (!response.ok) throw new Error(data.error);
      setSaved(row.userId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update access");
    }
  }
  async function addUser(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await readJson<ApiError>(response);
      if (!response.ok) throw new Error(data.error);
      setAdding(false);
      setDraft({
        name: "",
        email: "",
        employeeId: "",
        phone: "",
        sites: [],
        role: "Stockkeeper",
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to add user");
    }
  }
  async function resetDemo() {
    try {
      const response = await fetch("/api/state", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: resetText }),
      });
      const data = await readJson<ApiError>(response);
      if (!response.ok) throw new Error(data.error);
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reset failed");
    }
  }
  async function deleteUser(row: AccessUser) {
    if (row.email === currentUser || !window.confirm(`Delete ${row.name}? This account will lose access immediately.`)) return;
    setError("");
    const response = await fetch("/api/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: row.userId }),
    });
    const data = await readJson<ApiError>(response);
    if (!response.ok) {
      setError(data.error || "Unable to delete user");
      return;
    }
    await load();
  }
  return (
    <>
      <article className="panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">SECURITY & ACCESS</span>
            <h3>Users and assigned roles</h3>
            <small>
              Add an approved employee or review self-registration requests.
            </small>
          </div>
          <div className="item-master-tools">
            <span className="record-count">
              {users.filter((u) => Boolean(u.active)).length} active ·{" "}
              {users.filter((u) => !Boolean(u.active)).length} pending
            </span>
            <button
              type="button"
              className="secondary danger-button"
              onClick={() => setResetting(true)}
            >
              Reset demo data
            </button>
            <button
              type="button"
              className="primary"
              onClick={() => setAdding(true)}
            >
              + Add user
            </button>
          </div>
        </div>
        {error && <div className="form-error">{error}</div>}
        {loading ? (
          <Empty text="Loading secure user directory…" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Staff profile</th>
                  <th>Assigned sites</th>
                  <th>Requested</th>
                  <th>Assigned role</th>
                  <th>Access</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((row) => (
                  <tr key={row.userId}>
                    <td>
                      <input
                        className="user-name-input"
                        required
                        value={row.name}
                        onChange={(e) =>
                          setUsers((list) =>
                            list.map((u) =>
                              u.userId === row.userId
                                ? { ...u, name: e.target.value }
                                : u,
                            ),
                          )
                        }
                        aria-label={`Staff display name for ${row.email}`}
                      />
                      <small>
                        {row.email}
                        {row.email === currentUser ? " · You" : ""}
                      </small>
                    </td>
                    <td>
                      <input className="user-name-input" value={row.employeeId || ""} placeholder="Employee ID (optional)" onChange={(e) => setUsers((list) => list.map((u) => u.userId === row.userId ? { ...u, employeeId: e.target.value } : u))} />
                      <input className="user-name-input" value={row.phone || ""} placeholder="Phone (optional)" onChange={(e) => setUsers((list) => list.map((u) => u.userId === row.userId ? { ...u, phone: e.target.value } : u))} />
                    </td>
                    <td>
                      <div className="user-site-assignment">
                        {availableSites.map((site) => {
                          const assigned =
                            row.sites ?? (row.site ? [row.site] : []);
                          return (
                            <label key={site.code}>
                              <input
                                type="checkbox"
                                checked={assigned.includes(site.code)}
                                onChange={(e) =>
                                  setUsers((list) =>
                                    list.map((user) =>
                                      user.userId === row.userId
                                        ? {
                                            ...user,
                                            sites: e.target.checked
                                              ? [...assigned, site.code]
                                              : assigned.filter(
                                                  (code) => code !== site.code,
                                                ),
                                          }
                                        : user,
                                    ),
                                  )
                                }
                              />
                              {site.code}
                            </label>
                          );
                        })}
                      </div>
                    </td>
                    <td>{row.requestedRole || row.role}</td>
                    <td>
                      <select
                        value={row.role}
                        onChange={(e) =>
                          setUsers((list) =>
                            list.map((u) =>
                              u.userId === row.userId
                                ? { ...u, role: e.target.value as Role }
                                : u,
                            ),
                          )
                        }
                      >
                        <option>Admin</option>
                        <option>Developer</option>
                        <option>Stock Controller</option>
                        <option>Stockkeeper</option>
                        <option>Site Team</option>
                        <option>QS</option>
                        <option>PM</option>
                        <option>Management</option>
                      </select>
                    </td>
                    <td>
                      <select
                        value={Boolean(row.active) ? "Active" : "Pending"}
                        onChange={(e) =>
                          setUsers((list) =>
                            list.map((u) =>
                              u.userId === row.userId
                                ? { ...u, active: e.target.value === "Active" }
                                : u,
                            ),
                          )
                        }
                        disabled={row.email === currentUser}
                      >
                        <option>Active</option>
                        <option>Pending</option>
                      </select>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="table-action"
                        onClick={() => update(row)}
                      >
                        {saved === row.userId ? "Saved" : "Save changes"}
                      </button>
                      {row.email !== currentUser && <button type="button" className="table-action danger-button" onClick={() => deleteUser(row)}>Delete</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </article>
      <article className="panel login-history">
        <div className="panel-head">
          <div>
            <span className="eyebrow">SECURITY LOG</span>
            <h3>Login history</h3>
            <small>
              Most recent verified sessions across all approved users.
            </small>
          </div>
          <span className="record-count">{history.length} sessions</span>
        </div>
        {history.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date & time</th>
                  <th>User</th>
                  <th>Role</th>
                  <th>Device</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={row.sessionId}>
                    <td>
                      <strong>
                        {new Date(row.loginAt).toLocaleDateString("en-GB")}
                      </strong>
                      <small>
                        {new Date(row.loginAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </small>
                    </td>
                    <td>
                      <strong>{row.name}</strong>
                      <small>{row.email}</small>
                    </td>
                    <td>{row.role}</td>
                    <td className="login-device">
                      {/Mobile|Android|iPhone/i.test(row.userAgent)
                        ? "Mobile / Tablet"
                        : "Desktop browser"}
                    </td>
                    <td>
                      <span className="status ok">Successful</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text="No login sessions recorded yet." />
        )}
      </article>
      {adding && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <form className="budget-modal item-editor-modal" onSubmit={addUser}>
            <span className="eyebrow">ADMIN USER CONTROL</span>
            <h2>Add approved user</h2>
            <p>
              The employee can enter with this role after signing in using the
              exact email below.
            </p>
            <div className="item-editor-grid">
              <label>
                Full name
                <input
                  required
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                />
              </label>
              <label>
                Email address
                <input
                  required
                  type="email"
                  value={draft.email}
                  onChange={(e) =>
                    setDraft({ ...draft, email: e.target.value })
                  }
                />
              </label>
              <label>
                Employee ID <small>(optional)</small>
                <input
                  value={draft.employeeId}
                  onChange={(e) =>
                    setDraft({ ...draft, employeeId: e.target.value })
                  }
                />
              </label>
              <label>
                Phone <small>(optional)</small>
                <input
                  value={draft.phone}
                  onChange={(e) =>
                    setDraft({ ...draft, phone: e.target.value })
                  }
                />
              </label>
              <fieldset className="site-assignment-field">
                <legend>Assigned sites</legend>
                <div>
                  {availableSites.map((site) => (
                    <label key={site.code}>
                      <input
                        type="checkbox"
                        checked={draft.sites.includes(site.code)}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            sites: e.target.checked
                              ? [...draft.sites, site.code]
                              : draft.sites.filter(
                                  (code) => code !== site.code,
                                ),
                          })
                        }
                      />
                      {site.code} · {site.name}
                    </label>
                  ))}
                </div>
              </fieldset>
              <label>
                Role
                <select
                  value={draft.role}
                  onChange={(e) =>
                    setDraft({ ...draft, role: e.target.value as Role })
                  }
                >
                  <option>Admin</option>
                  <option>Developer</option>
                  <option>Stock Controller</option>
                  <option>Stockkeeper</option>
                  <option>Site Team</option>
                  <option>QS</option>
                  <option>PM</option>
                  <option>Management</option>
                </select>
              </label>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setAdding(false)}
              >
                Cancel
              </button>
              <button className="confirm">Add user</button>
            </div>
          </form>
        </div>
      )}
      {resetting && (
        <div className="modal-backdrop" role="alertdialog" aria-modal="true">
          <section className="budget-modal stock-alert-modal">
            <div className="modal-icon critical">!</div>
            <span className="eyebrow">ADMIN DATA CONTROL</span>
            <h2>Reset all operational demo data?</h2>
            <p>
              This restores the original items, stock and BOM, and removes all
              test transactions, requests, transfers and equipment activity.
            </p>
            <div className="modal-warning danger">
              Accounts, roles, registrations, login history and security audit
              records will be preserved.
            </div>
            <label>
              Type RESET to confirm
              <input
                autoFocus
                value={resetText}
                onChange={(e) => setResetText(e.target.value.toUpperCase())}
                placeholder="RESET"
              />
            </label>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setResetting(false);
                  setResetText("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="confirm"
                disabled={resetText !== "RESET"}
                onClick={resetDemo}
              >
                Reset operational data
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
function navIcon(v: View) {
  return (
    {
      Dashboard: "▦",
      "Item Master": "▤",
      "BOM Control": "$",
      "Current Stock": "▥",
      "Stock Count": "✓",
      "Stock In": "↓",
      "Stock Out": "↑",
      "Site Transfer": "⇄",
      Equipment: "⚙",
      Transactions: "≡",
      "Audit Report": "◎",
      Reports: "▧",
      "Backup & Recovery": "↻",
      "Help & SOP": "?",
      Alerts: "!",
      Supplier: "▣",
      "Project/Site": "⌂",
      "User Access": "♙",
    } as Record<View, string>
  )[v];
}
