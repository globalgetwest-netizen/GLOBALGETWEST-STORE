import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { authorizeAdmin } from "@/lib/auth-admin";

const prisma = getPrisma();

// PUT — Update order fulfillment and payment status (Admin only)
export async function PUT(request: Request) {
  const authResult = await authorizeAdmin();
  if (!authResult.authorized) if (authResult.error) return authResult.error;

  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("id");
    if (!orderId) {
      return NextResponse.json({ error: "Order id required" }, { status: 400 });
    }

    const existing = await prisma.order.findUnique({ where: { id: orderId } });
    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));

    const validStatuses = [
      "pending", "processing", "shipped", "delivered", "cancelled", "refunded", "returned"
    ];
    const validPaymentStatuses = [
      "pending", "paid", "failed", "refunded", "cancelled"
    ];

    const data: any = {};

    // Enforce valid enum values from schema defaults
    if (body.fulfillment_status && validStatuses.includes(body.fulfillment_status)) {
      data.fulfillment_status = body.fulfillment_status;
    }
    if (body.payment_status && validPaymentStatuses.includes(body.payment_status)) {
      data.payment_status = body.payment_status;
    }
    if (body.tracking_number) {
      data.tracking_number = body.tracking_number;
    }

    // If shipped, optionally sync a Shipment record
    if (data.fulfillment_status === "shipped" || body.tracking_number || body.carrier) {
      const shipmentData: any = {
        carrier: body.carrier ?? existing.shipping_method,
        tracking_number: body.tracking_number ?? existing.tracking_number,
        status: data.fulfillment_status === "shipped" ? "in_transit" : "pending",
        shipping_cost: existing.shipping_amount,
        currency: existing.currency,
      };
      if (body.estimated_delivery) {
        shipmentData.estimated_delivery = new Date(body.estimated_delivery);
      }

      const existingShipment = await prisma.shipment.findFirst({
        where: { order_id: orderId },
      });

      if (existingShipment) {
        await prisma.shipment.update({
          where: { id: existingShipment.id },
          data: shipmentData,
        });
      } else {
        await prisma.shipment.create({
          data: { order_id: orderId, ...shipmentData },
        });
      }
    }

    const order = await prisma.order.update({
      where: { id: orderId },
      data,
      include: {
        items: true,
        shipping_address_details: true,
        shipments: true,
      },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}

