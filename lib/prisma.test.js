// Simple test to verify Prisma client can be imported
const { prisma } = require('./prisma');

console.log('Prisma client imported successfully');
if (prisma) {
  console.log('Prisma client instance created');
} else {
  console.log('Prisma client is null (expected in browser environment)');
}