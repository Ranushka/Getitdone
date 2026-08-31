"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Attachment = { id: string; url: string };

type Item = {
  id: string;
  title: string;
  comment: string | null;
  attachments: Attachment[];
  status: "PENDING" | "DONE";
};

type SignOff = { role: "TECHNICIAN" | "MANAGER"; name: string; signedAt: string };

type Job = {
  id: string;
  title: string;
  notes: string | null;
  shareToken: string;
  status: "IN_PROGRESS" | "TECH_SIGNED_OFF" | "COMPLETED";
  items: Item[];
  signOffs: SignOff[];
};

export default function JobDetailClient({ job }: { job: Job }) {
  const router = useRouter();
  const [newItem, setNewItem] = useState("");
  const [managerName, setManagerName] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/t/${job.shareToken}`
      : `/t/${job.shareToken}`;

  const techSignOff = job.signOffs.find((s) => s.role === "TECHNICIAN");
  const managerSignOff = job.signOffs.find((s) => s.role === "MANAGER");
  const allDone = job.items.length > 0 && job.items.every((i) => i.status === "DONE");

  async function addItem() {
    if (!newItem.trim()) return;
    setBusy(true);
    await fetch(`/api/jobs/${job.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newItem }),
    });
    setNewItem("");
    setBusy(false);
    router.refresh();
  }

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function sendWhatsApp() {
    const text = encodeURIComponent(`Job: ${job.title}\n${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  async function managerSignOffSubmit() {
    if (!managerName.trim()) return;
    setBusy(true);
    await fetch(`/api/jobs/${job.id}/signoff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: managerName }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">{job.title}</h1>
        {job.notes && <p className="text-sm text-gray-500 mt-1">{job.notes}</p>}
      </div>

      <div className="rounded-lg border p-4 flex flex-col gap-2">
        <span className="text-sm font-medium">Technician link</span>
        <div className="flex gap-2">
          <input
            readOnly
            value={shareUrl}
            className="border rounded-lg px-3 py-2 flex-1 text-sm text-gray-600"
          />
          <button
            onClick={copyLink}
            aria-label={copied ? "Copied" : "Copy link"}
            title={copied ? "Copied" : "Copy link"}
            className="rounded-lg border px-3 py-2 text-sm shrink-0"
          >
            {copied ? (
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
          </button>
          <button
            onClick={sendWhatsApp}
            aria-label="Send via WhatsApp"
            title="Send via WhatsApp"
            className="rounded-lg bg-green-600 text-white px-3 py-2 text-sm shrink-0"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.2h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm5.8 14.16c-.24.68-1.4 1.3-1.93 1.38-.5.08-1.12.11-1.8-.11-.42-.13-.95-.31-1.64-.6-2.88-1.24-4.76-4.13-4.9-4.32-.14-.19-1.17-1.56-1.17-2.98 0-1.42.74-2.11 1-2.4.26-.29.57-.36.76-.36l.55.01c.18 0 .41-.07.64.49.24.58.81 2 .88 2.14.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.16-.29.36-.42.49-.14.14-.28.29-.12.56.16.28.71 1.17 1.52 1.9 1.05.94 1.93 1.23 2.21 1.37.28.14.44.12.6-.07.16-.19.68-.79.87-1.06.19-.28.37-.23.62-.14.26.09 1.63.77 1.91.91.28.14.47.21.53.33.07.12.07.68-.17 1.36z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Checklist</span>
        <ul className="flex flex-col gap-2">
          {job.items.map((item) => (
            <li key={item.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{item.title}</span>
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
              {item.comment && (
                <p className="text-sm text-gray-600 mt-1">{item.comment}</p>
              )}
              {item.attachments.length > 0 && (
                <div className="flex gap-2 mt-2 flex-wrap">
                  {item.attachments.map((a) =>
                    /\.(mp4|mov|webm|m4v)$/i.test(a.url) ? (
                      <video
                        key={a.id}
                        src={a.url}
                        controls
                        className="h-24 w-24 object-cover rounded-lg"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={a.id}
                        src={a.url}
                        alt={item.title}
                        className="h-24 w-24 object-cover rounded-lg"
                      />
                    )
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input
            className="border rounded-lg px-3 py-2 flex-1 text-sm"
            placeholder="Add checklist item"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
          />
          <button
            onClick={addItem}
            disabled={busy}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            Add
          </button>
        </div>
      </div>

      <div className="rounded-lg border p-4 flex flex-col gap-3">
        <span className="text-sm font-medium">Sign-off</span>
        <div className="text-sm text-gray-600">
          Technician:{" "}
          {techSignOff ? (
            <span className="text-green-700">
              {techSignOff.name} ✓ ({new Date(techSignOff.signedAt).toLocaleString()})
            </span>
          ) : (
            <span className="text-gray-400">Not yet signed off</span>
          )}
        </div>
        <div className="text-sm text-gray-600">
          Manager:{" "}
          {managerSignOff ? (
            <span className="text-green-700">
              {managerSignOff.name} ✓ ({new Date(managerSignOff.signedAt).toLocaleString()})
            </span>
          ) : (
            <span className="text-gray-400">Not yet signed off</span>
          )}
        </div>

        {!managerSignOff && techSignOff && (
          <div className="flex gap-2">
            <input
              className="border rounded-lg px-3 py-2 flex-1 text-sm"
              placeholder="Your name"
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
            />
            <button
              onClick={managerSignOffSubmit}
              disabled={busy}
              className="rounded-lg bg-black text-white px-3 py-2 text-sm"
            >
              Confirm sign-off
            </button>
          </div>
        )}
        {!techSignOff && (
          <p className="text-xs text-gray-400">
            Waiting on the technician to finish all items ({allDone ? "ready" : "in progress"}) and sign off.
          </p>
        )}
      </div>

      <a
        href={`/api/jobs/${job.id}/pdf`}
        target="_blank"
        className="rounded-lg border px-4 py-2 text-sm font-medium text-center"
      >
        Download PDF report
      </a>
    </div>
  );
}
