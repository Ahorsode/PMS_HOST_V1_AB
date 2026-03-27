import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import prisma from "@/lib/db";
import { encode } from "next-auth/jwt";

const client = new OAuth2Client(process.env.AUTH_GOOGLE_ID);

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const idToken = json.idToken;

    if (!idToken) {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    // Verify the ID token from Flutter
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.AUTH_GOOGLE_ID,
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

    // Create a NextAuth session JWT
    const secret = process.env.AUTH_SECRET || "development_secret";
    
    const token = await encode({
      token: {
        sub: user.id,
        email: user.email,
        name: user.name,
        picture: user.image,
      },
      secret,
      salt: "authjs.session-token",
    });

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
