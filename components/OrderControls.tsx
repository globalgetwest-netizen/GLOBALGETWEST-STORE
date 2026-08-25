"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUS_OPTIONS = [
  "pending", "processing", "shipped", "delivered", "cancelled", "refunded", "returned"
];
const PAYMENT_OPTIONS = ["pending", "paid", "failed", "refunded", "cancelled"];

export default function OrderControls({
  orderId,
  currentStatus,
  currentPayment,
  trackingNumber,
}: {
  orderId: string;
  currentStatus: string;
  currentPayment: string;
  trackingNumber?: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [payment, setPayment] = useState(currentPayment);
  const [tracking, setTracking] = useState(trackingNumber || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSave() {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/orders?id=${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fulfillment_status: status,
          payment_status: payment,
          tracking_number: tracking,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update order");
      }
      setMessage("Order updated successfully");
      router.refresh();
    } catch (err: any) {
      setMessage(err.message || "Update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-3xl shadow p-8 space-y-6">
      <h2 className="text-3xl font-bold text-blue-900">Manage Order</h2>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Fulfillment Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full border p-3 rounded-xl"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Payment Status
          </label>
          <select
            value={payment}
            onChange={(e) => setPayment(e.target.value)}
            className="w-full border p-3 rounded-xl"
          >
            {PAYMENT_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Tracking Number
        </label>
        <input
          type="text"
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
          className="w-full border p-3 rounded-xl"
          placeholder="Enter tracking number"
        />
      </div>

      {message && (
        <p className={`text-sm font-semibold ${message.includes("success") ? "text-green-700" : "text-red-600"}`}>
          {message}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="bg-blue-900 text-white px-6 py-3 rounded-xl font-bold disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
}
