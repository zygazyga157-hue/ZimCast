import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { initiatePaynowPayment, initiatePaynowMobile } from "@/lib/paynow";
import { computePassWindow } from "@/lib/match-window";
import { handleApiError } from "@/lib/errors";
import { choosePublicOrigin } from "@/lib/public-origin";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { matchId, provider, phone } = body as {
      matchId?: string;
      provider?: string;
      phone?: string;
    };

    if (!matchId || !provider) {
      return NextResponse.json(
        { error: "matchId and provider are required" },
        { status: 400 }
      );
    }

    if (!["ECOCASH", "PAYNOW"].includes(provider)) {
      return NextResponse.json(
        { error: "Invalid payment provider" },
        { status: 400 }
      );
    }

    if (provider === "ECOCASH" && !phone) {
      return NextResponse.json(
        { error: "phone is required for EcoCash payments" },
        { status: 400 }
      );
    }

    // Check match exists
    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    // Compute pass window — block purchases after match window ends
    const linkedProgram = await prisma.program.findFirst({
      where: { matchId, category: "SPORTS" },
      select: { endTime: true },
      orderBy: { startTime: "asc" },
    });
    const { passEnd } = computePassWindow(
      match.kickoff,
      linkedProgram?.endTime ?? null
    );

    if (Date.now() >= passEnd.getTime()) {
      return NextResponse.json(
        { error: "This match has ended" },
        { status: 409 }
      );
    }

    // Check if user already has a valid pass (within window)
    const existingPass = await prisma.matchPass.findUnique({
      where: {
        userId_matchId: {
          userId: session.user.id,
          matchId,
        },
      },
    });

    if (existingPass && existingPass.expiresAt > new Date()) {
      return NextResponse.json(
        { error: "You already have access to this match" },
        { status: 409 }
      );
    }

    // Create pending payment record first so we have an ID
    const payment = await prisma.payment.create({
      data: {
        userId: session.user.id,
        matchId,
        amount: match.price,
        provider: provider as "ECOCASH" | "PAYNOW",
      },
    });

    const amount = Number(match.price);
    const description = `${match.homeTeam} vs ${match.awayTeam} – Match Access`;

    let paynowResponse;

    if (provider === "ECOCASH") {
      // Mobile payment — no browser redirect
      paynowResponse = await initiatePaynowMobile({
        reference: payment.id,
        description,
        amount,
        phone: phone!,
        method: "ecocash",
      });
    } else {
      // PAYNOW web redirect
      const baseUrl = choosePublicOrigin(new URL(req.url).origin);
      paynowResponse = await initiatePaynowPayment({
        reference: payment.id,
        description,
        amount,
        returnUrl: `${baseUrl}/payment/success?ref=${payment.id}`,
      });
    }

    if (!paynowResponse || !paynowResponse.success) {
      // Roll back the payment record — initiation failed
      await prisma.payment.delete({ where: { id: payment.id } });
      return NextResponse.json(
        { error: paynowResponse?.error ?? "Payment gateway error. Please try again." },
        { status: 502 }
      );
    }

    // Store the poll URL so we can check status later
    if (paynowResponse.pollUrl) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { pollUrl: paynowResponse.pollUrl },
      });
    }

    return NextResponse.json({
      paymentId: payment.id,
      amount,
      provider,
      status: "PENDING",
      /** Redirect the user here to complete payment (web only). */
      redirectUrl: paynowResponse.redirectUrl ?? null,
      /** Poll URL for USSD/mobile flows where redirect is null. */
      pollUrl: paynowResponse.pollUrl ?? null,
    });
  } catch (error) {
    return handleApiError(error, "Payment initiation error");
  }
}
