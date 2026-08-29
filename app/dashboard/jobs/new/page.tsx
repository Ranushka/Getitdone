"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewJobPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateItem(i: number, value: string) {
    setItems((prev) => prev.map((v, idx) => (idx === i ? value : v)));
  }

  function addItem() {
    setItems((prev) => [...prev, ""]);
  }

  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, notes, items: items.filter((i) => i.trim()) }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Something went wrong");
      return;
    }
    const job = await res.json();
    router.push(`/dashboard/jobs/${job.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">New job</h1>

      <label className="flex flex-col gap-1 text-sm">
        Title
        <input
          className="border rounded-lg px-3 py-2"
          placeholder="e.g. Flat 3B rewiring"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Notes (optional)
        <textarea
          className="border rounded-lg px-3 py-2"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Checklist items</span>
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <input
              className="border rounded-lg px-3 py-2 flex-1"
              placeholder={`e.g. Plug point - living room`}
              value={item}
              onChange={(e) => updateItem(i, e.target.value)}
            />
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => removeItem(i)}
                className="text-gray-400 px-2"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addItem}
          className="text-sm text-blue-600 self-start"
        >
          + Add item
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-black text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        {saving ? "Creating…" : "Create job"}
      </button>
    </form>
  );
}
