/**
 * Knowledge base + simple RAG.
 *
 * In production this is backed by pgvector / Qdrant.
 * In demo it's an in-memory vector store with cosine search.
 */

import { ai } from "./provider";

export interface KnowledgeDoc {
  id: string;
  tenantId: string;
  title: string;
  source: "upload" | "url" | "manual" | "integration";
  url?: string;
  bytes: number;
  chunks: number;
  status: "ready" | "indexing" | "failed";
  createdAt: string;
  tags: string[];
}

export interface KnowledgeChunk {
  id: string;
  docId: string;
  tenantId: string;
  text: string;
  embedding: number[];
}

const docs: KnowledgeDoc[] = [];
const chunks: KnowledgeChunk[] = [];

export async function ingestText(
  tenantId: string,
  title: string,
  text: string,
  meta: { source?: KnowledgeDoc["source"]; url?: string; tags?: string[] } = {},
): Promise<KnowledgeDoc> {
  const docId = `doc_${Math.random().toString(36).slice(2, 10)}`;
  const pieces = chunk(text, 800, 100);
  const embeddings = await ai.embed(pieces, { tenantId, feature: "knowledge.ingest" });
  for (let i = 0; i < pieces.length; i++) {
    chunks.push({
      id: `${docId}_c${i}`,
      docId,
      tenantId,
      text: pieces[i],
      embedding: embeddings[i],
    });
  }
  const doc: KnowledgeDoc = {
    id: docId,
    tenantId,
    title,
    source: meta.source ?? "manual",
    url: meta.url,
    bytes: text.length,
    chunks: pieces.length,
    status: "ready",
    createdAt: new Date().toISOString(),
    tags: meta.tags ?? [],
  };
  docs.push(doc);
  return doc;
}

export function listDocs(tenantId: string): KnowledgeDoc[] {
  return docs.filter((d) => d.tenantId === tenantId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function deleteDoc(tenantId: string, docId: string) {
  const idx = docs.findIndex((d) => d.tenantId === tenantId && d.id === docId);
  if (idx >= 0) docs.splice(idx, 1);
  for (let i = chunks.length - 1; i >= 0; i--) {
    if (chunks[i].docId === docId && chunks[i].tenantId === tenantId) chunks.splice(i, 1);
  }
}

export interface SearchHit {
  chunk: KnowledgeChunk;
  doc: KnowledgeDoc | undefined;
  score: number;
}

export async function search(tenantId: string, query: string, k = 4): Promise<SearchHit[]> {
  const tenantChunks = chunks.filter((c) => c.tenantId === tenantId);
  if (tenantChunks.length === 0) return [];
  const [qEmbed] = await ai.embed([query], { tenantId, feature: "knowledge.search" });
  const scored = tenantChunks.map((c) => ({
    chunk: c,
    doc: docs.find((d) => d.id === c.docId),
    score: cosine(qEmbed, c.embedding),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

export async function answerWithContext(tenantId: string, question: string): Promise<string> {
  const hits = await search(tenantId, question, 4);
  const context = hits.map((h, i) => `[${i + 1}] ${h.chunk.text}`).join("\n\n");
  const r = await ai.complete(
    [
      { role: "system", content: "Answer using ONLY the CONTEXT. If unsure, say you'll get back to them." },
      { role: "user", content: `CONTEXT:\n${context}\n\nQUESTION:\n${question}` },
    ],
    { tenantId, feature: "knowledge.qa" },
  );
  return r.text;
}

// ---------- Helpers ----------

function chunk(text: string, size: number, overlap: number): string[] {
  const out: string[] = [];
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return out;
  for (let i = 0; i < clean.length; i += size - overlap) {
    out.push(clean.slice(i, i + size));
    if (i + size >= clean.length) break;
  }
  return out;
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}

/** Seed a few demo docs so the Knowledge UI has content. */
export async function seedDemoKnowledge(tenantId: string) {
  if (docs.some((d) => d.tenantId === tenantId)) return;
  await ingestText(tenantId, "Pricing & Plans",
    "Starter is $29/mo for 1 user, 500 contacts. Pro is $79/mo for 5 users and 10k contacts. Business is $199/mo with voice AI. Agency is $399/mo for 10 client orgs. Enterprise is custom.",
    { source: "manual", tags: ["pricing"] },
  );
  await ingestText(tenantId, "Refund Policy",
    "Refunds are available within 14 days of payment if no tokens were consumed. After 14 days, plans are non-refundable but can be paused for up to 90 days.",
    { source: "manual", tags: ["policy", "refund"] },
  );
  await ingestText(tenantId, "Onboarding Guide",
    "After signup, choose your business type, connect WhatsApp or email, install the lead-qualify automation, and import a CSV. Time-to-first-value is under 5 minutes.",
    { source: "manual", tags: ["onboarding", "guide"] },
  );
}
