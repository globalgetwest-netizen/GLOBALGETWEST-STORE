'use client';
// components/admin/ImportForm.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseCsv } from '@/lib/csv';

interface Category { slug: string; name: string; }

interface ParsedRow {
  name: string; slug: string; category_slug: string; short_description: string;
  description: string; origin_country: string; ingredients: string;
  usage_instructions: string; warnings: string; sku: string;
  variant_name: string; price_usd: string; is_featured: string;
}

interface RowResult { row: number; name: string; status: 'ok' | 'error'; message?: string; }

const TEMPLATE_HEADER = 'name,slug,category_slug,short_description,description,origin_country,ingredients,usage_instructions,warnings,sku,variant_name,price_usd,is_featured\n';
const TEMPLATE_EXAMPLE = 'Organic Moringa Leaf Powder,organic-moringa-leaf-powder,immune-support,"Nutrient-dense moringa, sun-dried and milled","Full description here...",Ghana,"Moringa oleifera leaf","1 tsp daily in water or smoothie","Consult a doctor if pregnant",MOR-001,100g Pouch,24.99,true\n';

export function ImportForm({ categories }: { categories: Category[] }) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [results, setResults] = useState<RowResult[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE_HEADER, TEMPLATE_EXAMPLE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'globalgetwest-product-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const parsed = parseCsv(text) as unknown as ParsedRow[];

      const errors: string[] = [];
      const validCategorySlug = new Set(categories.map((c) => c.slug));

      parsed.forEach((row, i) => {
        const rowNum = i + 2; // +1 for header, +1 for 1-indexing
        if (!row.name) errors.push(`Row ${rowNum}: missing name`);
        if (!row.slug) errors.push(`Row ${rowNum}: missing slug`);
        if (!row.sku) errors.push(`Row ${rowNum}: missing sku`);
        if (!row.variant_name) errors.push(`Row ${rowNum}: missing variant_name`);
        if (!row.price_usd || isNaN(Number(row.price_usd))) errors.push(`Row ${rowNum}: price_usd must be a number`);
        if (row.category_slug && !validCategorySlug.has(row.category_slug)) {
          errors.push(`Row ${rowNum}: category_slug "${row.category_slug}" doesn't match any existing category — create it first at /admin/categories`);
        }
      });

      setParseErrors(errors);
      setRows(parsed);
      setResults(null);
    };
    reader.readAsText(file);
  }

  async function submitImport() {
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      setResults(data.results ?? []);
      router.refresh();
    } catch (err) {
      setResults([{ row: 0, name: '', status: 'error', message: 'Import request failed' }]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="flex gap-3 mb-6">
        <button
          onClick={downloadTemplate}
          className="focus-ring text-sm border border-[var(--color-border)] bg-white px-4 py-2 rounded-md hover:bg-[var(--color-parchment-warm)]"
        >
          Download CSV Template
        </button>
      </div>

      {categories.length === 0 && (
        <p className="text-sm text-[var(--color-danger)] mb-4">
          You have no categories yet — create at least one at /admin/categories before importing, or leave category_slug blank in your CSV.
        </p>
      )}

      <input
        type="file"
        accept=".csv"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
        className="focus-ring mb-6"
      />

      {parseErrors.length > 0 && (
        <div className="mb-6 rounded-md border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 p-4 text-sm">
          <p className="font-semibold text-[var(--color-danger)] mb-2">{parseErrors.length} issue(s) found — fix these in your CSV and re-upload:</p>
          <ul className="list-disc pl-5 space-y-0.5 text-[var(--color-ink-soft)]">
            {parseErrors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {rows.length > 0 && (
        <div className="mb-6">
          <p className="text-sm font-medium mb-2">{rows.length} row(s) parsed — preview:</p>
          <div className="border border-[var(--color-border)] rounded-lg overflow-x-auto bg-white/60 max-h-80 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-[var(--color-parchment-warm)] text-left sticky top-0">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">SKU</th>
                  <th className="px-3 py-2">Variant</th>
                  <th className="px-3 py-2">Price</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-[var(--color-border)]">
                    <td className="px-3 py-1.5">{r.name}</td>
                    <td className="px-3 py-1.5">{r.category_slug}</td>
                    <td className="px-3 py-1.5">{r.sku}</td>
                    <td className="px-3 py-1.5">{r.variant_name}</td>
                    <td className="px-3 py-1.5">${r.price_usd}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={submitImport}
            disabled={submitting || parseErrors.length > 0}
            className="focus-ring mt-4 bg-[var(--color-forest)] text-[var(--color-parchment)] font-semibold px-6 py-2.5 rounded-md hover:bg-[var(--color-forest-dark)] disabled:opacity-50"
          >
            {submitting ? 'Importing…' : `Import ${rows.length} Product(s)`}
          </button>
        </div>
      )}

      {results && (
        <div className="border border-[var(--color-border)] rounded-lg overflow-hidden bg-white/60">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-parchment-warm)] text-left">
              <tr><th className="px-4 py-2.5">Row</th><th className="px-4 py-2.5">Name</th><th className="px-4 py-2.5">Result</th></tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} className="border-t border-[var(--color-border)]">
                  <td className="px-4 py-2">{r.row}</td>
                  <td className="px-4 py-2">{r.name}</td>
                  <td className={`px-4 py-2 ${r.status === 'ok' ? 'text-[var(--color-forest)]' : 'text-[var(--color-danger)]'}`}>
                    {r.status === 'ok' ? 'Created' : `Failed: ${r.message}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
