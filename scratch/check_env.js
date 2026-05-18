console.log('Env keys:', Object.keys(process.env).filter(k => k.includes('DATA') || k.includes('URL') || k.includes('PRISMA') || k.includes('PORT')));
console.log('DATABASE_URL exists?', !!process.env.DATABASE_URL);
