"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Item = {
  id: string;
  title: string;
  comment: string | null;
  photoUrl: string | null;
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
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [signOffBusy, setSignOffBusy] = useState(false);
  const [signOffError, setSignOffError] = useState("");

  const techSignOff = job.signOffs.find((s) => s.role === "TECHNICIAN");
  const doneCount = job.items.filter((i) => i.status === "DONE").length;
  const allDone = job.items.length > 0 && doneCount === job.items.length;

  const openItem = job.items.find((i) => i.id === openItemId) || null;

  async function submitItem(itemId: string, file: File | null, comment: string) {
    setBusyId(itemId);
    let photoUrl: string | undefined;

    if (file) {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (res.ok) {
        const body = await res.json();
        photoUrl = body.url;
      }
    }

    await fetch(`/api/t/${token}/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        comment,
        ...(photoUrl ? { photoUrl } : {}),
        status: "DONE",
      }),
    });

    setBusyId(null);
    setOpenItemId(null);
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

      <ul className="flex flex-col gap-2">
        {job.items.map((item) => (
          <li key={item.id}>
            <button
              onClick={() => setOpenItemId(item.id)}
              disabled={!!techSignOff}
              className="w-full text-left rounded-lg border p-3 flex items-center justify-between disabled:opacity-60"
            >
              <span className="text-sm font-medium">{item.title}</span>
              <span
                className={`text-xs rounded-full px-2 py-0.5 ${
                  item.status === "DONE"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {item.status === "DONE" ? "Done" : "Tap to complete"}
              </span>
            </button>
          </li>
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

      {openItem && (
        <ItemModal
          item={openItem}
          busy={busyId === openItem.id}
          onClose={() => setOpenItemId(null)}
          onSubmit={(file, comment) => submitItem(openItem.id, file, comment)}
        />
      )}
    </main>
  );
}

function ItemModal({
  item,
  busy,
  onClose,
  onSubmit,
}: {
  item: Item;
  busy: boolean;
  onClose: () => void;
  onSubmit: (file: File | null, comment: string) => void;
}) {
  const [comment, setComment] = useState(item.comment || "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(item.photoUrl);
  const [isVideo, setIsVideo] = useState(isVideoUrl(item.photoUrl));
  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (f) {
      setPreview(URL.createObjectURL(f));
      setIsVideo(f.type.startsWith("video/"));
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">{item.title}</h2>
          <button onClick={onClose} className="text-gray-400">
            ✕
          </button>
        </div>

        {preview ? (
          isVideo ? (
            <video src={preview} controls className="w-full h-40 object-cover rounded-lg" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="w-full h-40 object-cover rounded-lg" />
          )
        ) : null}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            className="flex-1 rounded-lg border px-3 py-2 text-sm"
          >
            📷 Photo
          </button>
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            className="flex-1 rounded-lg border px-3 py-2 text-sm"
          >
            🎥 Video
          </button>
        </div>
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

        <textarea
          className="border rounded-lg px-3 py-2 text-sm"
          placeholder="Add a comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        <button
          onClick={() => onSubmit(file, comment)}
          disabled={busy}
          className="rounded-lg bg-black text-white px-3 py-2 text-sm disabled:opacity-50"
        >
          {busy ? "Saving…" : "Mark done"}
        </button>
      </div>
    </div>
  );
}

function isVideoUrl(url: string | null): boolean {
  if (!url) return false;
  return /\.(mp4|mov|webm|m4v)$/i.test(url);
}
