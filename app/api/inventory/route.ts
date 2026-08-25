import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { authorizeAdmin } from "@/lib/auth-admin";

const prisma = getPrisma();

// POST — Adjust product stock and record an InventoryMovement
// Body: { productId, changeType, quantity, notes }
// changeType: "set" | "increase" | "decrease"
export async function POST(request: Request) {
  const authResult = await authorizeAdmin();
  if (!authResult.authorized) if (authResult.error) return authResult.error;

  try {
    const body = await request.json();
    const { productId, changeType, quantity, notes } = body;

    if (!productId || !changeType || quantity === undefined) {
      return NextResponse.json(
        { error: "productId, changeType, and quantity are required" },
        { status: 400 }
      );
    }

    if (!["set", "increase", "decrease"].includes(changeType)) {
      return NextResponse.json({ error: "Invalid changeType" }, { status: 400 });
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty < 0) {
      return NextResponse.json({ error: "quantity must be a non-negative number" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    let newStock = product.stock_quantity;
    let movementQty = 0;

    if (changeType === "set") {
      movementQty = qty - product.stock_quantity;
      newStock = qty;
    } else if (changeType === "increase") {
      movementQty = qty;
      newStock = product.stock_quantity + qty;
    } else if (changeType === "decrease") {
      movementQty = -qty;
      newStock = product.stock_quantity - qty;
    }

    // Prevent negative stock unless explicitly allowed by business rules
    if (newStock < 0) {
      return NextResponse.json(
        { error: "Cannot reduce stock below zero" },
        { status: 400 }
      );
    }

    // Record movement and update stock in a transaction
    const [movement, updatedProduct] = await prisma.$transaction([
      prisma.inventoryMovement.create({
        data: {
          product_id: productId,
          change_type: changeType,
          quantity: movementQty,
          notes: notes || null,
          reference: `admin_adjustment_${authResult.userId}`,
        },
      }),
      prisma.product.update({
        where: { id: productId },
        data: {
          stock_quantity: newStock,
          updated_at: new Date(),
        },
      }),
    ]);

    return NextResponse.json({ product: updatedProduct, movement });
  } catch (error) {
    console.error("Error adjusting inventory:", error);
    return NextResponse.json({ error: "Failed to adjust inventory" }, { status: 500 });
  }
}


