"use client";

import { useRef, useState } from "react";
import { MeetingDocument } from "@/lib/types";

async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item) => ("str" in item ? item.str : "")).join(" ") + "\n";
  }
  return text;
}

export default function DocumentUploader({
  documents,
  onChange,
}: {
  documents: MeetingDocument[];
  onChange: (docs: MeetingDocument[]) => void;
}) {
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setLoading(true);
    const newDocs: MeetingDocument[] = [];
    for (const file of Array.from(files)) {
      try {
        let text = "";
        if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
          text = await extractPdfText(file);
        } else if (
          file.type.startsWith("text/") ||
          file.name.endsWith(".txt") ||
          file.name.endsWith(".md")
        ) {
          text = await file.text();
        } else {
          alert(
            `${file.name}: 現在対応している形式は PDF / TXT / MD のみです。(Word/Excel/PPTは今後対応予定)`
          );
          continue;
        }
        newDocs.push({ id: crypto.randomUUID(), name: file.name, text });
      } catch {
        alert(`${file.name} の読み込みに失敗しました。`);
      }
    }
    onChange([...documents, ...newDocs]);
    setLoading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeDoc = (id: string) => {
    onChange(documents.filter((d) => d.id !== id));
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700">📂 会議資料（PDF / TXT / MD）</h3>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          className="text-sm text-blue-600 hover:text-blue-800 underline disabled:text-gray-400"
        >
          {loading ? "読み込み中..." : "資料をアップロード"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.md,text/plain,application/pdf"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {documents.length === 0 ? (
        <p className="text-sm text-gray-400">
          資料をアップロードすると、AIが会話内容との矛盾や抜け漏れをチェックします。
        </p>
      ) : (
        <ul className="space-y-1.5">
          {documents.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2"
            >
              <span className="text-gray-700 truncate">📄 {d.name}</span>
              <button onClick={() => removeDoc(d.id)} className="text-gray-400 hover:text-red-600 ml-3">
                削除
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
