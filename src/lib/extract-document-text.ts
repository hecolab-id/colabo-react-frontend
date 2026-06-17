// Client-side text extraction for the PRD-to-Tasks uploader.
// Keeps the document in the browser: only the extracted text is sent to the
// existing /ai/generate-tasks endpoint, so no backend change or R2 storage is
// needed. The PDF parser (pdfjs-dist) is loaded lazily on first PDF.

export type DocumentParseErrorCode = "unsupported" | "too_large" | "empty" | "parse_failed";

export class DocumentParseError extends Error {
    code: DocumentParseErrorCode;

    constructor(code: DocumentParseErrorCode, message: string) {
        super(message);
        this.name = "DocumentParseError";
        this.code = code;
    }
}

export interface ExtractedDocument {
    text: string;
    wordCount: number;
    truncated: boolean;
}

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_CHARS = 200_000; // keep the AI prompt within a sane token budget
const TEXT_EXTENSIONS = [".md", ".markdown", ".txt", ".text"];
const TEXT_MIME_TYPES = ["text/plain", "text/markdown"];

// Drives the <input accept=""> and the dropzone copy. PDF, Markdown, plain text.
export const ACCEPTED_DOCUMENT_TYPES =
    ".pdf,.md,.markdown,.txt,.text,application/pdf,text/plain,text/markdown";

function getExtension(name: string): string {
    const dot = name.lastIndexOf(".");
    return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

function countWords(text: string): number {
    const matches = text.trim().match(/\S+/g);
    return matches ? matches.length : 0;
}

// Strip control/zero-width chars and normalise the many Unicode spaces (NBSP,
// ideographic, BOM, ...) so empty-detection and word boundaries are reliable.
function normalise(raw: string): string {
    return raw
        .replace(/\u0000/g, "")
        .replace(/[\uFEFF\u200B\u200C\u200D\u2060]/g, "")
        .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, " ")
        .replace(/[ \t]+\n/g, "\n")
        .trim();
}

function isTextDocument(file: File, ext: string): boolean {
    // Match the <input accept> set: extension OR an exact text mime. A broad
    // `text/*` check would silently accept dropped html/csv/xml the UI rejects.
    return TEXT_EXTENSIONS.includes(ext) || TEXT_MIME_TYPES.includes(file.type);
}

export function isAcceptedDocument(file: File): boolean {
    const ext = getExtension(file.name);
    return ext === ".pdf" || file.type === "application/pdf" || isTextDocument(file, ext);
}

export async function extractDocumentText(file: File): Promise<ExtractedDocument> {
    if (file.size > MAX_BYTES) {
        throw new DocumentParseError(
            "too_large",
            "This file is larger than 10 MB. Try a smaller file, or paste the text.",
        );
    }

    const ext = getExtension(file.name);
    const isPdf = ext === ".pdf" || file.type === "application/pdf";
    const isText = isTextDocument(file, ext);

    let raw: string;
    if (isPdf) {
        raw = await extractPdfText(file);
    } else if (isText) {
        raw = await file.text();
    } else {
        throw new DocumentParseError(
            "unsupported",
            "Unsupported file type. Upload a PDF, Markdown, or text file.",
        );
    }

    let cleaned = normalise(raw);
    if (!cleaned) {
        throw new DocumentParseError(
            "empty",
            isPdf
                ? "We couldn't find any text in this PDF. It may be scanned images, so paste the text instead."
                : "This file looks empty. Paste the text instead.",
        );
    }

    const truncated = cleaned.length > MAX_CHARS;
    if (truncated) cleaned = cleaned.slice(0, MAX_CHARS);

    return { text: cleaned, wordCount: countWords(cleaned), truncated };
}

const PDF_PARSE_TIMEOUT_MS = 30000;

// Reject if the parse stalls (e.g. a PDF whose fonts/cmaps we don't ship), so a
// hang degrades to a clear error instead of an endless spinner.
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const timer = setTimeout(
            () => reject(new DocumentParseError("parse_failed", "Reading this PDF took too long. Paste the text instead.")),
            ms,
        );
        promise.then(
            (value) => { clearTimeout(timer); resolve(value); },
            (err) => { clearTimeout(timer); reject(err); },
        );
    });
}

async function extractPdfText(file: File): Promise<string> {
    try {
        const pdfjs = await import("pdfjs-dist");
        // Let Vite bundle the worker (and its own imports) as a module worker;
        // the raw `?url` worker has unresolved bare imports and hangs at runtime.
        if (!pdfjs.GlobalWorkerOptions.workerPort) {
            const PdfWorker = (await import("pdfjs-dist/build/pdf.worker.min.mjs?worker")).default;
            pdfjs.GlobalWorkerOptions.workerPort = new PdfWorker();
        }

        const data = new Uint8Array(await file.arrayBuffer());
        const task = pdfjs.getDocument({
            data,
            // Resolve base-14 fonts (Helvetica/Times/Courier) from shipped data so
            // getTextContent never stalls on an unset font URL.
            standardFontDataUrl: `${import.meta.env.BASE_URL}pdfjs/standard_fonts/`,
            useWorkerFetch: false,
            disableFontFace: true,
        });
        try {
            return await withTimeout(readPdfPages(task), PDF_PARSE_TIMEOUT_MS);
        } finally {
            // Tear down the document's worker-side job on success, timeout, or
            // error, so a timed-out parse stops consuming worker CPU/memory.
            task.destroy().catch(() => {});
        }
    } catch (err) {
        if (err instanceof DocumentParseError) throw err;
        console.error("PDF parse failed:", err);
        throw new DocumentParseError(
            "parse_failed",
            "We couldn't read this PDF. It may be corrupted or password-protected, so paste the text instead.",
        );
    }
}

async function readPdfPages(task: ReturnType<(typeof import("pdfjs-dist"))["getDocument"]>): Promise<string> {
    const doc = await task.promise;
    const pages: string[] = [];
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
        const page = await doc.getPage(pageNum);
        const content = await page.getTextContent();
        const line = content.items
            .map((item) => ("str" in item ? item.str : ""))
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();
        if (line) pages.push(line);
    }
    return pages.join("\n\n");
}
