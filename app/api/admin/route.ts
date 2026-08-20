import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { statusUpdateSchema, deleteRegistrationSchema } from "@/lib/validation";
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

function toCsvValue(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// GET: list registrations (?search=), or export CSV (?action=export)
export async function GET(req: NextRequest) {
  try {
    if (!isAuthenticated()) return unauthorized();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() ?? "";
    const action = searchParams.get("action");

    let query = supabaseAdmin
      .from("car_registrations")
      .select(
        "id, license_plate, full_name_th, full_name_en, username, position, department, phone_number, car_type, car_color, license_plate_type, status, created_at"
      )
      .order("created_at", { ascending: false });

    if (search) {
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
      const header = [
        "license_plate",
        "full_name_th",
        "full_name_en",
        "username",
        "position",
        "department",
        "phone_number",
        "car_type",
        "car_color",
        "license_plate_type",
        "status",
        "created_at",
      ];
      const rows = (data ?? []).map((row) =>
        [
          row.license_plate,
          row.full_name_th,
          row.full_name_en,
          row.username,
          row.position,
          row.department,
          row.phone_number,
          row.car_type,
          row.car_color,
          row.license_plate_type,
          row.status,
          row.created_at,
        ]
          .map((v) => toCsvValue(String(v ?? "")))
          .join(",")
      );
      const csv = [header.join(","), ...rows].join("\n");

      return new NextResponse(`﻿${csv}`, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="car_registrations_${Date.now()}.csv"`,
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
