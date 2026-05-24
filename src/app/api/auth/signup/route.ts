import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { normalizePhoneNumber } from '@/lib/auth-utils';
import { checkRateLimit } from '@/lib/performance/rate-limit';

export async function POST(req: Request) {
  try {
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
    const limit = await checkRateLimit({
      scope: 'api-signup',
      ip,
      limit: 8,
      windowSec: 60,
    });

    if (!limit.ok) {
      return NextResponse.json(
        {
          message: 'Too many signup attempts. Please wait and try again.',
          code: 429,
          retryAfterSec: limit.retryAfterSec,
        },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } },
      );
    }

    const { firstname, surname, email, phoneNumber, password } = await req.json();

    if (!phoneNumber) {
      return NextResponse.json({ message: 'Phone number is required' }, { status: 400 });
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    // Ensure email is null if empty string to avoid unique constraint issues
    const cleanEmail = email && email.trim() !== '' ? email.trim() : null;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { phoneNumber: normalizedPhone || phoneNumber },
          ...(cleanEmail ? [{ email: cleanEmail }] : [])
        ]
      }
    });

    // If user exists and already has a password, it's a real duplicate.
    // If user exists and doesn't have a password (or is invited), we can update them.
    if (existingUser && existingUser.password && !existingUser.mustChangePassword) {
      return NextResponse.json({ message: 'User already exists and is fully registered' }, { status: 400 });
    }

    // Check for invitations
    const invitation = await prisma.invitation.findFirst({
      where: {
        OR: [
          { phoneNumber: normalizedPhone || phoneNumber },
          ...(cleanEmail ? [{ email: cleanEmail }] : [])
        ],
        status: 'PENDING'
      }
    });

    // Handle password
    // If invited, we use '123456' as default if no password provided
    const rawPassword = password || (invitation ? '123456' : null);
    
    if (!rawPassword) {
      return NextResponse.json({ message: 'Password is required' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    
    // Set mustChangePassword if it's an invitation or if the password is the default '123456'
    const mustChangePassword = !!invitation || rawPassword === '123456';

    // Create or Update the user and associated resources in a transaction
    const user = await prisma.$transaction(async (tx) => {
      let txUser;
      if (existingUser) {
        txUser = await tx.user.update({
          where: { id: existingUser.id },
          data: {
            firstname: firstname || '',
            surname: surname || '',
            email: cleanEmail || existingUser.email,
            password: hashedPassword,
            mustChangePassword,
            role: invitation?.role || existingUser.role || 'OWNER',
          }
        });
      } else {
        txUser = await tx.user.create({
          data: {
            firstname: firstname || '',
            surname: surname || '',
            email: cleanEmail,
            phoneNumber: normalizedPhone || phoneNumber,
            password: hashedPassword,
            mustChangePassword,
            role: invitation?.role || 'OWNER',
          }
        });
      }

      // If there's an invitation, link to farm and update invitation
      if (invitation) {
        await tx.farmMember.create({
          data: {
            farmId: invitation.farmId,
            userId: txUser.id,
            role: invitation.role
          }
        });

        await tx.invitation.update({
          where: { id: invitation.id },
          data: { status: 'ACCEPTED' }
        });
      } else if (!existingUser || !existingUser.password) {
        // Create default farm for new standalone owners
        const newFarm = await tx.farm.create({
          data: {
            name: `${firstname || 'My'}'s Farm`,
            userId: txUser.id,
            capacity: 0,
            location: '',
          }
        });

        await tx.farmMember.create({
          data: {
            farmId: newFarm.id,
            userId: txUser.id,
            role: 'OWNER'
          }
        });
      }

      return txUser;
    });

    return NextResponse.json({ 
      message: 'User created successfully', 
      user: {
        id: user.id,
        firstname: user.firstname,
        surname: user.surname,
        email: user.email,
        phoneNumber: user.phoneNumber,
        mustChangePassword: user.mustChangePassword
      } 
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error during signup:', error);
    return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
  }
}
