import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-auth";
import { generateUsername } from "@/lib/username";
import { parseRosterWorkbook, validateRosterRow, RosterFileParseError } from "@/lib/roster-file";

export const dynamic = "force-dynamic";

function isAuthenticated(): boolean {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  return verifyAdminSessionToken(token);
}

// POST multipart/form-data { file: <xlsx> } — bulk-creates registrations
// from our own native roster template, which mirrors the public
// registration form itself (license plate, province, Thai/English name,
// position, department, phone, car type/color, plate type). There is no
// Username column: the system generates it exactly like the public form
// does, reusing an existing person's username (matched by Thai name +
// phone) when they already have another car registered, so an HR-prepared
// multi-car roster naturally lands everyone's cars under one username. A
// plate not already in the system gets a brand new row; a plate that
// already exists gets its listed fields updated instead (its username is
// left untouched either way, since re-importing an existing employee's
// updated info shouldn't reassign their identity).
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
        .select("id")
        .eq("license_plate", row.licensePlate)
        .maybeSingle();

      if (existingByPlate) {
        const { error } = await supabaseAdmin
          .from("car_registrations")
          .update({
            province: row.province,
            full_name_th: row.fullNameTh,
            full_name_en: row.fullNameEn,
            position: row.position,
            department: row.department,
            phone_number: row.phone,
            car_type: row.carType,
            car_color: row.carColor,
            license_plate_type: row.licensePlateType,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingByPlate.id);

        if (error) {
          skipped.push({ plate: row.licensePlate, reason: "บันทึกไม่สำเร็จ" });
          continue;
        }
        updatedCount++;
        continue;
      }

      // Brand new row — an employee with more than one vehicle shares one
      // username across all of their registrations, matched by Thai name +
      // phone together (same pairing the public form and check-status page
      // use to prove ownership). Only generate a fresh username when no
      // such person exists yet.
      const { data: existingPerson } = await supabaseAdmin
        .from("car_registrations")
        .select("username")
        .eq("full_name_th", row.fullNameTh)
        .eq("phone_number", row.phone)
        .not("username", "is", null)
        .limit(1)
        .maybeSingle();

      const username =
        existingPerson?.username ??
        (await generateUsername(row.fullNameEn, async (candidate) => {
          const { data } = await supabaseAdmin
            .from("car_registrations")
            .select("id")
            .eq("username", candidate)
            .maybeSingle();
          return Boolean(data);
        }));

      const { error } = await supabaseAdmin.from("car_registrations").insert({
        license_plate: row.licensePlate,
        province: row.province,
        full_name_th: row.fullNameTh,
        full_name_en: row.fullNameEn,
        username,
        position: row.position,
        department: row.department,
        phone_number: row.phone,
        car_type: row.carType,
        car_color: row.carColor,
        license_plate_type: row.licensePlateType,
        status: "pending",
      });

      if (error) {
        const reason = error.code === "23505" ? "ทะเบียนซ้ำ" : "บันทึกไม่สำเร็จ";
        skipped.push({ plate: row.licensePlate, reason });
        continue;
      }
      createdCount++;
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
