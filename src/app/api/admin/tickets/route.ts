import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import {
  listTickets,
  TicketStatus,
  updateTicketStatus,
} from "@/lib/ticketStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const authed = await isAdminAuthenticated();
  if (!authed) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tickets = await listTickets();
    return NextResponse.json({ ok: true, tickets });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Database read failed.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const authed = await isAdminAuthenticated();
  if (!authed) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const id = String(body?.id || "").trim();
    const status = String(body?.status || "").trim() as TicketStatus;

    if (!id || !["pending", "in_progress", "resolved"].includes(status)) {
      return NextResponse.json(
        { ok: false, error: "Invalid ticket id or status." },
        { status: 400 }
      );
    }

    const updated = await updateTicketStatus(id, status);
    if (!updated) {
      return NextResponse.json(
        { ok: false, error: "Ticket not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, ticket: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Database update failed.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
