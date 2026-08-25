import { getPrisma } from './lib/prisma.js'

const prisma = await getPrisma()
const r = await prisma.$queryRaw`SELECT 1 as ok`
console.log('DB CONNECT OK', JSON.stringify(r))
await prisma.$disconnect()
