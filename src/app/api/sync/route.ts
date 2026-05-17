import { NextResponse } from 'next/server';
import db from '../../../lib/db';
import { auth } from '../../../auth';

export async function POST(req: Request) {
  try {
    const session = await auth();
    const deviceToken = req.headers.get('X-Device-Token');
    
    let farmId = session?.user?.activeFarmId;
    let userId = session?.user?.id;

    // 1. Auth Handshake
    // If no session, try device token fallback for established desktop links
    if (!session && deviceToken) {
      const device = await db.deviceRegistration.findFirst({
        where: { deviceId: deviceToken, isActive: true },
      });
      if (device) {
        farmId = device.farmId;
        userId = device.userId || undefined;
      }
    }

    if (!farmId || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { operations } = await req.json();

    if (!operations || !Array.isArray(operations)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const processedIds: string[] = [];

    // 2. Bulk Processing Engine with Transaction
    // Wraps execution inside a strict Prisma $transaction for all-or-nothing integrity
    await db.$transaction(async (tx: any) => {
      for (const op of operations) {
        const { table_name, action_type, payload: rawPayload } = op;
        const payload = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload;
        
        // Map local SQLite table name to Prisma model name
        const modelName = getModelName(table_name);
        
        try {
          switch (action_type) {
            case 'INSERT':
            case 'UPDATE':
              // Perform an atomic upsert matching on the record's CUID/UUID
              await tx[modelName].upsert({
                where: { id: payload.id },
                create: { 
                  ...payload, 
                  farmId: payload.farmId || farmId, 
                  userId: payload.userId || userId 
                },
                update: { 
                  ...payload, 
                  farmId: payload.farmId || farmId, 
                  userId: payload.userId || userId 
                },
              });
              break;

            case 'DELETE':
              // Delete from active tables and log tracking metadata to delete_logs
              const record = await tx[modelName].findUnique({ where: { id: payload.id } });
              if (record) {
                await tx[modelName].delete({ where: { id: payload.id } });
                await tx.deleteLog.create({
                  data: {
                    userId: userId,
                    farmId: farmId,
                    tableName: table_name,
                    deletedDataCsv: JSON.stringify(record),
                  }
                });
              }
              break;
          }
          processedIds.push(op.id);
        } catch (err: any) {
          console.error(`Error processing ${action_type} on ${table_name}:`, err);
          throw err; // Reverts the entire transaction
        }
      }
    }, { timeout: 30000 });

    return NextResponse.json({ 
      success: true, 
      processedIds 
    });

  } catch (error: any) {
    console.error('[Sync Gateway Error]:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}

/**
 * Maps SQLite table names to Prisma model names (camelCase).
 */
function getModelName(tableName: string): string {
  const mapping: Record<string, string> = {
    'batches': 'livestock',
    'mortality': 'healthMortality',
    'isolation_rooms': 'isolationRoom',
    'sales': 'sale',
    'houses': 'house',
    'inventory': 'inventory',
    'insert_logs': 'insertLog',
    'feeding_logs': 'feedingLog',
    'weight_records': 'weightRecord'
  };
  return mapping[tableName] || tableName;
}
