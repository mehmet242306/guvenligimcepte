import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/security/server";

const COUNTER_KEY = "site_visits";

function normalizeCount(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export async function GET() {
  try {
    const service = createServiceClient();
    const { data, error } = await service
      .from("site_counters")
      .select("count_value")
      .eq("counter_key", COUNTER_KEY)
      .maybeSingle();

    if (error) {
      console.warn("[site-visits] count lookup failed:", error.message);
      return NextResponse.json({ count: null }, { status: 200 });
    }

    return NextResponse.json({ count: normalizeCount(data?.count_value) }, { status: 200 });
  } catch (error) {
    console.warn("[site-visits] count lookup unavailable:", error);
    return NextResponse.json({ count: null }, { status: 200 });
  }
}

export async function POST() {
  try {
    const service = createServiceClient();
    const { data, error } = await service.rpc("increment_site_counter", {
      p_counter_key: COUNTER_KEY,
      p_increment: 1,
    });

    if (error) {
      console.warn("[site-visits] increment failed:", error.message);
      return GET();
    }

    return NextResponse.json({ count: normalizeCount(data) }, { status: 200 });
  } catch (error) {
    console.warn("[site-visits] increment unavailable:", error);
    return GET();
  }
}
