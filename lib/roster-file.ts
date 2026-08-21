import "server-only";
import * as XLSX from "xlsx";
import {
  CAR_TYPE_OPTIONS,
  CAR_COLOR_OPTIONS,
  LICENSE_PLATE_TYPE_OPTIONS,
  PROVINCE_OPTIONS,
  LICENSE_PLATE_REGEX,
  FULL_NAME_TH_REGEX,
  FULL_NAME_EN_REGEX,
  PHONE_REGEX,
} from "./validation";

// Header for the "bulk roster" import/template — this is our own native
// field set, mirroring the public registration form itself (minus consent,
// which only ever applies at submission time) rather than the gate-system
// xlsx format in lib/gate-file.ts. Used to bulk-create registrations (e.g.
// from an HR-prepared staff list) rather than to resync with an external
// system. There is deliberately no Username column — the system generates
// it the same way the public form does (see lib/username.ts), reusing an
// existing person's username when they already have another car registered.
export const ROSTER_HEADER = [
  "ทะเบียนรถ",
  "จังหวัด",
  "ชื่อ-นามสกุล (ไทย)",
  "ชื่อ-นามสกุล (อังกฤษ)",
  "ตำแหน่ง",
  "หน่วยงาน",
  "เบอร์โทร",
  "ประเภทรถ",
  "สีรถ",
  "ประเภทป้ายทะเบียน",
] as const;

export function buildRosterTemplateWorkbook(): Buffer {
  const aoa: string[][] = [
    [...ROSTER_HEADER],
    [
      "กข1234",
      "นครศรีธรรมราช",
      "สมชาย ใจดี",
      "Somchai Jaidee",
      "พยาบาลวิชาชีพ",
      "แผนกผู้ป่วยนอก",
      "0812345678",
      CAR_TYPE_OPTIONS[0],
      CAR_COLOR_OPTIONS[0],
      LICENSE_PLATE_TYPE_OPTIONS[0],
    ],
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
  fullNameEn: string;
  position: string;
  department: string;
  phone: string;
  carType: string;
  carColor: string;
  licensePlateType: string;
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
  const idxNameTh = colIndex("ชื่อ-นามสกุล (ไทย)");
  const idxNameEn = colIndex("ชื่อ-นามสกุล (อังกฤษ)");
  const idxPosition = colIndex("ตำแหน่ง");
  const idxDept = colIndex("หน่วยงาน");
  const idxPhone = colIndex("เบอร์โทร");
  const idxCarType = colIndex("ประเภทรถ");
  const idxCarColor = colIndex("สีรถ");
  const idxPlateType = colIndex("ประเภทป้ายทะเบียน");

  if (idxPlate === -1) {
    throw new RosterFileParseError('ไม่พบคอลัมน์ "ทะเบียนรถ" ในไฟล์ — กรุณาใช้ไฟล์รูปแบบเดียวกับเทมเพลต');
  }

  const cell = (row: unknown[], idx: number) => (idx === -1 ? "" : String(row[idx] ?? "").trim());

  return dataRows
    .filter((row) => row.some((v) => String(v ?? "").trim() !== ""))
    .map((row) => ({
      licensePlate: cell(row, idxPlate).replace(/\s+/g, ""),
      province: cell(row, idxProvince),
      fullNameTh: cell(row, idxNameTh),
      fullNameEn: cell(row, idxNameEn),
      position: cell(row, idxPosition),
      department: cell(row, idxDept),
      phone: cell(row, idxPhone),
      carType: cell(row, idxCarType),
      carColor: cell(row, idxCarColor),
      licensePlateType: cell(row, idxPlateType),
    }))
    .filter((row) => row.licensePlate);
}

export type RosterFieldError = { field: string; reason: string };

// Full validation for a roster row — every field must be present and valid,
// since (unlike the gate-system re-import) this can create a brand new
// registration and there's no existing row to fall back on for anything
// missing. Mirrors registrationSchema's rules (minus consent, and minus
// username which the system generates itself).
export function validateRosterRow(row: RosterImportRow): RosterFieldError[] {
  const errors: RosterFieldError[] = [];

  if (!LICENSE_PLATE_REGEX.test(row.licensePlate)) {
    errors.push({ field: "ทะเบียนรถ", reason: "รูปแบบไม่ถูกต้อง" });
  }
  if (!(PROVINCE_OPTIONS as readonly string[]).includes(row.province)) {
    errors.push({ field: "จังหวัด", reason: "ไม่ตรงกับรายชื่อจังหวัดที่ระบบรองรับ" });
  }
  if (!row.fullNameTh || !FULL_NAME_TH_REGEX.test(row.fullNameTh)) {
    errors.push({ field: "ชื่อ-นามสกุล (ไทย)", reason: "ต้องเป็นภาษาไทยและไม่ว่าง" });
  }
  if (!row.fullNameEn || !FULL_NAME_EN_REGEX.test(row.fullNameEn)) {
    errors.push({ field: "ชื่อ-นามสกุล (อังกฤษ)", reason: "ต้องเป็นภาษาอังกฤษและไม่ว่าง" });
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
  if (!(CAR_COLOR_OPTIONS as readonly string[]).includes(row.carColor)) {
    errors.push({ field: "สีรถ", reason: "ไม่ตรงกับตัวเลือกที่ระบบรองรับ" });
  }
  if (!(LICENSE_PLATE_TYPE_OPTIONS as readonly string[]).includes(row.licensePlateType)) {
    errors.push({ field: "ประเภทป้ายทะเบียน", reason: "ไม่ตรงกับตัวเลือกที่ระบบรองรับ" });
  }

  return errors;
}
