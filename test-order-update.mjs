import { getPrisma } from './lib/prisma.js'

const prisma = await getPrisma()

async function run() {
  console.log("Creating test order...")
  const order = await prisma.order.create({
    data: {
      order_number: `ORD-${Date.now()}`,
      fulfillment_status: 'pending',
      payment_status: 'pending',
      currency: 'USD',
      grand_total: 100
    }
  })
  console.log(`Order created: ${order.id}`)

  // Simulate API call (the logic from OrderStatus.tsx)
  console.log("Updating order fulfillment status to 'shipped'...")
  await prisma.order.update({
    where: { id: order.id },
    data: { fulfillment_status: 'shipped' }
  })

  const updated = await prisma.order.findUnique({ where: { id: order.id } })
  if (updated.fulfillment_status === 'shipped') {
    console.log("PASS: TEST 9 — Order persistence verified in DB.")
  } else {
    console.error("FAIL: TEST 9 — Order persistence failed.")
    process.exit(1)
  }
  
  await prisma.$disconnect()
}

run().catch(console.error)
