import { PrismaClient } from './generated/prisma/index.js'
import { PrismaNeon } from '@prisma/adapter-neon'

let prismaInstance = null

export function getPrisma() {
  if (typeof window !== 'undefined') {
    throw new Error('PrismaClient cannot be used in the browser')
  }

  if (!prismaInstance) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) throw new Error('DATABASE_URL missing')

    // Pass the adapter factory directly. Prisma calls factory.connect()
    // internally, which constructs neon.Pool({ connectionString }) correctly.
    const adapter = new PrismaNeon({ connectionString })
    prismaInstance = new PrismaClient({ adapter })
  }

  return prismaInstance
}
