import { NextResponse } from 'next/server';
import prisma from '../../../../lib/db';
import { auth } from '../../../../auth';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { deviceId, deviceName, deviceType, farmId } = body;

    if (!deviceId || !farmId) {
      return NextResponse.json({ error: 'Missing deviceId or farmId' }, { status: 400 });
    }

    // Register or update device registration
    const device = await prisma.deviceRegistration.upsert({
      where: {
        farmId_deviceId: {
          farmId: farmId,
          deviceId: deviceId,
        },
      },
      update: {
        deviceName,
        deviceType,
        lastSync: new Date(),
        isActive: true,
      },
      create: {
        deviceId,
        deviceName,
        deviceType,
        farmId: farmId,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ success: true, device });
  } catch (error: any) {
    console.error('Device registration error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
