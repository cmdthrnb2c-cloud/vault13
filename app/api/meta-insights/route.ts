import { NextResponse } from "next/server";
import {
  getMetaInsightsReport,
  MetaMonitoringError,
} from "@/lib/meta-monitoring";

export async function GET() {
  try {
    const report = await getMetaInsightsReport();
    return NextResponse.json({ ok: true, ...report });
  } catch (error) {
    if (error instanceof MetaMonitoringError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { ok: false, error: "Meta insights request failed." },
      { status: 502 }
    );
  }
}
