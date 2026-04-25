import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/mail";
import { handleApiError } from "@/lib/errors";
import { getPublicOrigin } from "@/lib/public-origin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name, phone, dateOfBirth, gender, city, country, interests, language } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    if (phone) {
      const existingPhone = await prisma.user.findUnique({ where: { phone } });
      if (existingPhone) {
        return NextResponse.json(
          { error: "Phone number already registered" },
          { status: 409 }
        );
      }
    }

    const hashedPassword = await hash(password, 12);
    const verifyToken = randomUUID();
    const verifyTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
        phone: phone || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender: gender || null,
        city: city || null,
        country: country || null,
        interests: Array.isArray(interests) ? interests : [],
        language: language || "English",
        verifyToken,
        verifyTokenExpiry,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    // Send verification email (non-blocking — don't fail registration if email fails)
    const origin = getPublicOrigin(req);
    sendVerificationEmail(email, verifyToken, origin).catch((err) =>
      console.error("Failed to send verification email:", err)
    );

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return handleApiError(error, "Registration error");
  }
}
