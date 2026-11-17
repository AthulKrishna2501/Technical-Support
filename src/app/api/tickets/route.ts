import { NextResponse } from "next/server";
import { createTicket, TicketRecord } from "@/lib/ticketStore";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function sendTelegramNotification(ticket: TicketRecord): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) return;

  const isTech = ticket.type === "tech";
  const lines = [
    isTech
      ? `🛠️ <b>New Technical Support Request</b>  <code>#${escapeHtml(ticket.id)}</code>`
      : `📋 <b>New Project Support Request</b>  <code>#${escapeHtml(ticket.id)}</code>`,
    "",
    `👤 <b>Name:</b> ${escapeHtml(ticket.name)}`,
    `📞 <b>Contact:</b> ${escapeHtml(ticket.contact)}`,
    `🎓 <b>Batch:</b> ${escapeHtml(ticket.batch)}`,
    `📚 <b>Domain:</b> ${escapeHtml(ticket.domain)}`,
  ];

  if (isTech && ticket.module) {
    lines.push(`📖 <b>Module:</b> ${escapeHtml(ticket.module)}`);
  }
  if (!isTech && ticket.projectType) {
    lines.push(`🗂️ <b>Project:</b> ${escapeHtml(ticket.projectType)}`);
  }

  lines.push("");
  lines.push(
    `📝 <b>${isTech ? "Issue" : "Description"}:</b>\n${escapeHtml(
      ticket.description
    )}`
  );

  if (ticket.audioDataUrl) {
    lines.push("");
    lines.push("🎧 <b>Audio:</b> Voice note attached (open Admin Console)");
  }

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: lines.join("\n"),
      parse_mode: "HTML",
    }),
  });
}

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

    const hasDirectTelegram = Boolean(
      process.env.TELEGRAM_BOT_TOKEN?.trim() &&
        process.env.TELEGRAM_CHAT_ID?.trim()
    );

    if (hasDirectTelegram) {
      await sendTelegramNotification(ticket);
    } else {
      // Fallback to Apps Script only when direct Telegram env vars are not set
      const webhookUrl =
        (formType === "tech"
          ? process.env.NEXT_PUBLIC_TECH_APPS_SCRIPT_URL?.trim()
          : process.env.NEXT_PUBLIC_PROJECT_APPS_SCRIPT_URL?.trim()) ||
        process.env.NEXT_PUBLIC_APPS_SCRIPT_URL?.trim();

      if (webhookUrl) {
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(body),
        }).catch(() => {});
      }
    }

    return NextResponse.json({ ok: true, ticket });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create ticket.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
