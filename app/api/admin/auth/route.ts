import { NextResponse } from "next/server";
import {
  clearAdminSessionCookie,
  createAdminSessionCookie,
  hasAdminSession,
  isValidAdminPassword,
} from "@/lib/admin-auth";

export async function GET(request: Request) {
  try {
    return NextResponse.json({ authenticated: hasAdminSession(request) });
  } catch {
    return NextResponse.json(
      { error: "Админы тохиргоо дутуу байна." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  let body: { password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Хүсэлтийн өгөгдөл буруу байна." }, { status: 400 });
  }

  if (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_SESSION_SECRET) {
    return NextResponse.json(
      { error: "Админы нууц үг эсвэл session тохиргоо дутуу байна." },
      { status: 500 }
    );
  }

  if (!isValidAdminPassword(body.password)) {
    return NextResponse.json({ error: "Нууц үг буруу байна." }, { status: 401 });
  }

  const response = NextResponse.json({ authenticated: true });
  const cookie = createAdminSessionCookie();
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  const cookie = clearAdminSessionCookie();
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}
