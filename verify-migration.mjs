import { getPrisma } from './lib/prisma.js'

async function main() {
  const prisma = await getPrisma()
  try {
    const newTables = await prisma.$queryRawUnsafe(
      `SELECT tablename::text FROM pg_tables WHERE tablename IN ($1, $2, $3)`,
      'attributes', 'product_attributes', 'tax_rules'
    )
    console.log('NEW tables present:', newTables.length === 3 ? 'YES (3/3)' : JSON.stringify(newTables))

    const phase1Names = ['customers','categories','products','product_variants','inventory_movements','coupons','orders','shipments','currencies']
    const placeholders = phase1Names.map((_, i) => '$' + (i + 1)).join(',')
    const phase1 = await prisma.$queryRawUnsafe(
      `SELECT tablename::text FROM pg_tables WHERE tablename IN (${placeholders})`,
      ...phase1Names
    )
    console.log('PHASE 1 tables intact:', phase1.length === 9 ? 'YES (9/9)' : JSON.stringify(phase1))

    const counts = await prisma.$queryRawUnsafe(
      `SELECT 'products' as t, count(*) FROM products
       UNION ALL SELECT 'orders', count(*) FROM orders
       UNION ALL SELECT 'categories', count(*) FROM categories`
    )
    console.log('Existing data preserved:', counts.map(r => `${r.t}=${r.count}`).join(', '))

  } catch(e) {
    console.error('VERIFY ERROR:', e)
  }
  await prisma.$disconnect()
}

main()
