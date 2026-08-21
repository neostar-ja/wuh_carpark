import "server-only";
import * as XLSX from "xlsx";
import {
  CAR_TYPE_OPTIONS,
  CAR_COLOR_OPTIONS,
  LICENSE_PLATE_TYPE_OPTIONS,
  LICENSE_PLATE_REGEX,
  FULL_NAME_EN_REGEX,
  PHONE_REGEX,
} from "./validation";

// Column order for the gate/LPR system's fixed xlsx import template. Both
// export and import must agree on this exact header — it's a third-party
// format we don't control.
export const GATE_HEADER = [
  "Number Plate",
  "Name",
  "Phone",
  "Description",
  "Vehicle Type",
  "Vehicle Color",
  "License Plate Type",
  "Start Time",
  "End Time",
] as const;

// "D/M/YYYY", no zero-padding (e.g. 5/1/2026, 20/8/2026) — matches the gate
// system's expected date format, and is shifted forward by whole calendar
// years for the End Time column (registration validity period).
export function formatGateDate(isoDate: string, addYears = 0): string {
  const [y, m, d] = new Date(isoDate)
    .toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" })
    .split("-")
    .map(Number);
  const shifted = new Date(Date.UTC(y + addYears, m - 1, d));
  return `${shifted.getUTCDate()}/${shifted.getUTCMonth() + 1}/${shifted.getUTCFullYear()}`;
}

export type GateExportRow = {
  license_plate: string;
  username: string | null;
  full_name_en: string;
  phone_number: string;
  car_type: string;
  car_color: string;
  license_plate_type: string;
  created_at: string;
};

// Builds a workbook containing *only* the header row plus one row per
// registration — nothing else. A template with extra blank rows/cells below
// the data is exactly what the gate system's importer chokes on, so this
// deliberately avoids row/column ranges wider than the real content.
export function buildGateWorkbook(rows: GateExportRow[]): Buffer {
  const aoa: string[][] = [
    [...GATE_HEADER],
    ...rows.map((row) => [
      row.license_plate,
      row.username || row.full_name_en || "",
      row.phone_number,
      row.full_name_en,
      row.car_type,
      row.car_color,
      row.license_plate_type,
      formatGateDate(row.created_at),
      formatGateDate(row.created_at, 7),
    ]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(aoa);

  // Force the Phone column to a text cell type for every data row, so a
  // leading zero survives instead of Excel/the gate system reading it as a
  // number.
  const phoneCol = GATE_HEADER.indexOf("Phone");
  for (let r = 1; r < aoa.length; r++) {
    const ref = XLSX.utils.encode_cell({ r, c: phoneCol });
    const cell = worksheet[ref];
    if (cell) {
      cell.t = "s";
      cell.z = "@";
    }
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Registrations");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export type GateImportRow = {
  licensePlate: string;
  phone: string;
  description: string;
  vehicleType: string;
  vehicleColor: string;
  licensePlateType: string;
};

export class GateFileParseError extends Error {}

// Reads back a workbook in the same fixed format. Tolerant of column order
// (matches by header name) but requires the exact header labels.
export function parseGateWorkbook(buffer: ArrayBuffer): GateImportRow[] {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "array" });
  } catch {
    throw new GateFileParseError("ไม่สามารถอ่านไฟล์นี้ได้ กรุณาตรวจสอบว่าเป็นไฟล์ .xlsx ที่ถูกต้อง");
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheet) {
    throw new GateFileParseError("ไม่พบข้อมูลในไฟล์");
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: "" });
  const [header, ...dataRows] = rows;
  if (!header) {
    throw new GateFileParseError("ไม่พบข้อมูลในไฟล์");
  }

  const headerStrings = header.map((h) => String(h).trim());
  const colIndex = (name: string) => headerStrings.indexOf(name);

  const idxPlate = colIndex("Number Plate");
  const idxPhone = colIndex("Phone");
  const idxDesc = colIndex("Description");
  const idxType = colIndex("Vehicle Type");
  const idxColor = colIndex("Vehicle Color");
  const idxPlateType = colIndex("License Plate Type");

  if (idxPlate === -1) {
    throw new GateFileParseError('ไม่พบคอลัมน์ "Number Plate" ในไฟล์ — กรุณาใช้ไฟล์รูปแบบเดียวกับที่ส่งออกจากระบบ');
  }

  const cell = (row: unknown[], idx: number) => (idx === -1 ? "" : String(row[idx] ?? "").trim());

  return dataRows
    .filter((row) => row.some((v) => String(v ?? "").trim() !== ""))
    .map((row) => ({
      licensePlate: cell(row, idxPlate).replace(/\s+/g, ""),
      phone: cell(row, idxPhone),
      description: cell(row, idxDesc),
      vehicleType: cell(row, idxType),
      vehicleColor: cell(row, idxColor),
      licensePlateType: cell(row, idxPlateType),
    }))
    .filter((row) => row.licensePlate);
}

// Only carries over a field from an imported row if it's non-empty *and*
// matches what our own schema would accept — a spreadsheet can contain
// anything, and writing an unrecognized car type/color into the DB would
// silently break the dropdowns and CSV round-trip elsewhere in the app.
export function pickValidImportFields(row: GateImportRow): Record<string, string> {
  const fields: Record<string, string> = {};

  if (row.phone && PHONE_REGEX.test(row.phone)) {
    fields.phone_number = row.phone;
  }
  if (row.description && FULL_NAME_EN_REGEX.test(row.description)) {
    fields.full_name_en = row.description;
  }
  if ((CAR_TYPE_OPTIONS as readonly string[]).includes(row.vehicleType)) {
    fields.car_type = row.vehicleType;
  }
  if ((CAR_COLOR_OPTIONS as readonly string[]).includes(row.vehicleColor)) {
    fields.car_color = row.vehicleColor;
  }
  if ((LICENSE_PLATE_TYPE_OPTIONS as readonly string[]).includes(row.licensePlateType)) {
    fields.license_plate_type = row.licensePlateType;
  }

  return fields;
}

export function isValidLicensePlate(plate: string): boolean {
  return LICENSE_PLATE_REGEX.test(plate);
}
