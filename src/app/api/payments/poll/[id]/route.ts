import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pollPaynowTransaction, isPaynowPaid } from "@/lib/paynow";
import { computePassWindow } from "@/lib/match-window";
import { handleApiError } from "@/lib/errors";

/**
 * GET /api/payments/poll/[id]
 *
 * Polls the Paynow gateway for the current status of a payment.
 * Used for mobile (EcoCash) flows where there is no browser redirect.
 * Also useful as a fallback if the webhook is delayed.
 *
 * The endpoint:
 * 1. Loads the payment and checks ownership.
 * 2. Calls the stored Paynow poll URL.
 * 3. If the gateway reports "paid", completes the payment record and
 *    creates the MatchPass in one transaction.
 * 4. Returns the current status to the client.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { match: true },
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payment.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Already finalised — return cached status without hitting Paynow
    if (payment.status === "COMPLETED") {
      return NextResponse.json({ status: "COMPLETED", hasAccess: true, matchId: payment.matchId });
    }
    if (payment.status === "FAILED") {
      return NextResponse.json({ status: "FAILED", hasAccess: false, matchId: payment.matchId });
    }

    if (!payment.pollUrl) {
      return NextResponse.json(
        { error: "No poll URL available for this payment" },
        { status: 422 }
      );
    }

    // Hit Paynow's poll endpoint
    const pollResponse = await pollPaynowTransaction(payment.pollUrl);

    if (!pollResponse) {
      return NextResponse.json({ status: "PENDING", hasAccess: false });
    }

    // The SDK's pollTransaction() re-wraps the poll URL response into an
    // InitResponse where success = (status === "ok"). For poll responses
    // Paynow returns status strings like "paid" / "pending" — never "ok".
    // So we must check the status field directly via isPaynowPaid().
    const paid =
      pollResponse.success ||
      isPaynowPaid(pollResponse.status ?? "") ||
      isPaynowPaid(pollResponse.redirectUrl ?? "");

    if (paid) {
      // Derive pass window from kickoff + linked SPORTS program
      const linkedProgram = await prisma.program.findFirst({
        where: { matchId: payment.matchId, category: "SPORTS" },
        select: { endTime: true },
        orderBy: { startTime: "asc" },
      });
      const { passEnd } = computePassWindow(
        payment.match.kickoff,
        linkedProgram?.endTime ?? null
      );

      // If the match window has already ended, don't grant access
      if (passEnd.getTime() <= Date.now()) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: "FAILED" },
        });
        return NextResponse.json(
          { status: "FAILED", hasAccess: false, matchId: payment.matchId, error: "This match has ended" },
          { status: 409 }
        );
      }

      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: { status: "COMPLETED" },
        }),
        prisma.matchPass.upsert({
          where: {
            userId_matchId: {
              userId: payment.userId,
              matchId: payment.matchId,
            },
          },
          create: {
            userId: payment.userId,
            matchId: payment.matchId,
            expiresAt: passEnd,
          },
          update: { expiresAt: passEnd },
        }),
      ]);

      return NextResponse.json({ status: "COMPLETED", hasAccess: true, matchId: payment.matchId });
    }

    return NextResponse.json({ status: "PENDING", hasAccess: false, matchId: payment.matchId });
  } catch (error) {
    return handleApiError(error, "Payment poll error");
  }
}
