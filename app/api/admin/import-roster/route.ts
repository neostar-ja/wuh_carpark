import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-auth";
import { makeUniqueUsername } from "@/lib/username";
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
    const renamed: { plate: string; from: string; to: string }[] = [];

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

      const selfId = existingByPlate?.id;

      // A username collision only counts against a *different person* —
      // an employee with more than one car is expected to reuse the same
      // username across all of their registrations, matched by Thai name +
      // phone. Only an actual different-person clash gets resolved by
      // appending a numeric suffix, truncating the requested username
      // itself if it's already at the 10-character cap ("thirapo.ka"
      // colliding becomes "thirapo.k2", not "thirapo.ka2" which is 11).
      const isUsernameTaken = async (candidate: string) => {
        let q = supabaseAdmin
          .from("car_registrations")
          .select("id, full_name_th, phone_number")
          .eq("username", candidate);
        if (selfId) q = q.neq("id", selfId);
        const { data } = await q;
        if (!data || data.length === 0) return false;
        return data.some(
          (r) => r.full_name_th !== row.fullNameTh || r.phone_number !== row.phone
        );
      };

      let resolvedUsername: string;
      try {
        resolvedUsername = await makeUniqueUsername(row.username, isUsernameTaken);
      } catch {
        skipped.push({ plate: row.licensePlate, reason: "ไม่สามารถหา Username ที่ไม่ซ้ำได้" });
        continue;
      }

      if (existingByPlate) {
        const { error } = await supabaseAdmin
          .from("car_registrations")
          .update({
            province: row.province,
            full_name_th: row.fullNameTh,
            username: resolvedUsername,
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
        const { error } = await supabaseAdmin.from("car_registrations").insert({
          license_plate: row.licensePlate,
          province: row.province,
          full_name_th: row.fullNameTh,
          username: resolvedUsername,
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
          const reason = error.code === "23505" ? "ทะเบียนซ้ำ" : "บันทึกไม่สำเร็จ";
          skipped.push({ plate: row.licensePlate, reason });
          continue;
        }
        createdCount++;
      }

      if (resolvedUsername !== row.username) {
        renamed.push({ plate: row.licensePlate, from: row.username, to: resolvedUsername });
      }
    }

    return NextResponse.json({
      success: true,
      totalRows: importRows.length,
      createdCount,
      updatedCount,
      skipped,
      renamed,
    });
  } catch (err) {
    console.error("POST /api/admin/import-roster failed:", err);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดของระบบ กรุณาลองใหม่อีกครั้ง" },
      { status: 500 }
    );
  }
}
