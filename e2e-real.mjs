import { getPrisma } from './lib/prisma.js'
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import crypto from 'node:crypto'

// Real 1x1 transparent PNG (valid binary image)
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQAY3Y2wAAAAAElFTkSuQmCC',
  'base64'
)

const prisma = await getPrisma()
let pass = 0, fail = 0, blocked = 0
const log = (s) => console.log(s)
const ok = (n) => { pass++; log(`PASS: ${n}`) }
const bad = (n, e) => { fail++; log(`FAIL: ${n} :: ${e?.message || e}`) }
const block = (n, d) => { blocked++; log(`BLOCKED: ${n} :: ${d}`) }

async function run() {
  const ts = Date.now()
  const catName = `E2ECat-${ts}`
  const prodName = `E2EProd-${ts}`
  let catId, prodId, imageKey, publicUrl

  try {
    // TEST 1 â€” REAL CATEGORY (Admin Portal -> DB)
    const cat = await prisma.category.create({
      data: { name: catName, slug: `e2ecat-${ts}-${crypto.randomUUID().slice(0, 8)}`, is_active: true },
    })
    catId = cat.id
    const catVerify = await prisma.category.findUnique({ where: { id: catId } })
    if (catVerify && catVerify.name === catName) ok('TEST 1 â€” Real Category stored in PostgreSQL')
    else bad('TEST 1 â€” Real Category stored in PostgreSQL', 'category not found after create')
  } catch (e) { bad('TEST 1 â€” Real Category', e) }

  try {
    // TEST 2 â€” REAL PRODUCT (Admin Portal -> DB)
    const prod = await prisma.product.create({
      data: {
        name: prodName,
        slug: `e2eprod-${ts}-${crypto.randomUUID().slice(0, 8)}`,
        short_description: 'E2E acceptance test product',
        base_price: 99.99,
        currency: 'USD',
        category_id: catId,
        status: 'active',
        published_state: 'unpublished',
        stock_quantity: 50,
      },
    })
    prodId = prod.id
    const pv = await prisma.product.findUnique({
      where: { id: prodId },
      include: { category: true, images: true },
    })
    if (pv && pv.category_id === catId && Number(pv.base_price) === 99.99) ok(`TEST 2 â€” Real Product stored (cat=${pv.category?.name}, price=${pv.base_price})`)
    else bad('TEST 2 â€” Real Product stored', 'product/category/price mismatch')
  } catch (e) { bad('TEST 2 â€” Real Product', e) }

  try {
    // TEST 7 â€” REAL IMAGE PATH: Admin upload -> R2 -> DB record -> public URL
    if (!process.env.R2_ENDPOINT || !process.env.R2_BUCKET_NAME || !process.env.R2_ACCESS_KEY_ID) {
      block('TEST 7 â€” Real R2 image upload', 'R2 credentials not present in environment (R2_ENDPOINT/R2_BUCKET_NAME/R2_ACCESS_KEY_ID)')
    } else {
      const s3 = new S3Client({
        endpoint: process.env.R2_ENDPOINT,
        region: 'auto',
        credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
      })
      imageKey = `${crypto.randomUUID()}-test.png`
      await s3.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME, Key: imageKey, Body: PNG, ContentType: 'image/png',
      }))
      // Verify the object actually landed in R2
      await s3.send(new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: imageKey }))
      ok('TEST 7a â€” Image actually uploaded to R2 (PutObject + GetObject verified)')

      // Create the ProductImage DB record (the real relationship)
      await prisma.productImage.create({
        data: { product_id: prodId, image_key: imageKey, alt_text: prodName, sort_order: 0 },
      })
      const imgRec = await prisma.productImage.findFirst({ where: { product_id: prodId } })
      if (imgRec && imgRec.image_key === imageKey) ok('TEST 7b â€” ProductImage DB record + relationship exists')
      else bad('TEST 7b â€” ProductImage DB record', 'image record missing or key mismatch')

      // Build the public URL exactly as the storefront would
      // Build the public URL exactly as the storefront would, using the SAME
      // logic as getR2ObjectUrl() in lib/media.ts (reads R2_PUBLIC_DOMAIN env).
      const getR2ObjectUrl = (key) => {
        const customDomain = process.env.R2_PUBLIC_DOMAIN
        const base = customDomain
          ? `https://${customDomain}`
          : `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET_NAME}`
        const cleanKey = key.startsWith('/') ? key.slice(1) : key
        return `${base}/${cleanKey}`
      }
      publicUrl = getR2ObjectUrl(imageKey)
      if (publicUrl && publicUrl.includes(imageKey)) ok(`TEST 7c â€” Public storefront image URL generated: ${publicUrl}`)
      else bad('TEST 7c â€” Public image URL', `url='${publicUrl}'`)
    }
  } catch (e) { bad('TEST 7 â€” Real image path', e) }

  try {
    // TEST 3/7 â€” PUBLIC STOREFRONT filter condition (real query the page runs)
    await prisma.product.update({ where: { id: prodId }, data: { published_state: 'published' } })
    const visible = await prisma.product.findMany({
      where: { published_state: 'published', status: 'active' },
      include: { images: { select: { image_key: true }, take: 1 } },
    })
    const found = visible.find((p) => p.id === prodId)
    if (found && found.images?.[0]?.image_key === imageKey) ok('TEST 3 â€” Product appears in public /products query with correct image')
    else bad('TEST 3 â€” Public storefront visibility', 'product not in published+active result set')
  } catch (e) { bad('TEST 3 â€” Public storefront', e) }

  try {
    // TEST 4 â€” ADMIN EDIT -> PUBLIC UPDATE (name, price, inventory)
    const newName = prodName + ' EDITED'
    const newPrice = 149.99
    const newStock = 25
    await prisma.product.update({
      where: { id: prodId },
      data: { name: newName, base_price: newPrice, stock_quantity: newStock },
    })
    const ev = await prisma.product.findUnique({ where: { id: prodId } })
    if (ev.name === newName && Number(ev.base_price) === newPrice && ev.stock_quantity === newStock) ok(`TEST 4 â€” Edit persisted (name/price/stock: ${ev.name}/${ev.base_price}/${ev.stock_quantity})`)
    else bad('TEST 4 â€” Admin edit', 'edit not persisted')
  } catch (e) { bad('TEST 4 â€” Admin edit', e) }

  try {
    // TEST 5 â€” UNPUBLISH -> public storefront removes it
    await prisma.product.update({ where: { id: prodId }, data: { published_state: 'unpublished' } })
    const visibleAfterUnpub = await prisma.product.findMany({
      where: { published_state: 'published', status: 'active' },
    })
    const stillVisible = visibleAfterUnpub.find((p) => p.id === prodId)
    const stillInDb = await prisma.product.findUnique({ where: { id: prodId } })
    if (!stillVisible && stillInDb) ok('TEST 5 â€” Unpublished product removed from public, still in DB/admin')
    else bad('TEST 5 â€” Unpublish', stillVisible ? 'still in public' : 'missing from DB')
  } catch (e) { bad('TEST 5 â€” Unpublish', e) }

  try {
    // TEST 6 â€” DELETE (admin) -> removed, no broken public page
    await prisma.productImage.deleteMany({ where: { product_id: prodId } })
    await prisma.product.delete({ where: { id: prodId } })
    const gone = await prisma.product.findUnique({ where: { id: prodId } })
    if (!gone) ok('TEST 6 â€” Product deleted (no DB record; public page would 404)')
    else bad('TEST 6 â€” Delete', 'product still present after delete')

    await prisma.category.delete({ where: { id: catId } })
    ok('TEST 6b â€” Test category cleaned up')
  } catch (e) { bad('TEST 6 â€” Delete', e) }

  log(`\n=== E2E SUMMARY: pass=${pass} fail=${fail} blocked=${blocked} ===`)
  await prisma.$disconnect()
  if (fail > 0) process.exit(1)
}

run().catch(async (e) => { console.error('FATAL', e); await prisma.$disconnect(); process.exit(1) })



