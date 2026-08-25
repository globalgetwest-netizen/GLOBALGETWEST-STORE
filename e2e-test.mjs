import { getPrisma } from './lib/prisma.js';
import crypto from 'node:crypto';

async function runTest() {
  const prisma = await getPrisma();
  console.log('--- Starting REAL E2E Commerce Workflow ---');

  try {
    const timestamp = Date.now();
    const testData = {
        categoryName: `TestCat-${timestamp}`,
        productName: `TestProd-${timestamp}`,
        productSlug: `test-prod-${timestamp}`,
        price: 99.99
    };

    // TEST 1: Create Category
    const cat = await prisma.category.create({
        data: { name: testData.categoryName, slug: testData.categoryName.toLowerCase() + '-' + crypto.randomUUID() }
    });
    console.log('PASS: TEST 1 - Real Category Created (ID: ' + cat.id + ')');

    // TEST 2: Create Product
    const prod = await prisma.product.create({
        data: {
            name: testData.productName,
            slug: testData.productSlug + '-' + crypto.randomUUID(),
            base_price: testData.price,
            category_id: cat.id,
            status: 'draft'
        }
    });
    console.log('PASS: TEST 2 - Real Product Created (ID: ' + prod.id + ')');

    // TEST 4: Edit Product
    await prisma.product.update({
        where: { id: prod.id },
        data: { name: testData.productName + ' Updated', base_price: 150.00 }
    });
    console.log('PASS: TEST 4 - Product Edit Successful');

    // TEST 5: Unpublish
    await prisma.product.update({
        where: { id: prod.id },
        data: { published_state: 'unpublished' }
    });
    console.log('PASS: TEST 5 - Product Unpublished');

    // TEST 6: Delete
    await prisma.product.delete({ where: { id: prod.id } });
    await prisma.category.delete({ where: { id: cat.id } });
    console.log('PASS: TEST 6 - Product and Category Deleted');

    console.log('--- E2E Commerce Workflow SUCCESSFUL ---');
  } catch (e) {
    console.error('Test FAILED:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
