"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Attachment = { id: string; url: string };

type Item = {
  id: string;
  title: string;
  comment: string | null;
  attachments: Attachment[];
  status: "PENDING" | "DONE";
};

type SignOff = { role: "TECHNICIAN" | "MANAGER"; name: string };

type Job = {
  id: string;
  title: string;
  notes: string | null;
  items: Item[];
  signOffs: SignOff[];
};

export default function TechChecklistClient({
  job,
  token,
}: {
  job: Job;
  token: string;
}) {
  const router = useRouter();
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [signOffBusy, setSignOffBusy] = useState(false);
  const [signOffError, setSignOffError] = useState("");

  const techSignOff = job.signOffs.find((s) => s.role === "TECHNICIAN");
  const doneCount = job.items.filter((i) => i.status === "DONE").length;
  const allDone = job.items.length > 0 && doneCount === job.items.length;

  async function addAttachment(itemId: string, file: File) {
    setUploadingId(itemId);
    const form = new FormData();
    form.append("file", file);
    const uploadRes = await fetch("/api/upload", { method: "POST", body: form });
    if (uploadRes.ok) {
      const { url } = await uploadRes.json();
      await fetch(`/api/t/${token}/items/${itemId}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
    }
    setUploadingId(null);
    router.refresh();
  }

  async function updateItem(
    itemId: string,
    data: { comment?: string; status?: "PENDING" | "DONE" }
  ) {
    await fetch(`/api/t/${token}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    router.refresh();
  }

  async function handleSignOff() {
    setSignOffError("");
    if (!name.trim()) return;
    setSignOffBusy(true);
    const res = await fetch(`/api/t/${token}/signoff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setSignOffBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setSignOffError(body.error || "Something went wrong");
      return;
    }
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-md p-4 flex flex-col gap-4 min-h-screen">
      <div>
        <h1 className="text-lg font-semibold">{job.title}</h1>
        {job.notes && <p className="text-sm text-gray-500 mt-1">{job.notes}</p>}
      </div>

      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className="bg-green-600 h-2 rounded-full transition-all"
          style={{
            width: `${job.items.length ? (doneCount / job.items.length) * 100 : 0}%`,
          }}
        />
      </div>
      <p className="text-xs text-gray-500 -mt-2">
        {doneCount}/{job.items.length} done
      </p>

      <ul className="flex flex-col gap-3">
        {job.items.map((item) => (
          <ChecklistItemCard
            key={item.id}
            item={item}
            disabled={!!techSignOff}
            uploading={uploadingId === item.id}
            onAddAttachment={(file) => addAttachment(item.id, file)}
            onCommentBlur={(comment) => updateItem(item.id, { comment })}
            onToggleDone={() =>
              updateItem(item.id, { status: item.status === "DONE" ? "PENDING" : "DONE" })
            }
          />
        ))}
      </ul>

      {!techSignOff && (
        <div className="rounded-lg border p-4 flex flex-col gap-2 mt-2">
          <span className="text-sm font-medium">
            {allDone ? "All done — sign off" : "Finish all items to sign off"}
          </span>
          <input
            className="border rounded-lg px-3 py-2 text-sm"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!allDone}
          />
          {signOffError && <p className="text-xs text-red-600">{signOffError}</p>}
          <button
            onClick={handleSignOff}
            disabled={!allDone || signOffBusy}
            className="rounded-lg bg-black text-white px-3 py-2 text-sm disabled:opacity-50"
          >
            {signOffBusy ? "Submitting…" : "Confirm & sign off"}
          </button>
        </div>
      )}

      {techSignOff && (
        <div className="rounded-lg border p-4 text-sm text-green-700">
          Signed off by {techSignOff.name}. Thanks — the manager has been notified.
        </div>
      )}
    </main>
  );
}

function ChecklistItemCard({
  item,
  disabled,
  uploading,
  onAddAttachment,
  onCommentBlur,
  onToggleDone,
}: {
  item: Item;
  disabled: boolean;
  uploading: boolean;
  onAddAttachment: (file: File) => void;
  onCommentBlur: (comment: string) => void;
  onToggleDone: () => void;
}) {
  const [comment, setComment] = useState(item.comment || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) onAddAttachment(f);
    e.target.value = "";
  }

  return (
    <li className="rounded-lg border p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{item.title}</span>
        <span
          className={`text-xs rounded-full px-2 py-0.5 ${
            item.status === "DONE"
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {item.status === "DONE" ? "Done" : "Pending"}
        </span>
      </div>

      {item.attachments.length > 0 && (
        <div className="flex gap-2 overflow-x-auto">
          {item.attachments.map((a) =>
            /\.(mp4|mov|webm|m4v)$/i.test(a.url) ? (
              <video
                key={a.id}
                src={a.url}
                controls
                className="h-20 w-20 shrink-0 object-cover rounded-lg"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={a.id}
                src={a.url}
                alt={item.title}
                className="h-20 w-20 shrink-0 object-cover rounded-lg"
              />
            )
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || uploading}
        className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
      >
        {uploading ? "Uploading…" : "📷 Add photo or video"}
      </button>

      <textarea
        className="border rounded-lg px-3 py-2 text-sm"
        placeholder="Add a comment"
        value={comment}
        disabled={disabled}
        onChange={(e) => setComment(e.target.value)}
        onBlur={() => {
          if (comment !== (item.comment || "")) onCommentBlur(comment);
        }}
      />

      <button
        onClick={onToggleDone}
        disabled={disabled}
        className={`rounded-lg px-3 py-2 text-sm disabled:opacity-50 ${
          item.status === "DONE"
            ? "border text-gray-600"
            : "bg-black text-white"
        }`}
      >
        {item.status === "DONE" ? "Mark as not done" : "Mark done"}
      </button>
    </li>
  );
}
