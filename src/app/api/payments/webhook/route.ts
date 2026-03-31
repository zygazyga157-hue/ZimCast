import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parsePaynowWebhook, isPaynowPaid } from "@/lib/paynow";
import { handleApiError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    // Paynow posts a URL-encoded body; read it as raw text for hash verification.
    const rawBody = await req.text();

    let reference: string;
    let statusStr: string;

    if (rawBody.includes("=")) {
      // Paynow URL-encoded webhook — parse and verify HMAC hash
      let statusResponse;
      try {
        statusResponse = parsePaynowWebhook(rawBody);
      } catch {
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
      }
      reference = statusResponse.reference;
      statusStr = statusResponse.status;
    } else {
      // Fallback: our own JSON test/polling body { paymentId, status }
      let body: { paymentId?: string; status?: string };
      try {
        body = JSON.parse(rawBody);
      } catch {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
      }
      if (!body.paymentId || !body.status) {
        return NextResponse.json(
          { error: "paymentId and status are required" },
          { status: 400 }
        );
      }
      reference = body.paymentId;
      statusStr = body.status;
    }

    const payment = await prisma.payment.findUnique({
      where: { id: reference },
      include: { match: true },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Idempotency — already processed
    if (payment.status === "COMPLETED") {
      return NextResponse.json({ message: "Payment already processed" });
    }

    const paid = isPaynowPaid(statusStr) || statusStr === "COMPLETED";

    if (paid) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "COMPLETED" },
      });

      // Match pass expires at kickoff + 4 hours, or 4 hours from now — whichever is later
      const matchEnd = new Date(payment.match.kickoff.getTime() + 4 * 60 * 60 * 1000);
      const fromNow = new Date(Date.now() + 4 * 60 * 60 * 1000);
      const expiresAt = matchEnd > fromNow ? matchEnd : fromNow;

      await prisma.matchPass.upsert({
        where: {
          userId_matchId: {
            userId: payment.userId,
            matchId: payment.matchId,
          },
        },
        create: { userId: payment.userId, matchId: payment.matchId, expiresAt },
        update: { expiresAt },
      });

      return NextResponse.json({ message: "Payment confirmed, access granted" });
    } else {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED" },
      });

      return NextResponse.json({ message: "Payment failed" });
    }
  } catch (error) {
    return handleApiError(error, "Payment webhook error");
  }
}
