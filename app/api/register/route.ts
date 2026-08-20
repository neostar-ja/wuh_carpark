import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { registrationApiSchema } from "@/lib/validation";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";

const requestSchema = registrationApiSchema.extend({
  turnstileToken: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);

    const { allowed, retryAfterSeconds } = checkRateLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "ส่งคำขอถี่เกินไป กรุณาลองใหม่อีกครั้งภายหลัง",
        },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds ?? 60) } }
      );
    }

    let json: unknown;
    try {
      json = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "รูปแบบข้อมูลไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const parsed = requestSchema.safeParse(json);
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

    const { turnstileToken, ...registration } = parsed.data;

    const turnstileOk = await verifyTurnstileToken(turnstileToken, ip);
    if (!turnstileOk) {
      return NextResponse.json(
        { success: false, error: "การยืนยันตัวตน (anti-bot) ไม่สำเร็จ กรุณาลองใหม่" },
        { status: 400 }
      );
    }

    const { data: existing, error: lookupError } = await supabaseAdmin
      .from("car_registrations")
      .select("id")
      .eq("license_plate", registration.license_plate)
      .maybeSingle();

    if (lookupError) {
      return NextResponse.json(
        { success: false, error: "เกิดข้อผิดพลาดของระบบ กรุณาลองใหม่อีกครั้ง" },
        { status: 500 }
      );
    }

    if (existing) {
      return NextResponse.json(
        { success: false, error: "ทะเบียนนี้ลงทะเบียนแล้ว" },
        { status: 409 }
      );
    }

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("car_registrations")
      .insert({
        license_plate: registration.license_plate,
        full_name_th: registration.full_name_th,
        full_name_en: registration.full_name_en,
        position: registration.position,
        department: registration.department,
        phone_number: registration.phone_number,
        car_type: registration.car_type,
        car_color: registration.car_color,
        license_plate_type: registration.license_plate_type,
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      // Unique-constraint race: two requests for the same plate landed at once.
      if (insertError?.code === "23505") {
        return NextResponse.json(
          { success: false, error: "ทะเบียนนี้ลงทะเบียนแล้ว" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { success: false, error: "เกิดข้อผิดพลาดของระบบ กรุณาลองใหม่อีกครั้ง" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, referenceId: inserted.id }, { status: 201 });
  } catch (err) {
    console.error("POST /api/register failed:", err);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดของระบบ กรุณาลองใหม่อีกครั้ง" },
      { status: 500 }
    );
  }
}
