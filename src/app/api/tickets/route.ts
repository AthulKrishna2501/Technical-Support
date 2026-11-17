import { NextResponse } from "next/server";
import { createTicket } from "@/lib/ticketStore";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const formType = body?.formType === "project" ? "project" : "tech";
    const name = String(body?.name || "").trim();
    const email = String(body?.email || "").trim();
    const contact = String(body?.contact || "").trim();
    const batch = String(body?.batch || "").trim();
    const domain = String(body?.domain || "").trim();
    const moduleVal = String(body?.module || "").trim();
    const projectType = String(body?.projectType || "").trim();
    const description = String(body?.description || "").trim();

    if (!name || !email || !contact || !batch || !domain || !description) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields." },
        { status: 400 }
      );
    }

    let audioDataUrl: string | undefined;
    if (body?.audio?.data && body?.audio?.mimeType) {
      audioDataUrl = `data:${body.audio.mimeType};base64,${body.audio.data}`;
    }

    const ticket = await createTicket({
      type: formType,
      name,
      email,
      contact,
      batch,
      domain,
      module: moduleVal,
      projectType,
      description,
      audioDataUrl,
    });

    // Best-effort forward to Apps Script (for Telegram alerts / sheet backup)
    const webhookUrl =
      (formType === "tech"
        ? process.env.NEXT_PUBLIC_TECH_APPS_SCRIPT_URL?.trim()
        : process.env.NEXT_PUBLIC_PROJECT_APPS_SCRIPT_URL?.trim()) ||
      process.env.NEXT_PUBLIC_APPS_SCRIPT_URL?.trim();

    if (webhookUrl) {
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(body),
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true, ticket });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create ticket.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
