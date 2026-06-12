import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import prisma from "@/lib/db";
import { encode } from "next-auth/jwt";
import { recordUserSession } from "@/lib/auth-utils";

const client = new OAuth2Client(process.env.AUTH_GOOGLE_ID);

export async function POST(req: Request) {
  try {
    const authSecret = process.env.AUTH_SECRET;
    const googleClientId = process.env.AUTH_GOOGLE_ID;
    if (!authSecret || !googleClientId) {
      return NextResponse.json({ error: "Server auth configuration is missing" }, { status: 500 });
    }

    const json = await req.json();
    const { idToken, deviceType } = json;

    if (!idToken) {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    // Verify the ID token from Flutter
    const ticket = await client.verifyIdToken({
      idToken,
      audience: googleClientId,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return NextResponse.json({ error: "Invalid token payload" }, { status: 401 });
    }

    const { email, name, picture, sub: googleId } = payload;

    // Synchronize user in database
    const user = await prisma.user.upsert({
      where: { email },
      update: { name, image: picture },
      create: {
        email,
        name,
        image: picture,
        accounts: {
          create: {
            type: "oauth",
            provider: "google",
            providerAccountId: googleId,
          },
        },
      },
    });

    // After user upsert:
    const membership = await prisma.farmMember.findFirst({
      where: { userId: user.id },
      select: { farmId: true, role: true }
    });

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true, mustChangePassword: true, sessionVersion: true }
    });

    // Create a NextAuth session JWT
    const token = await encode({
      token: {
        sub: user.id,
        email: user.email,
        name: user.name,
        picture: user.image,
        role: dbUser?.role ?? 'OWNER',
        activeFarmId: membership?.farmId ?? null,
        mustChangePassword: dbUser?.mustChangePassword ?? false,
        sessionVersion: dbUser?.sessionVersion ?? 1,
        securityInvalidated: false,
        securityNotice: null,
      },
      secret: authSecret,
      salt: "authjs.session-token",
    });
    
    // Record the session (Web if cookie set, else Desktop/Mobile from deviceType)
    await recordUserSession(user.id, deviceType || 'Desktop');

    const response = NextResponse.json({ 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      token: token // For Flutter to use in Authorization header
    });

    // Set cookie for browser-based access (useful if Flutter uses a webview or for testing)
    response.cookies.set("authjs.session-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return response;

  } catch (error) {
    console.error("Error in google-login:", error);
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}
