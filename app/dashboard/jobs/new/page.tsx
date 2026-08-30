"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ItemDraft = {
  title: string;
  attachmentUrls: string[];
};

export default function NewJobPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemDraft[]>([{ title: "", attachmentUrls: [] }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateItem(i: number, value: string) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, title: value } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, { title: "", attachmentUrls: [] }]);
  }

  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  function addAttachmentUrl(i: number, url: string) {
    setItems((prev) =>
      prev.map((it, idx) => (idx === i ? { ...it, attachmentUrls: [...it.attachmentUrls, url] } : it))
    );
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
      body: JSON.stringify({
        title,
        notes,
        items: items
          .filter((i) => i.title.trim())
          .map((i) => ({ title: i.title, attachmentUrls: i.attachmentUrls })),
      }),
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
          <ItemDraftRow
            key={i}
            item={item}
            onTitleChange={(value) => updateItem(i, value)}
            onAddAttachment={(url) => addAttachmentUrl(i, url)}
            onRemove={items.length > 1 ? () => removeItem(i) : undefined}
          />
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

function ItemDraftRow({
  item,
  onTitleChange,
  onAddAttachment,
  onRemove,
}: {
  item: ItemDraft;
  onTitleChange: (value: string) => void;
  onAddAttachment: (url: string) => void;
  onRemove?: () => void;
}) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    if (res.ok) {
      const { url } = await res.json();
      onAddAttachment(url);
    }
    setUploading(false);
  }

  return (
    <div className="rounded-lg border p-2 flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          className="border rounded-lg px-3 py-2 flex-1"
          placeholder="e.g. Plug point - living room"
          value={item.title}
          onChange={(e) => onTitleChange(e.target.value)}
        />
        {onRemove && (
          <button type="button" onClick={onRemove} className="text-gray-400 px-2">
            ✕
          </button>
        )}
      </div>

      {item.attachmentUrls.length > 0 && (
        <div className="flex gap-2 overflow-x-auto">
          {item.attachmentUrls.map((url) =>
            /\.(mp4|mov|webm|m4v)$/i.test(url) ? (
              <video
                key={url}
                src={url}
                controls
                className="h-16 w-16 shrink-0 object-cover rounded-lg"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={url}
                alt=""
                className="h-16 w-16 shrink-0 object-cover rounded-lg"
              />
            )
          )}
        </div>
      )}

      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => photoInputRef.current?.click()}
          disabled={uploading}
          className="flex-1 rounded-lg border px-2 py-1.5 text-xs disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "📷 Photo"}
        </button>
        <button
          type="button"
          onClick={() => videoInputRef.current?.click()}
          disabled={uploading}
          className="flex-1 rounded-lg border px-2 py-1.5 text-xs disabled:opacity-50"
        >
          {uploading ? "Uploading…" : "🎥 Video"}
        </button>
      </div>
    </div>
  );
}
