import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { authorizeAdmin } from "@/lib/auth-admin";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const prisma = getPrisma();

const s3Client = new S3Client({
  endpoint: process.env.R2_ENDPOINT,
  region: "auto",
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

async function generateProductSlug(name: string): Promise<string> {
  let slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  let count = 1;
  let uniqueSlug = slug;
  while (await prisma.product.findUnique({ where: { slug: uniqueSlug } })) {
    uniqueSlug = `${slug}-${count++}`;
  }
  return uniqueSlug;
}

// GET — fetch a single product by id (used by the admin edit page)
export async function GET(request: Request) {
  const authResult = await authorizeAdmin();
  if (!authResult.authorized) if (authResult.error) return authResult.error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Product id required" }, { status: 400 });
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        images: {
          select: { id: true, image_key: true, alt_text: true },
          take: 1,
        },
        category: {
          select: { id: true, name: true },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Flatten image_key for the edit form (which expects product.image_key)
    const result: any = { ...product };
    if (product.images && product.images.length > 0) {
      result.image_key = product.images[0].image_key;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}

// POST — create a new product (accepts FormData)
export async function POST(request: Request) {
  const authResult = await authorizeAdmin();
  if (!authResult.authorized) if (authResult.error) return authResult.error;

  try {
    const formData = await request.formData();
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const price = formData.get("price") as string;
    const categoryId = formData.get("categoryId") as string;
    const payment_link = formData.get("payment_link") as string;
    const file = formData.get("file") as File | null;

    if (!name || !price) {
      return NextResponse.json({ error: "Name and price are required" }, { status: 400 });
    }

    const slug = await generateProductSlug(name);

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        short_description: description || "",
        base_price: parseFloat(price) || 0,
        category_id: categoryId || null,
        payment_link: payment_link || null,
        status: "draft",
        published_state: "unpublished",
      },
    });

    // Handle image upload to R2
    if (file && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const objectKey = `${crypto.randomUUID()}-${file.name}`;

      await s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: objectKey,
          Body: buffer,
          ContentType: file.type,
        })
      );

      await prisma.productImage.create({
        data: {
          product_id: product.id,
          image_key: objectKey,
          alt_text: name,
          sort_order: 0,
        },
      });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}

// PUT — update an existing product (accepts FormData)
export async function PUT(request: Request) {
  const authResult = await authorizeAdmin();
  if (!authResult.authorized) if (authResult.error) return authResult.error;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Product id required" }, { status: 400 });
  }

  try {
    // Verify product exists
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const price = formData.get("price") as string;
    const categoryId = formData.get("categoryId") as string;
    const payment_link = formData.get("payment_link") as string;
    const status = formData.get("status") as string;
    const published_state = formData.get("published_state") as string;
    const file = formData.get("file") as File | null;

    // Validate required fields
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!price || isNaN(parseFloat(price))) {
      return NextResponse.json({ error: "Valid price is required" }, { status: 400 });
    }

    // Validate status and published_state against allowed values
    const validStatuses = ["draft", "active"];
    const validPublishedStates = ["unpublished", "published"];
    const finalStatus = validStatuses.includes(status) ? status : existing.status;
    const finalPublishedState = validPublishedStates.includes(published_state)
      ? published_state
      : existing.published_state;

    // Generate slug from name (only if name changed)
    let slug = existing.slug;
    if (name !== existing.name) {
      slug = await generateProductSlug(name);
    }

    // Handle optional image upload to R2
    let imageKey = null;
    if (file && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const objectKey = `${crypto.randomUUID()}-${file.name}`;

      await s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: objectKey,
          Body: buffer,
          ContentType: file.type,
        })
      );
      imageKey = objectKey;
    }

    // Update product
    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        slug,
        short_description: description || "",
        base_price: parseFloat(price),
        category_id: categoryId || null,
        payment_link: payment_link || null,
        status: finalStatus,
        published_state: finalPublishedState,
        updated_at: new Date(),
      },
    });

    // Handle image: create new or update existing ProductImage
    if (imageKey) {
      const existingImage = await prisma.productImage.findFirst({
        where: { product_id: id },
        orderBy: { sort_order: "asc" },
      });

      if (existingImage) {
        await prisma.productImage.update({
          where: { id: existingImage.id },
          data: { image_key: imageKey, alt_text: name },
        });
      } else {
        await prisma.productImage.create({
          data: {
            product_id: id,
            image_key: imageKey,
            alt_text: name,
            sort_order: 0,
          },
        });
      }
    }

    // Return updated product with images
    const updated = await prisma.product.findUnique({
      where: { id },
      include: {
        images: {
          select: { id: true, image_key: true, alt_text: true },
          take: 1,
        },
        category: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

