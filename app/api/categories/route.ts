import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { authorizeAdmin } from '@/lib/auth-admin';

const prisma = getPrisma();

async function generateSlug(name: string) {
  let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  let count = 1;
  let uniqueSlug = slug;
  while (await prisma.category.findUnique({ where: { slug: uniqueSlug } })) {
    uniqueSlug = `${slug}-${count++}`;
  }
  return uniqueSlug;
}

export async function POST(request: Request) {
  const authResult = await authorizeAdmin();
  if (!authResult.authorized) if (authResult.error) return authResult.error;

  const { name, description, image_key } = await request.json();
  
  try {
    const slug = await generateSlug(name);
    const category = await prisma.category.create({
      data: { name, slug, description, image_key },
    });
    return NextResponse.json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}

