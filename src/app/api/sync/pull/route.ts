import { NextResponse } from 'next/server';
import db from '../../../../lib/db';
import { auth } from '../../../../auth';

/**
 * GET /api/sync/pull
 * Fetches all records for a specific farm that have been updated/created
 * since the provided last_synced_at timestamp.
 */
export async function GET(req: Request) {
  try {
    const session = await auth();
    const { searchParams } = new URL(req.url);
    const lastSyncedAt = searchParams.get('last_synced_at');
    const deviceToken = req.headers.get('X-Device-Token');

    let farmId = session?.user?.activeFarmId;
    
    // Auth Handshake: Validate session OR hardware device token
    if (!farmId && deviceToken) {
        const device = await db.deviceRegistration.findFirst({
            where: { deviceId: deviceToken, isActive: true },
        });
        if (device) farmId = device.farmId;
    }

    if (!farmId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Default to epoch if no timestamp provided
    const lastDate = lastSyncedAt ? new Date(lastSyncedAt) : new Date(0);

    // Fetch records from core tables modified since last successful pull
    const [batches, houses, isolationRooms, sales, mortality] = await Promise.all([
      db.livestock.findMany({ 
        where: { farmId, updatedAt: { gt: lastDate } } 
      }),
      db.house.findMany({ 
        where: { farmId, updatedAt: { gt: lastDate } } 
      }),
      db.isolationRoom.findMany({ 
        where: { farmId, updatedAt: { gt: lastDate } } 
      }),
      db.sale.findMany({ 
        where: { farmId, createdAt: { gt: lastDate } } 
      }),
      db.healthMortality.findMany({ 
        where: { farmId, createdAt: { gt: lastDate } } 
      })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        batches,
        houses,
        isolation_rooms: isolationRooms, // Align with SQLite table name
        sales,
        mortality
      },
      serverTime: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[Pull Sync Gateway Error]:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
