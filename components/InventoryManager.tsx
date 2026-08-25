"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InventoryManager({
  productId,
  currentStock,
}: {
  productId: string;
  currentStock: number;
}) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(0);
  const [changeType, setChangeType] = useState<"set" | "increase" | "decrease">("increase");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleAdjust() {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          changeType,
          quantity,
          notes,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to adjust inventory");
      }
      setMessage("Inventory updated successfully");
      setQuantity(0);
      router.refresh();
    } catch (err: any) {
      setMessage(err.message || "Adjustment failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6 mt-4 border border-gray-100">
      <h3 className="font-bold text-lg mb-4">Manage Stock (Current: {currentStock})</h3>
      <div className="space-y-4">
        <select
          value={changeType}
          onChange={(e) => setChangeType(e.target.value as any)}
          className="w-full border p-2 rounded"
        >
          <option value="increase">Increase Stock</option>
          <option value="decrease">Decrease Stock</option>
          <option value="set">Set Exact Stock</option>
        </select>
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="w-full border p-2 rounded"
          placeholder="Quantity"
        />
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full border p-2 rounded"
          placeholder="Reason/Notes"
        />
        <button
          onClick={handleAdjust}
          disabled={saving}
          className="w-full bg-green-700 text-white py-2 rounded font-bold disabled:opacity-50"
        >
          {saving ? "Updating..." : "Confirm Adjustment"}
        </button>
        {message && <p className="text-sm font-semibold">{message}</p>}
      </div>
    </div>
  );
}
