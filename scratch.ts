import prisma from './src/lib/db';

async function testRestore() {
  const log = await prisma.deleteLog.findFirst({
    orderBy: { deletedAt: 'desc' }
  });

  if (!log) {
    console.log('No delete logs found');
    return;
  }

  console.log('Found log:', log);

  const TABLE_TO_MODEL: Record<string, string> = {
    'batches': 'livestock',
    'sales': 'sale',
    'expenses': 'expense',
    'inventory': 'inventory',
    'daily_feeding_logs': 'feedingLog',
    'egg_production': 'eggProduction',
    'mortality': 'mortality',
    'weight_records': 'weightRecord',
    'houses': 'house',
    'customers': 'customer',
    'farm_members': 'farmMember',
    'invitations': 'invitation',
  };

  const normalizedTableName = log.tableName.toLowerCase();
  const modelName = TABLE_TO_MODEL[normalizedTableName] || normalizedTableName;
  console.log('Model Name:', modelName);

  if (!(prisma as any)[modelName]) {
    console.log(`Invalid target table for restoration: ${log.tableName}`);
    return;
  }

  const rows = log.deletedDataCsv.split('\n');
  const headers = rows[0].split('|');
  const values = rows[1].split('|');

  console.log('Headers:', headers);
  console.log('Values:', values);

  const headerMap: Record<string, string> = {
    'farm_id': 'farmId',
    'user_id': 'userId',
    'house_id': 'houseId',
    'batch_id': 'batchId',
    'category_id': 'categoryId',
    'created_at': 'createdAt',
    'updated_at': 'updatedAt',
    'arrival_date': 'arrivalDate',
    'log_date': 'logDate',
    'initial_count': 'initialCount',
    'current_count': 'currentCount',
    'isolation_count': 'isolationCount',
    'death_count': 'deathCount',
    'eggs_collected': 'eggsCollected',
    'bad_eggs': 'badEggs',
    'feed_consumed': 'feedConsumed',
    'unit_price': 'unitPrice',
    'total_amount': 'totalAmount',
    'local_batch_id': 'localBatchId',
  };

  const record: any = {};
  headers.forEach((header: string, i: number) => {
    const cleanHeader = header.trim().replace(/^"|"$/g, '');
    const propertyName = headerMap[cleanHeader] || cleanHeader;
    
    let val: any = values[i] ? values[i].trim() : null;
    
    if (val) {
      val = val.replace(/^'|'$/g, '').replace(/''/g, "'");
    }

    if (val === 'NULL' || val === '' || val === 'null' || val === null) {
      val = null;
    } else if (val === 'true') {
      val = true;
    } else if (val === 'false') {
      val = false;
    } else if (!isNaN(Number(val)) && val !== '' && !val.includes('-') && !val.includes(':')) {
      val = Number(val);
    } else if (val && (val.includes('-') || val.includes(':')) && !isNaN(Date.parse(val))) {
      val = new Date(val);
    }
    
    record[propertyName] = val;
  });

  const { id, createdAt, updatedAt, deletedAt, ...dataToRestore } = record;
  console.log('Data to Restore:', dataToRestore);
}

testRestore().catch(console.error).finally(() => prisma.$disconnect());
