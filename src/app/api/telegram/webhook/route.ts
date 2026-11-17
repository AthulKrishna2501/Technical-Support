import { NextResponse } from "next/server";
import { TicketStatus, updateTicketStatus } from "@/lib/ticketStore";

async function telegramApi(
  token: string,
  method: string,
  payload: Record<string, unknown>
) {
  return fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function POST(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    return NextResponse.json({ ok: true });
  }

  try {
    const update = await request.json();
    const cb = update?.callback_query;
    if (!cb) {
      return NextResponse.json({ ok: true });
    }

    const callbackId = cb.id as string;
    const data = String(cb.data || "");

    if (data === "noop") {
      await telegramApi(token, "answerCallbackQuery", {
        callback_query_id: callbackId,
      });
      return NextResponse.json({ ok: true });
    }

    const match = data.match(/^status:(STU-\d+):(in_progress|resolved)$/);
    if (!match) {
      await telegramApi(token, "answerCallbackQuery", {
        callback_query_id: callbackId,
        text: "Unknown action.",
      });
      return NextResponse.json({ ok: true });
    }

    const ticketId = match[1];
    const nextStatus = match[2] as TicketStatus;
    const actor =
      cb.from?.first_name || cb.from?.username || "Mentor";

    const updated = await updateTicketStatus(ticketId, nextStatus);
    if (!updated) {
      await telegramApi(token, "answerCallbackQuery", {
        callback_query_id: callbackId,
        text: `Ticket #${ticketId} not found in database.`,
        show_alert: true,
      });
      return NextResponse.json({ ok: true });
    }

    const label = nextStatus === "resolved" ? "Resolved" : "In Progress";
    await telegramApi(token, "answerCallbackQuery", {
      callback_query_id: callbackId,
      text: `#${ticketId} marked as ${label}`,
    });

    const chatId = cb.message?.chat?.id;
    const messageId = cb.message?.message_id;
    if (chatId && messageId) {
      const inline_keyboard =
        nextStatus === "resolved"
          ? [
              [
                {
                  text: `✅ Resolved by ${actor}`,
                  callback_data: "noop",
                },
              ],
            ]
          : [
              [
                {
                  text: `🟡 In Progress (${actor})`,
                  callback_data: "noop",
                },
                {
                  text: "✅ Resolved",
                  callback_data: `status:${ticketId}:resolved`,
                },
              ],
            ];

      await telegramApi(token, "editMessageReplyMarkup", {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: { inline_keyboard },
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
