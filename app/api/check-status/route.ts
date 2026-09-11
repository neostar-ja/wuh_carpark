import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { checkStatusSchema } from "@/lib/validation";
import { checkStatusRateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// GET /api/check-status?plate=XXXX&phone=0812345678
// Public self-service lookup — requires BOTH the plate and the phone number
// to match the same row ("proof of ownership" via two shared secrets),
// never just one, so it can't be used to browse other people's plates or
// phone numbers individually.
export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const { allowed, retryAfterSeconds } = checkStatusRateLimit(ip);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "ตรวจสอบถี่เกินไป กรุณาลองใหม่อีกครั้งภายหลัง" },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds ?? 60) } }
      );
    }

    const { searchParams } = new URL(req.url);
    const parsed = checkStatusSchema.safeParse({
      license_plate: searchParams.get("plate") ?? "",
      phone_number: searchParams.get("phone") ?? "",
    });

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

    const { data, error, status } = await supabaseAdmin
      .from("car_registrations")
      .select(
        "license_plate, full_name_th, province, car_type, car_color, license_plate_type, status, created_at"
      )
      .eq("license_plate", parsed.data.license_plate)
      .eq("phone_number", parsed.data.phone_number)
      .abortSignal(AbortSignal.timeout(8_000))
      .maybeSingle();

    if (error) {
      // Log only error metadata: database details can contain personal data.
      console.error("GET /api/check-status database request failed", {
        code: error.code,
        status,
      });
      // PostgREST reports transport failures (including DNS and timeouts)
      // with status 0; upstream outages may return a 5xx response.
      if (status === 0 || status >= 500) {
        return NextResponse.json(
          {
            success: false,
            error: "ระบบตรวจสอบสถานะไม่พร้อมใช้งานชั่วคราว กรุณาลองใหม่ภายหลัง หากยังใช้งานไม่ได้ กรุณาติดต่อเจ้าหน้าที่",
          },
          { status: 503, headers: { "Retry-After": "60", "Cache-Control": "no-store" } }
        );
      }
      return NextResponse.json(
        { success: false, error: "เกิดข้อผิดพลาดของระบบ กรุณาลองใหม่อีกครั้ง" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json({ success: true, found: false });
    }

    return NextResponse.json({ success: true, found: true, data });
  } catch (err) {
    console.error("GET /api/check-status failed:", err);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาดของระบบ กรุณาลองใหม่อีกครั้ง" },
      { status: 500 }
    );
  }
}
