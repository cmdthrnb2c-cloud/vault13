import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "QPay access tokens are only available to the server-side checkout." },
    { status: 410 }
  );
}
