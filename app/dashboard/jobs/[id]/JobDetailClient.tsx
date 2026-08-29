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
            className="rounded-lg border px-3 py-2 text-sm"
          >
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={sendWhatsApp}
            className="rounded-lg bg-green-600 text-white px-3 py-2 text-sm"
          >
            Send via WhatsApp
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
