import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-auth";
import {
  parseRosterWorkbook,
  validateRosterRow,
  RosterFileParseError,
  ROSTER_DEFAULTS,
} from "@/lib/roster-file";

export const dynamic = "force-dynamic";

function isAuthenticated(): boolean {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  return verifyAdminSessionToken(token);
}

// POST multipart/form-data { file: <xlsx> } — bulk-creates registrations
// from our own native roster template (license plate, province, Thai name,
// username, position, department, phone, car type). Unlike the gate-system
// re-import, a plate not already in the system gets a brand new row here,
// using placeholder defaults (see ROSTER_DEFAULTS) for the fields this
// format doesn't carry (English name, car color, plate type) — those can be
// filled in later via the admin edit form. A plate that already exists gets
// its listed fields updated instead of a duplicate row.
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

    const file = formData.get("file");
    if (!file || typeof file === "string" || typeof (file as Blob).arrayBuffer !== "function") {
      return NextResponse.json({ success: false, error: "กรุณาแนบไฟล์ .xlsx" }, { status: 400 });
    }

    const buffer = await (file as Blob).arrayBuffer();

    let importRows;
    try {
      importRows = parseRosterWorkbook(buffer);
    } catch (err) {
      const message = err instanceof RosterFileParseError ? err.message : "ไม่สามารถอ่านไฟล์นี้ได้";
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    if (importRows.length === 0) {
      return NextResponse.json({ success: false, error: "ไม่พบข้อมูลในไฟล์" }, { status: 400 });
    }

    let createdCount = 0;
    let updatedCount = 0;
    const skipped: { plate: string; reason: string }[] = [];

    for (const row of importRows) {
      const fieldErrors = validateRosterRow(row);
      if (fieldErrors.length > 0) {
        skipped.push({
          plate: row.licensePlate || "(ไม่มีทะเบียน)",
          reason: fieldErrors.map((e) => `${e.field}: ${e.reason}`).join(", "),
        });
        continue;
      }

      const { data: existingByPlate } = await supabaseAdmin
        .from("car_registrations")
        .select("id, username")
        .eq("license_plate", row.licensePlate)
        .maybeSingle();

      const { data: existingByUsername } = await supabaseAdmin
        .from("car_registrations")
        .select("id")
        .eq("username", row.username)
        .maybeSingle();

      const usernameTakenByAnotherRow =
        existingByUsername && existingByUsername.id !== existingByPlate?.id;

      if (existingByPlate) {
        // Update: keep the existing username if the requested one collides
        // with a *different* row, rather than failing the whole row.
        const nextUsername = usernameTakenByAnotherRow ? existingByPlate.username : row.username;

        const { error } = await supabaseAdmin
          .from("car_registrations")
          .update({
            province: row.province,
            full_name_th: row.fullNameTh,
            username: nextUsername,
            position: row.position,
            department: row.department,
            phone_number: row.phone,
            car_type: row.carType,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingByPlate.id);

        if (error) {
          skipped.push({ plate: row.licensePlate, reason: "บันทึกไม่สำเร็จ" });
          continue;
        }
        updatedCount++;
      } else {
        if (usernameTakenByAnotherRow) {
          skipped.push({ plate: row.licensePlate, reason: `Username "${row.username}" ถูกใช้งานแล้ว` });
          continue;
        }

        const { error } = await supabaseAdmin.from("car_registrations").insert({
          license_plate: row.licensePlate,
          province: row.province,
          full_name_th: row.fullNameTh,
          username: row.username,
          position: row.position,
          department: row.department,
          phone_number: row.phone,
          car_type: row.carType,
          full_name_en: ROSTER_DEFAULTS.full_name_en,
          car_color: ROSTER_DEFAULTS.car_color,
          license_plate_type: ROSTER_DEFAULTS.license_plate_type,
          status: "pending",
        });

        if (error) {
          const reason = error.code === "23505" ? "ทะเบียนหรือ Username ซ้ำ" : "บันทึกไม่สำเร็จ";
          skipped.push({ plate: row.licensePlate, reason });
          continue;
        }
        createdCount++;
      }
    }

    return NextResponse.json({
      success: true,
      totalRows: importRows.length,
      createdCount,
      updatedCount,
      skipped,
    });
  } catch (err) {
    console.error("POST /api/admin/import-roster failed:", err);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดของระบบ กรุณาลองใหม่อีกครั้ง" },
      { status: 500 }
    );
  }
}
