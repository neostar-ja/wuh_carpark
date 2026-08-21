import "server-only";
import * as XLSX from "xlsx";
import {
  CAR_TYPE_OPTIONS,
  PROVINCE_OPTIONS,
  LICENSE_PLATE_REGEX,
  FULL_NAME_TH_REGEX,
  PHONE_REGEX,
} from "./validation";

// Header for the "bulk roster" import/template — this is our own native
// field set (mirrors the admin table's columns), separate from the
// gate-system xlsx format in lib/gate-file.ts. Used to bulk-create
// registrations (e.g. from an HR-prepared staff list) rather than to
// resync with an external system.
export const ROSTER_HEADER = [
  "ทะเบียนรถ",
  "จังหวัด",
  "ชื่อ-นามสกุล",
  "Username",
  "ตำแหน่ง",
  "หน่วยงาน",
  "เบอร์โทร",
  "ประเภทรถ",
] as const;

export function buildRosterTemplateWorkbook(): Buffer {
  const aoa: string[][] = [
    [...ROSTER_HEADER],
    ["กข1234", "นครศรีธรรมราช", "สมชาย ใจดี", "somchai.ja", "พยาบาลวิชาชีพ", "แผนกผู้ป่วยนอก", "0812345678", CAR_TYPE_OPTIONS[0]],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  const phoneCol = ROSTER_HEADER.indexOf("เบอร์โทร");
  const phoneCell = worksheet[XLSX.utils.encode_cell({ r: 1, c: phoneCol })];
  if (phoneCell) {
    phoneCell.t = "s";
    phoneCell.z = "@";
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Roster");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export type RosterImportRow = {
  licensePlate: string;
  province: string;
  fullNameTh: string;
  username: string;
  position: string;
  department: string;
  phone: string;
  carType: string;
};

export class RosterFileParseError extends Error {}

export function parseRosterWorkbook(buffer: ArrayBuffer): RosterImportRow[] {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "array" });
  } catch {
    throw new RosterFileParseError("ไม่สามารถอ่านไฟล์นี้ได้ กรุณาตรวจสอบว่าเป็นไฟล์ .xlsx ที่ถูกต้อง");
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheet) {
    throw new RosterFileParseError("ไม่พบข้อมูลในไฟล์");
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: "" });
  const [header, ...dataRows] = rows;
  if (!header) {
    throw new RosterFileParseError("ไม่พบข้อมูลในไฟล์");
  }

  const headerStrings = header.map((h) => String(h).trim());
  const colIndex = (name: string) => headerStrings.indexOf(name);

  const idxPlate = colIndex("ทะเบียนรถ");
  const idxProvince = colIndex("จังหวัด");
  const idxName = colIndex("ชื่อ-นามสกุล");
  const idxUsername = colIndex("Username");
  const idxPosition = colIndex("ตำแหน่ง");
  const idxDept = colIndex("หน่วยงาน");
  const idxPhone = colIndex("เบอร์โทร");
  const idxCarType = colIndex("ประเภทรถ");

  if (idxPlate === -1) {
    throw new RosterFileParseError('ไม่พบคอลัมน์ "ทะเบียนรถ" ในไฟล์ — กรุณาใช้ไฟล์รูปแบบเดียวกับเทมเพลต');
  }

  const cell = (row: unknown[], idx: number) => (idx === -1 ? "" : String(row[idx] ?? "").trim());

  return dataRows
    .filter((row) => row.some((v) => String(v ?? "").trim() !== ""))
    .map((row) => ({
      licensePlate: cell(row, idxPlate).replace(/\s+/g, ""),
      province: cell(row, idxProvince),
      fullNameTh: cell(row, idxName),
      username: cell(row, idxUsername),
      position: cell(row, idxPosition),
      department: cell(row, idxDept),
      phone: cell(row, idxPhone),
      carType: cell(row, idxCarType),
    }))
    .filter((row) => row.licensePlate);
}

export type RosterFieldError = { field: string; reason: string };

// Full validation for a roster row — every field must be present and valid,
// since (unlike the gate-system re-import) this can create a brand new
// registration and there's no existing row to fall back on for anything
// missing.
export function validateRosterRow(row: RosterImportRow): RosterFieldError[] {
  const errors: RosterFieldError[] = [];

  if (!LICENSE_PLATE_REGEX.test(row.licensePlate)) {
    errors.push({ field: "ทะเบียนรถ", reason: "รูปแบบไม่ถูกต้อง" });
  }
  if (!(PROVINCE_OPTIONS as readonly string[]).includes(row.province)) {
    errors.push({ field: "จังหวัด", reason: "ไม่ตรงกับรายชื่อจังหวัดที่ระบบรองรับ" });
  }
  if (!row.fullNameTh || !FULL_NAME_TH_REGEX.test(row.fullNameTh)) {
    errors.push({ field: "ชื่อ-นามสกุล", reason: "ต้องเป็นภาษาไทยและไม่ว่าง" });
  }
  if (!row.username) {
    errors.push({ field: "Username", reason: "ห้ามว่าง" });
  } else if (row.username.length > 10) {
    errors.push({ field: "Username", reason: "ต้องไม่เกิน 10 ตัวอักษร" });
  }
  if (!row.position) {
    errors.push({ field: "ตำแหน่ง", reason: "ห้ามว่าง" });
  }
  if (!row.department) {
    errors.push({ field: "หน่วยงาน", reason: "ห้ามว่าง" });
  }
  if (!PHONE_REGEX.test(row.phone)) {
    errors.push({ field: "เบอร์โทร", reason: "ต้องเป็นตัวเลข 10 หลัก ขึ้นต้นด้วย 0" });
  }
  if (!(CAR_TYPE_OPTIONS as readonly string[]).includes(row.carType)) {
    errors.push({ field: "ประเภทรถ", reason: "ไม่ตรงกับตัวเลือกที่ระบบรองรับ" });
  }

  return errors;
}

// Fields our schema requires but this roster format doesn't carry — a
// clearly-a-placeholder value for each, only ever used when *creating* a
// brand new row (an update to an existing row leaves these untouched).
export const ROSTER_DEFAULTS = {
  full_name_en: "Unknown",
  car_color: "Other",
  license_plate_type: "ป้ายขาว-ดำ",
} as const;
