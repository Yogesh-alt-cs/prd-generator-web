import JSZip from "jszip";
import jsPDF from "jspdf";
import type { PrdRecord } from "./types";

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const slug = (text: string) =>
  (text || "vibeprd")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "vibeprd";

export function downloadMarkdownFile(record: PrdRecord, index: number) {
  const file = record.files[index]!;
  download(new Blob([file.content], { type: "text/markdown;charset=utf-8" }), file.filename);
}

export async function downloadMarkdownZip(record: PrdRecord) {
  const zip = new JSZip();
  const folder = zip.folder(slug(record.project.name))!;
  record.files.forEach((f) => folder.file(f.filename, f.content));
  const blob = await zip.generateAsync({ type: "blob" });
  download(blob, `${slug(record.project.name)}-prd.zip`);
}

export function downloadMetaJson(record: PrdRecord) {
  const meta = {
    schemaVersion: record.schemaVersion,
    id: record.id,
    generatedAt: record.generatedAt,
    generator: record.generator,
    project: record.project,
    platform: record.platform,
    stack: record.stack,
    design: record.design,
    files: record.files,
  };
  download(new Blob([JSON.stringify(meta, null, 2)], { type: "application/json" }), `${slug(record.project.name)}-meta.json`);
}

/* ---------- PDF ---------- */

interface Line {
  text: string;
  size: number;
  style: "normal" | "bold" | "italic";
  gap: number;
  mono?: boolean;
}

function markdownToLines(markdown: string): Line[] {
  const lines: Line[] = [];
  let inCode = false;
  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.replace(/\r/g, "");
    if (line.trim().startsWith("```")) {
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      lines.push({ text: line || " ", size: 9, style: "normal", gap: 4.5, mono: true });
      continue;
    }
    if (!line.trim()) {
      lines.push({ text: "", size: 10, style: "normal", gap: 3 });
      continue;
    }
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1]!.length;
      const size = [18, 14, 12, 11][level - 1] ?? 11;
      lines.push({ text: clean(heading[2]!), size, style: "bold", gap: size * 0.7 });
      continue;
    }
    if (/^\|/.test(line)) {
      if (/^\|[\s:|-]+\|?$/.test(line)) continue;
      const cells = line
        .split("|")
        .slice(1, -1)
        .map((c) => clean(c.trim()));
      lines.push({ text: cells.join("   |   "), size: 9.5, style: "normal", gap: 5 });
      continue;
    }
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      lines.push({ text: `- ${clean(bullet[1]!)}`, size: 10, style: "normal", gap: 5 });
      continue;
    }
    const numbered = /^\s*(\d+)\.\s+(.*)$/.exec(line);
    if (numbered) {
      lines.push({ text: `${numbered[1]}. ${clean(numbered[2]!)}`, size: 10, style: "normal", gap: 5 });
      continue;
    }
    lines.push({ text: clean(line), size: 10, style: "normal", gap: 5 });
  }
  return lines;
}

function clean(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1 ($2)");
}

export function downloadPdf(record: PrdRecord) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 56;
  const contentWidth = pageWidth - margin * 2;
  const date = new Date(record.generatedAt).toLocaleDateString();

  // Cover page
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(79, 70, 229);
  doc.text("YOU B TECH / VIBEPRD", margin, 150);
  doc.setFontSize(30);
  doc.setTextColor(20, 20, 26);
  doc.text(doc.splitTextToSize(record.project.name || "Untitled product", contentWidth), margin, 200);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(90, 90, 100);
  doc.text(`Category: ${record.project.category}`, margin, 250);
  doc.text(`Platform: ${record.platform}`, margin, 270);
  doc.text(`Generated: ${date}`, margin, 290);
  doc.text(`Mode: ${record.generator.mode} (${record.generator.model})`, margin, 310);

  // Table of contents
  doc.addPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(20, 20, 26);
  doc.text("Table of contents", margin, 100);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  record.files.forEach((f, i) => {
    doc.text(`${i + 1}. ${f.name.replace(/_/g, " ")}  —  ${f.wordCount} words`, margin, 140 + i * 22);
  });

  record.files.forEach((file) => {
    doc.addPage();
    let y = 110;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(79, 70, 229);
    doc.text(file.name.replace(/_/g, " "), margin, 90);
    doc.setTextColor(30, 30, 36);

    for (const line of markdownToLines(file.content)) {
      doc.setFont(line.mono ? "courier" : "helvetica", line.style);
      doc.setFontSize(line.size);
      const wrapped = line.text ? doc.splitTextToSize(line.text, contentWidth) : [""];
      for (const piece of wrapped) {
        if (y > pageHeight - 80) {
          doc.addPage();
          y = 90;
          doc.setFont(line.mono ? "courier" : "helvetica", line.style);
          doc.setFontSize(line.size);
        }
        if (piece) doc.text(piece, margin, y);
        y += line.gap + line.size * 0.4;
      }
    }
  });

  // Headers, footers and page numbers
  const total = doc.getNumberOfPages();
  for (let page = 2; page <= total; page++) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 150);
    doc.text(`${record.project.name || "Untitled product"} — PRD`, margin, 40);
    doc.text(date, pageWidth - margin, 40, { align: "right" });
    doc.text("Generated with VibePRD", margin, pageHeight - 32);
    doc.text(`Page ${page} of ${total}`, pageWidth - margin, pageHeight - 32, { align: "right" });
  }

  doc.save(`${slug(record.project.name)}-prd.pdf`);
}
