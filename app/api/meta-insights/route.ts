import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/admin-auth";
import {
  getMetaInsightsReport,
  MetaMonitoringError,
} from "@/lib/meta-monitoring";

export async function GET() {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

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
