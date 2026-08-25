const { Pool } = require('@neondatabase/serverless');
const url = process.env.DATABASE_URL || 'postgresql://u:p@host/db';

const pool = new Pool({ connectionString: url });
console.log('Pool options object keys:', Object.keys(pool));
console.log('connectionString prop:', pool.connectionString);
console.log('database:', pool.database, 'user:', pool.user, 'host:', pool.host);
console.log('typeof constructor:', typeof pool.constructor);
