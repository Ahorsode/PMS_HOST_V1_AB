import { NextResponse } from 'next/server';
import prisma from '../../../../lib/db';
import { auth } from '../../../../auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { deviceId, deviceName, deviceType, farmId, licenseKey, hardwareId } = body;

    // 1. Check if this is an Electron licensing activation request
    if (licenseKey && hardwareId) {
      if (!farmId) {
        return NextResponse.json({ error: 'Missing farmId' }, { status: 400 });
      }

      // Lookup the row matching the key
      const device = await prisma.deviceRegistration.findFirst({
        where: {
          licenseKey,
          farmId
        }
      });

      if (!device) {
        return NextResponse.json({ error: 'Invalid license key or farm ID combination.' }, { status: 404 });
      }

      // Check if it's already bound to a different machine
      if (device.hardwareId && device.hardwareId !== hardwareId) {
        return NextResponse.json({ error: 'This license key is already bound to another computer terminal.' }, { status: 400 });
      }

      // Bind machine fingerprint permanently and set status to ACTIVE
      const updatedDevice = await prisma.deviceRegistration.update({
        where: { id: device.id },
        data: {
          hardwareId,
          deviceId: deviceId || hardwareId,
          status: 'ACTIVE',
          deviceName: deviceName || device.deviceName || 'Desktop Terminal',
          deviceType: deviceType || device.deviceType || 'desktop',
          lastSync: new Date(),
          isActive: true
        }
      });

      return NextResponse.json({ success: true, device: updatedDevice });
    }

    // 2. Fallback to existing session-based dynamic registration (backward-compatible)
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!deviceId || !farmId) {
      return NextResponse.json({ error: 'Missing deviceId or farmId' }, { status: 400 });
    }

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
