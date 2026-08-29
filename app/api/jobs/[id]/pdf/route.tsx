import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { readFile } from "fs/promises";
import path from "path";
import React from "react";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 11, fontFamily: "Helvetica" },
  title: { fontSize: 18, marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#666", marginBottom: 16 },
  item: {
    borderBottom: "1 solid #eee",
    paddingVertical: 8,
    flexDirection: "row",
    gap: 10,
  },
  thumbRow: { flexDirection: "row", gap: 4 },
  thumb: { width: 40, height: 40, borderRadius: 4, objectFit: "cover" },
  itemBody: { flex: 1 },
  itemTitle: { fontSize: 12, marginBottom: 2 },
  comment: { fontSize: 10, color: "#444" },
  status: { fontSize: 9, color: "#0a0" },
  statusPending: { fontSize: 9, color: "#999" },
  signOffRow: { marginTop: 16, fontSize: 10 },
  videoNote: { fontSize: 9, color: "#666", fontStyle: "italic" },
});

const VIDEO_EXT = /\.(mp4|mov|webm|m4v)$/i;

// Embeds photos as small base64 thumbnails read straight off disk — keeps the
// PDF a "fast breakdown", not a full-resolution photo dump. Videos can't be
// embedded in a PDF, so those are left out and noted as text instead.
async function toDataUri(url: string): Promise<string | null> {
  if (VIDEO_EXT.test(url)) return null;
  const filename = url.split("/").pop();
  if (!filename) return null;
  try {
    const buf = await readFile(
      path.join(path.resolve(/*turbopackIgnore: true*/ UPLOAD_DIR), filename)
    );
    const ext = path.extname(filename).slice(1) || "jpeg";
    return `data:image/${ext};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const job = await prisma.job.findFirst({
    where: { id, managerId: session.user.id },
    include: { items: { orderBy: { order: "asc" }, include: { attachments: { orderBy: { createdAt: "asc" } } } }, signOffs: true },
  });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const itemsWithImages = await Promise.all(
    job.items.map(async (item) => ({
      ...item,
      thumbs: await Promise.all(
        item.attachments.map(async (a) => ({ url: a.url, dataUri: await toDataUri(a.url) }))
      ),
    }))
  );

  const techSignOff = job.signOffs.find((s) => s.role === "TECHNICIAN");
  const managerSignOff = job.signOffs.find((s) => s.role === "MANAGER");

  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{job.title}</Text>
        <Text style={styles.subtitle}>
          {job.notes || " "} · {new Date(job.createdAt).toLocaleDateString()}
        </Text>

        {itemsWithImages.map((item) => {
          const videoCount = item.thumbs.filter((t) => VIDEO_EXT.test(t.url)).length;
          return (
            <View key={item.id} style={styles.item}>
              {item.thumbs.length > 0 ? (
                <View style={styles.thumbRow}>
                  {item.thumbs
                    .filter((t) => t.dataUri)
                    .slice(0, 3)
                    .map((t, i) => (
                      <Image key={i} src={t.dataUri!} style={styles.thumb} />
                    ))}
                </View>
              ) : (
                <View style={styles.thumb} />
              )}
              <View style={styles.itemBody}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                {item.comment ? <Text style={styles.comment}>{item.comment}</Text> : null}
                {videoCount > 0 ? (
                  <Text style={styles.videoNote}>
                    🎥 {videoCount} video{videoCount > 1 ? "s" : ""} attached (view online)
                  </Text>
                ) : null}
                <Text style={item.status === "DONE" ? styles.status : styles.statusPending}>
                  {item.status === "DONE" ? "Done" : "Pending"}
                </Text>
              </View>
            </View>
          );
        })}

        <View style={styles.signOffRow}>
          <Text>
            Technician sign-off: {techSignOff ? `${techSignOff.name} (${new Date(techSignOff.signedAt).toLocaleString()})` : "—"}
          </Text>
          <Text>
            Manager sign-off: {managerSignOff ? `${managerSignOff.name} (${new Date(managerSignOff.signedAt).toLocaleString()})` : "—"}
          </Text>
        </View>
      </Page>
    </Document>
  );

  const buffer = await renderToBuffer(doc);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${job.title.replace(/[^a-z0-9]+/gi, "-")}.pdf"`,
    },
  });
}
