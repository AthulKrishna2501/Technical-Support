import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authed = await isAdminAuthenticated();
  if (!authed) {
    return NextResponse.json(
      { ok: false, error: "Sign in at /admin first, then visit /api/telegram/setup." },
      { status: 401 }
    );
  }

  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "TELEGRAM_BOT_TOKEN is not configured." },
      { status: 400 }
    );
  }

  const reqUrl = new URL(request.url);
  const customUrl = reqUrl.searchParams.get("url")?.trim();
  const webhookUrl = customUrl || `${reqUrl.origin}/api/telegram/webhook`;

  const res = await fetch(
    `https://api.telegram.org/bot${token}/setWebhook`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ["callback_query"],
      }),
    }
  );

  const data = await res.json();
  return NextResponse.json({ ok: Boolean(data.ok), webhookUrl, telegram: data });
}
