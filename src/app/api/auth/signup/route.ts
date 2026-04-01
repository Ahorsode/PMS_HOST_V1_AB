import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { firstname, surname, email, phoneNumber, password } = await req.json();

    if (!phoneNumber) {
      return NextResponse.json({ message: 'Phone number is required' }, { status: 400 });
    }

    // Ensure email is null if empty string to avoid unique constraint issues
    const cleanEmail = email && email.trim() !== '' ? email.trim() : null;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { phoneNumber },
          ...(cleanEmail ? [{ email: cleanEmail }] : [])
        ]
      }
    });

    if (existingUser) {
      return NextResponse.json({ message: 'User with this phone number or email already exists' }, { status: 400 });
    }

    // Check for invitations
    const invitation = await prisma.invitation.findFirst({
      where: {
        OR: [
          { phoneNumber },
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

    // Create the user
    const user = await prisma.user.create({
      data: {
        firstname,
        surname,
        email: cleanEmail,
        phoneNumber,
        password: hashedPassword,
        mustChangePassword,
        role: invitation?.role || 'OWNER', // Default to OWNER if no invitation
      }
    });

    // If there's an invitation, link to farm and update invitation
    if (invitation) {
      await prisma.farmMember.create({
        data: {
          farmId: invitation.farmId,
          userId: user.id,
          role: invitation.role
        }
      });

      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' }
      });
    }

    // If it's an OWNER, we should ideally create a default farm here, 
    // but we'll follow existing logic for now unless requested.

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
