import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { statusUpdateSchema, deleteRegistrationSchema, updateRegistrationSchema } from "@/lib/validation";
import { buildGateWorkbook, buildGateTemplateWorkbook } from "@/lib/gate-file";
import { buildRosterTemplateWorkbook } from "@/lib/roster-file";
import {
  ADMIN_SESSION_COOKIE,
  checkAdminPassword,
  createAdminSessionToken,
  verifyAdminSessionToken,
} from "@/lib/admin-auth";

function isAuthenticated(): boolean {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  return verifyAdminSessionToken(token);
}

function unauthorized() {
  return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET: list registrations (?search=), or export CSV (?action=export[&ids=...])
export async function GET(req: NextRequest) {
  try {
    if (!isAuthenticated()) return unauthorized();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() ?? "";
    const action = searchParams.get("action");

    if (action === "template") {
      return new NextResponse(new Uint8Array(buildGateTemplateWorkbook()), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": 'attachment; filename="import_template.xlsx"',
        },
      });
    }

    if (action === "roster-template") {
      return new NextResponse(new Uint8Array(buildRosterTemplateWorkbook()), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": 'attachment; filename="roster_template.xlsx"',
        },
      });
    }

    const idsParam = searchParams.get("ids");
    const selectedIds = idsParam
      ? idsParam.split(",").map((s) => s.trim()).filter((s) => UUID_RE.test(s))
      : null;

    let query = supabaseAdmin
      .from("car_registrations")
      .select(
        "id, license_plate, full_name_th, full_name_en, username, position, department, phone_number, province, car_type, car_color, license_plate_type, status, created_at"
      )
      .order("created_at", { ascending: false });

    if (selectedIds && selectedIds.length > 0) {
      // Exporting a specific selection takes priority over any search filter.
      query = query.in("id", selectedIds);
    } else if (search) {
      const escaped = search.replace(/[%_]/g, (m) => `\\${m}`);
      query = query.or(
        `license_plate.ilike.%${escaped}%,full_name_en.ilike.%${escaped}%,full_name_th.ilike.%${escaped}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: "เกิดข้อผิดพลาดในการดึงข้อมูล" },
        { status: 500 }
      );
    }

    if (action === "export") {
      const exportRows = data ?? [];

      // Exporting a hand-picked selection means "send these to the gate
      // system" — treat that as an approval action so status reflects
      // reality. A plain "export all" (no selection) stays read-only.
      if (selectedIds && selectedIds.length > 0 && exportRows.length > 0) {
        const { error: approveError } = await supabaseAdmin
          .from("car_registrations")
          .update({ status: "approved", updated_at: new Date().toISOString() })
          .in(
            "id",
            exportRows.map((r) => r.id)
          );
        if (approveError) {
          return NextResponse.json(
            { success: false, error: "อัปเดตสถานะไม่สำเร็จ" },
            { status: 500 }
          );
        }
        for (const row of exportRows) row.status = "approved";
      }

      const workbookBuffer = buildGateWorkbook(exportRows);

      return new NextResponse(new Uint8Array(workbookBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="car_registrations_${Date.now()}.xlsx"`,
        },
      });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("GET /api/admin failed:", err);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดของระบบ กรุณาลองใหม่อีกครั้ง" },
      { status: 500 }
    );
  }
}

const loginSchema = z.object({
  action: z.literal("login"),
  password: z.string().min(1),
});

const logoutSchema = z.object({
  action: z.literal("logout"),
});

// POST: login / logout
export async function POST(req: NextRequest) {
  try {
    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
    }

    const logoutParsed = logoutSchema.safeParse(json);
    if (logoutParsed.success) {
      cookies().delete(ADMIN_SESSION_COOKIE);
      return NextResponse.json({ success: true });
    }

    const loginParsed = loginSchema.safeParse(json);
    if (!loginParsed.success) {
      return NextResponse.json({ success: false, error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
    }

    if (!checkAdminPassword(loginParsed.data.password)) {
      return NextResponse.json(
        { success: false, error: "รหัสผ่านไม่ถูกต้อง" },
        { status: 401 }
      );
    }

    const token = createAdminSessionToken();
    cookies().set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 8 * 60 * 60,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/admin failed:", err);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดของระบบ กรุณาลองใหม่อีกครั้ง" },
      { status: 500 }
    );
  }
}

// PATCH: update registration status (approve / reject)
export async function PATCH(req: NextRequest) {
  try {
    if (!isAuthenticated()) return unauthorized();

    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
    }

    const parsed = statusUpdateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("car_registrations")
      .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
      .eq("id", parsed.data.id);

    if (error) {
      return NextResponse.json(
        { success: false, error: "อัปเดตสถานะไม่สำเร็จ" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PATCH /api/admin failed:", err);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดของระบบ กรุณาลองใหม่อีกครั้ง" },
      { status: 500 }
    );
  }
}

// PUT: edit a registration's own submitted data (not just status)
export async function PUT(req: NextRequest) {
  try {
    if (!isAuthenticated()) return unauthorized();

    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
    }

    const parsed = updateRegistrationSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "ข้อมูลไม่ถูกต้อง",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // Not part of the shared registration schema (that mirrors the public
    // form 1:1) — this flag only exists in the admin edit flow.
    const applyToAllWithUsername = Boolean(
      (json as { applyToAllWithUsername?: unknown }).applyToAllWithUsername
    );

    const { id, ...fields } = parsed.data;

    // A duplicate plate check that excludes this row itself, since editing
    // a record to keep its own existing plate must not look like a clash.
    const { data: existing, error: lookupError } = await supabaseAdmin
      .from("car_registrations")
      .select("id")
      .eq("license_plate", fields.license_plate)
      .neq("id", id)
      .maybeSingle();

    if (lookupError) {
      return NextResponse.json(
        { success: false, error: "เกิดข้อผิดพลาดของระบบ กรุณาลองใหม่อีกครั้ง" },
        { status: 500 }
      );
    }

    if (existing) {
      return NextResponse.json(
        { success: false, error: "ทะเบียนนี้ถูกใช้งานโดยรายการอื่นแล้ว" },
        { status: 409 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("car_registrations")
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (updateError) {
      if (updateError.code === "23505") {
        return NextResponse.json(
          { success: false, error: "ทะเบียนนี้ถูกใช้งานโดยรายการอื่นแล้ว" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { success: false, error: "บันทึกข้อมูลไม่สำเร็จ" },
        { status: 500 }
      );
    }

    // "Apply to all this person's cars" — username isn't part of this form
    // (it's assigned automatically, never hand-edited), so it's unchanged by
    // the update above and still identifies which other rows are this same
    // person's other vehicles. Only the person-level fields propagate;
    // vehicle-level fields (plate, province, car type/color, plate type)
    // stay row-specific.
    if (applyToAllWithUsername) {
      const { data: selfRow } = await supabaseAdmin
        .from("car_registrations")
        .select("username")
        .eq("id", id)
        .maybeSingle();

      if (selfRow?.username) {
        await supabaseAdmin
          .from("car_registrations")
          .update({
            full_name_th: fields.full_name_th,
            full_name_en: fields.full_name_en,
            position: fields.position,
            department: fields.department,
            phone_number: fields.phone_number,
            updated_at: new Date().toISOString(),
          })
          .eq("username", selfRow.username)
          .neq("id", id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PUT /api/admin failed:", err);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดของระบบ กรุณาลองใหม่อีกครั้ง" },
      { status: 500 }
    );
  }
}

// DELETE: remove a registration permanently
export async function DELETE(req: NextRequest) {
  try {
    if (!isAuthenticated()) return unauthorized();

    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
    }

    const parsed = deleteRegistrationSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "ข้อมูลไม่ถูกต้อง" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("car_registrations")
      .delete()
      .eq("id", parsed.data.id);

    if (error) {
      return NextResponse.json(
        { success: false, error: "ลบข้อมูลไม่สำเร็จ" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/admin failed:", err);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดของระบบ กรุณาลองใหม่อีกครั้ง" },
      { status: 500 }
    );
  }
}
