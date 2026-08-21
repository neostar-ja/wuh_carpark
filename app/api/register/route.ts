import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase";
import { registrationApiSchema, licensePlateCheckSchema } from "@/lib/validation";
import { checkRateLimit, checkLookupRateLimit, getClientIp } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { generateUsername } from "@/lib/username";

const requestSchema = registrationApiSchema.extend({
  turnstileToken: z.string().optional(),
});

// GET /api/register?plate=XXXX — real-time duplicate check while the user is
// still typing, so they find out a plate is taken before fighting through
// the anti-bot check and consent box. Deliberately does NOT require
// Turnstile (it only ever returns a boolean, nothing sensitive), just a
// looser rate limit to blunt plate-enumeration abuse.
export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const { allowed } = checkLookupRateLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "ตรวจสอบถี่เกินไป กรุณาลองใหม่อีกครั้งภายหลัง" },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(req.url);
    const parsed = licensePlateCheckSchema.safeParse({
      license_plate: searchParams.get("plate") ?? "",
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "รูปแบบทะเบียนไม่ถูกต้อง" },
        { status: 400 }
      );
    }

    const { data: existing, error } = await supabaseAdmin
      .from("car_registrations")
      .select("id")
      .eq("license_plate", parsed.data.license_plate)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { success: false, error: "เกิดข้อผิดพลาดของระบบ กรุณาลองใหม่อีกครั้ง" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, exists: Boolean(existing) });
  } catch (err) {
    console.error("GET /api/register failed:", err);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดของระบบ กรุณาลองใหม่อีกครั้ง" },
      { status: 500 }
    );
  }
}

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

    // Check for a duplicate plate before spending a Turnstile verification
    // call, so a resubmitted duplicate always surfaces the accurate "already
    // registered" message instead of a stale/expired anti-bot error.
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

    const turnstileOk = await verifyTurnstileToken(turnstileToken, ip);
    if (!turnstileOk) {
      return NextResponse.json(
        { success: false, error: "การยืนยันตัวตน (anti-bot) ไม่สำเร็จ กรุณาลองใหม่" },
        { status: 400 }
      );
    }

    // An employee with more than one vehicle shares one username across all
    // of their registrations — "same person" is matched by Thai name +
    // phone together, the same pair check-status already uses to prove
    // ownership. Only generate a fresh username when no such person exists
    // yet.
    const { data: existingPerson } = await supabaseAdmin
      .from("car_registrations")
      .select("username")
      .eq("full_name_th", registration.full_name_th)
      .eq("phone_number", registration.phone_number)
      .not("username", "is", null)
      .limit(1)
      .maybeSingle();

    const username =
      existingPerson?.username ??
      (await generateUsername(registration.full_name_en, async (candidate) => {
        const { data } = await supabaseAdmin
          .from("car_registrations")
          .select("id")
          .eq("username", candidate)
          .maybeSingle();
        return Boolean(data);
      }));

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("car_registrations")
      .insert({
        license_plate: registration.license_plate,
        full_name_th: registration.full_name_th,
        full_name_en: registration.full_name_en,
        username,
        position: registration.position,
        department: registration.department,
        phone_number: registration.phone_number,
        province: registration.province,
        car_type: registration.car_type,
        car_color: registration.car_color,
        license_plate_type: registration.license_plate_type,
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      // Unique-constraint race: two requests for the same plate landed at
      // once (username no longer has a unique constraint, so this can only
      // be the plate now).
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
