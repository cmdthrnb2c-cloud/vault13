import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  getMetaInsightsReport,
  MetaMonitoringError,
} from "@/lib/meta-monitoring";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const expectedAuthorization = cronSecret ? `Bearer ${cronSecret}` : "";
  const providedAuthorization = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(expectedAuthorization);
  const provided = Buffer.from(providedAuthorization);

  if (
    !cronSecret ||
    expected.length !== provided.length ||
    !timingSafeEqual(expected, provided)
  ) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const report = await getMetaInsightsReport();
    return NextResponse.json({
      ok: true,
      checkedAt: new Date().toISOString(),
      ...report,
    });
  } catch (error) {
    if (error instanceof MetaMonitoringError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Meta monitoring request failed." },
      { status: 502 }
    );
  }
}
