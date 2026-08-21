import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-auth";
import {
  parseGateWorkbook,
  pickValidImportFields,
  isValidLicensePlate,
  GateFileParseError,
} from "@/lib/gate-file";

export const dynamic = "force-dynamic";

function isAuthenticated(): boolean {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  return verifyAdminSessionToken(token);
}

// POST multipart/form-data { file: <xlsx> } — bulk-updates existing
// registrations from a workbook in the same fixed format the export
// produces. Matches rows by license plate only; a plate not already in the
// system is skipped rather than creating a new (necessarily incomplete)
// registration, since this file format never carries the Thai name,
// position, department, or province fields our schema requires.
export async function POST(req: NextRequest) {
  try {
    if (!isAuthenticated()) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ success: false, error: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
    }

    // Duck-typed rather than `instanceof File` — Node's global File
    // constructor isn't reliably present as a bare identifier across every
    // runtime this route might execute in, and formData.get() only ever
    // returns string | File | null anyway, so checking for the Blob-shaped
    // methods we actually use is equivalent and doesn't risk a
    // ReferenceError on `File` itself.
    const file = formData.get("file");
    if (!file || typeof file === "string" || typeof (file as Blob).arrayBuffer !== "function") {
      return NextResponse.json({ success: false, error: "กรุณาแนบไฟล์ .xlsx" }, { status: 400 });
    }

    const buffer = await (file as Blob).arrayBuffer();

    let importRows;
    try {
      importRows = parseGateWorkbook(buffer);
    } catch (err) {
      const message = err instanceof GateFileParseError ? err.message : "ไม่สามารถอ่านไฟล์นี้ได้";
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    if (importRows.length === 0) {
      return NextResponse.json({ success: false, error: "ไม่พบข้อมูลในไฟล์" }, { status: 400 });
    }

    let updatedCount = 0;
    const skipped: { plate: string; reason: string }[] = [];

    for (const row of importRows) {
      if (!isValidLicensePlate(row.licensePlate)) {
        skipped.push({ plate: row.licensePlate, reason: "รูปแบบทะเบียนไม่ถูกต้อง" });
        continue;
      }

      const { data: existing } = await supabaseAdmin
        .from("car_registrations")
        .select("id")
        .eq("license_plate", row.licensePlate)
        .maybeSingle();

      if (!existing) {
        skipped.push({ plate: row.licensePlate, reason: "ไม่พบทะเบียนนี้ในระบบ" });
        continue;
      }

      const fields = pickValidImportFields(row);
      if (Object.keys(fields).length === 0) {
        skipped.push({ plate: row.licensePlate, reason: "ไม่มีข้อมูลที่ถูกต้องให้อัปเดต" });
        continue;
      }

      const { error } = await supabaseAdmin
        .from("car_registrations")
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq("id", existing.id);

      if (error) {
        skipped.push({ plate: row.licensePlate, reason: "บันทึกไม่สำเร็จ" });
        continue;
      }

      updatedCount++;
    }

    return NextResponse.json({
      success: true,
      totalRows: importRows.length,
      updatedCount,
      skipped,
    });
  } catch (err) {
    console.error("POST /api/admin/import failed:", err);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดของระบบ กรุณาลองใหม่อีกครั้ง" },
      { status: 500 }
    );
  }
}
