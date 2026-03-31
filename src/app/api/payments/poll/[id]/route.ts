import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pollPaynowTransaction, isPaynowPaid } from "@/lib/paynow";
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
      return NextResponse.json({ status: "COMPLETED", hasAccess: true });
    }
    if (payment.status === "FAILED") {
      return NextResponse.json({ status: "FAILED", hasAccess: false });
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

    if (isPaynowPaid(pollResponse.redirectUrl ?? "")) {
      // The sdk re-uses InitResponse for poll; status lives in redirectUrl field
      // when it's a status string like "Paid" from the poll URL response.
    }

    // Check the status embedded in the response (SDK re-wraps via parse/InitResponse)
    // The poll URL returns the same URL-encoded payload as the webhook.
    // The SDK's pollTransaction calls parse() which builds an InitResponse.
    // If payment was received, the redirect URL field is absent but success=true.
    const paid = pollResponse.success || isPaynowPaid(pollResponse.redirectUrl ?? "");

    if (paid) {
      const matchEnd = new Date(payment.match.kickoff.getTime() + 4 * 60 * 60 * 1000);
      const fromNow = new Date(Date.now() + 4 * 60 * 60 * 1000);
      const expiresAt = matchEnd > fromNow ? matchEnd : fromNow;

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
            expiresAt,
          },
          update: { expiresAt },
        }),
      ]);

      return NextResponse.json({ status: "COMPLETED", hasAccess: true });
    }

    return NextResponse.json({ status: "PENDING", hasAccess: false });
  } catch (error) {
    return handleApiError(error, "Payment poll error");
  }
}
