import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { firstname, surname, email, phoneNumber } = await req.json();

    if (!phoneNumber) {
      return NextResponse.json({ message: 'Phone number is required' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { phoneNumber },
          { email: email || undefined }
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
          { email: email || undefined }
        ],
        status: 'PENDING'
      }
    });

    // Create the user
    const user = await prisma.user.create({
      data: {
        firstname,
        surname,
        email,
        phoneNumber,
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

    return NextResponse.json({ message: 'User created successfully', user }, { status: 201 });
  } catch (error: any) {
    console.error('Error during signup:', error);
    return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
  }
}
