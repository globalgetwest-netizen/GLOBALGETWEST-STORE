/**
 * Media layer utility for handling file storage URLs
 * This abstraction allows us to change storage providers (R2, etc.)
 * without updating database records
 */

import { getPrisma } from "./prisma";

/**
 * Get the base URL for R2 public access
 * This should be configured via environment variables
 */
export function getR2PublicUrl(): string {
  // You can configure this via:
  // 1. A custom domain pointing to your R2 bucket
  // 2. The default R2 subdomain format
  // 3. Cloudflare Workers script that serves R2 objects

  const customDomain = process.env.R2_PUBLIC_DOMAIN;
  if (customDomain) {
    return `https://${customDomain}`;
  }

  // Fallback to default R2 format (not recommended for production without Workers)
  const accountId = process.env.R2_ACCOUNT_ID;
  const bucketName = process.env.R2_BUCKET_NAME;

  if (accountId && bucketName) {
    return `https://${accountId}.r2.cloudflarestorage.com/${bucketName}`;
  }

  throw new Error("R2 public domain not configured. Set R2_PUBLIC_DOMAIN or R2_ACCOUNT_ID and R2_BUCKET_NAME.");
}

/**
 * Generate a public URL for an object key stored in R2
 * @param objectKey - The object key (path) in the R2 bucket
 * @returns Full public URL to the object
 */
export function getR2ObjectUrl(objectKey: string): string {
  if (!objectKey) {
    return ""; // or return a default placeholder URL
  }

  const baseUrl = getR2PublicUrl();
  // Ensure the object key doesn't start with slash (it shouldn't based on our storage logic)
  const cleanKey = objectKey.startsWith('/') ? objectKey.slice(1) : objectKey;
  return `${baseUrl}/${cleanKey}`;
}

/**
 * Get product image URL from product ID
 * This is a convenience function for common use cases
 */
export async function getProductImageUrl(productId: string): Promise<string> {
  const prisma = getPrisma();
  const productImage = await prisma.productImage.findFirst({
    where: { product_id: productId },
    orderBy: { sort_order: 'asc' },
    select: { image_key: true }
  });

  if (!productImage?.image_key) {
    return "/placeholder.png"; // or your default image
  }

  return getR2ObjectUrl(productImage.image_key);
}

/**
 * Get category image URL from category ID
 */
export async function getCategoryImageUrl(categoryId: string): Promise<string> {
  const prisma = getPrisma();
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    select: { image_key: true }
  });

  if (category?.image_key) {
    return getR2ObjectUrl(category.image_key);
  }

  return "/placeholder.png";
}