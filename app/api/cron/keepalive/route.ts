import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// GET /api/cron/keepalive
// Triggered daily by Vercel Cron to prevent Supabase Free Tier from pausing.
export async function GET(req: NextRequest) {
  // If CRON_SECRET is configured in Vercel environment variables, verify it.
  const authHeader = req.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const startTime = Date.now();
    const { data, error, status } = await supabaseAdmin
      .from("car_registrations")
      .select("id")
      .limit(1)
      .abortSignal(AbortSignal.timeout(8_000));

    if (error) {
      console.error("[cron/keepalive] Supabase query failed:", {
        code: error.code,
        message: error.message,
        status,
      });
      return NextResponse.json(
        {
          success: false,
          error: "Supabase query failed",
          code: error.code,
        },
        { status: 500 }
      );
    }

    const durationMs = Date.now() - startTime;
    return NextResponse.json({
      success: true,
      message: "Supabase keepalive successful",
      durationMs,
      timestamp: new Date().toISOString(),
      rowsFound: data?.length ?? 0,
    });
  } catch (err) {
    console.error("[cron/keepalive] Unexpected error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Internal error",
      },
      { status: 500 }
    );
  }
}
