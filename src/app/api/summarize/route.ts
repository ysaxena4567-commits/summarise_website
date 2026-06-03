import { NextResponse } from "next/server";
import mammoth from "mammoth";
import PDFParser from "pdf2json";
import { getAuthUserFromRequest } from "@/lib/auth";
import {
  consumeServerSummary,
  getServerAccount,
  normalizeEmail,
  refundServerSummary,
  remainingSummaries,
} from "@/lib/serverUsage";
import { clientIp, rateLimit, requireSameOrigin } from "@/lib/security";

export const runtime = "nodejs";

const GEMINI_MODEL = "gemini-2.5-flash-lite";
const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_REQUEST_BYTES = MAX_FILES * MAX_FILE_BYTES + 256_000;
const MAX_TEXT_CHARS = 240_000;
const MAX_INSTRUCTION_CHARS = 1_000;

type ExtractedDocument = {
  name: string;
  text: string;
};

type GeminiSummary = {
  executiveSummary: string[] | string;
  keyPoints: string[] | string;
  importantDates: string[] | string;
  importantPeople: string[] | string;
  actionItems: string[] | string;
  risks: string[] | string;
};

const sectionLabels: Array<[keyof GeminiSummary, string]> = [
  ["executiveSummary", "Executive Summary"],
  ["keyPoints", "Key Points"],
  ["importantDates", "Important Dates"],
  ["importantPeople", "Important People"],
  ["actionItems", "Action Items"],
  ["risks", "Risks"],
];

async function extractPdfText(buffer: Buffer) {
  return new Promise<string>((resolve, reject) => {
    const parser = new PDFParser(null, true);

    parser.on("pdfParser_dataError", (error) => {
      parser.destroy();
      reject(error instanceof Error ? error : error.parserError);
    });

    parser.on("pdfParser_dataReady", () => {
      const text = parser.getRawTextContent();
      parser.destroy();
      resolve(text);
    });

    parser.parseBuffer(buffer);
  });
}

async function extractDocumentText(file: File): Promise<ExtractedDocument> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`${file.name} is larger than the 10MB limit.`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = file.name || "uploaded-document";
  const lowerName = fileName.toLowerCase();
  const mimeType = file.type;

  if (lowerName.endsWith(".pdf") || mimeType === "application/pdf") {
    return {
      name: fileName,
      text: await extractPdfText(buffer),
    };
  }

  if (
    lowerName.endsWith(".docx") ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return {
      name: fileName,
      text: result.value,
    };
  }

  if (lowerName.endsWith(".txt") || mimeType === "text/plain") {
    return {
      name: fileName,
      text: buffer.toString("utf8"),
    };
  }

  throw new Error(`${file.name} is not supported. Upload PDF, DOCX, or TXT files.`);
}

function normalizeInstructions(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return "";

  return value.replace(/\s+/g, " ").trim().slice(0, MAX_INSTRUCTION_CHARS);
}

function buildPrompt(documents: ExtractedDocument[], instructions: string) {
  const sourceText = documents
    .map((document, index) => {
      return `DOCUMENT ${index + 1}: ${document.name}\n${document.text.trim()}`;
    })
    .join("\n\n---\n\n")
    .slice(0, MAX_TEXT_CHARS);

  const instructionBlock = instructions
    ? `\nUser's optional summary instructions:\n${instructions}\n\nFollow these instructions only when they do not conflict with the critical grounding rules or required JSON output shape.\n`
    : "";

  return `You are JustFlamsit, an AI document summarization assistant.

CRITICAL RULES:
- Use ONLY the information explicitly present in the uploaded document text below.
- Never invent facts.
- Never guess.
- Never add information that is not in the document text.
- If a category has no relevant information, return exactly: Not Mentioned In Document
- Be thorough. Do not skip names, dates, events, risks, decisions, duties, actions, causes, results, definitions, or important facts that appear in the document.
- Preserve original meaning, names, date ranges, and chronology.
- If the document is educational or historical, include all major rulers, dynasties, dates, events, practices, regions, and consequences mentioned.
- If multiple files are uploaded, combine overlapping information only when the documents support it.

Return ONLY valid JSON. Do not wrap it in markdown. Do not add commentary.
The JSON must match this exact shape:
{
  "executiveSummary": ["..."],
  "keyPoints": ["..."],
  "importantDates": ["..."],
  "importantPeople": ["..."],
  "actionItems": ["..."],
  "risks": ["..."]
}

Each array should contain detailed bullet-style strings. If a section has no information, use ["Not Mentioned In Document"].
${instructionBlock}

Uploaded document text:

${sourceText}`;
}

function normalizeSection(value: string[] | string | undefined) {
  if (Array.isArray(value)) {
    const items = value.map((item) => String(item).trim()).filter(Boolean);
    return items.length ? items : ["Not Mentioned In Document"];
  }

  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

  return ["Not Mentioned In Document"];
}

function cleanJsonText(text: string) {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function formatSummary(summary: GeminiSummary) {
  return sectionLabels
    .map(([key, label]) => {
      const items = normalizeSection(summary[key]);
      const body = items.map((item) => `- ${item.replace(/\s+/g, " ").trim()}`).join("\n");
      return `## ${label}\n${body}`;
    })
    .join("\n\n");
}

function extractGeminiText(response: unknown) {
  const candidate = response as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
    error?: { message?: string };
  };

  if (candidate.error?.message) {
    throw new Error(candidate.error.message);
  }

  const text = candidate.candidates?.[0]?.content?.parts
    ?.map((part) => part.text)
    .filter(Boolean)
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Gemini did not return a summary. Try a clearer document.");
  }

  try {
    const parsed = JSON.parse(cleanJsonText(text)) as Partial<GeminiSummary>;
    return formatSummary({
      executiveSummary: parsed.executiveSummary ?? ["Not Mentioned In Document"],
      keyPoints: parsed.keyPoints ?? ["Not Mentioned In Document"],
      importantDates: parsed.importantDates ?? ["Not Mentioned In Document"],
      importantPeople: parsed.importantPeople ?? ["Not Mentioned In Document"],
      actionItems: parsed.actionItems ?? ["Not Mentioned In Document"],
      risks: parsed.risks ?? ["Not Mentioned In Document"],
    });
  } catch {
    return text;
  }
}

export async function POST(request: Request) {
  try {
    const originError = requireSameOrigin(request);
    if (originError) return originError;

    const verifiedUser = getAuthUserFromRequest(request);
    const customerEmail = normalizeEmail(verifiedUser?.email);
    const rateLimitError = rateLimit({
      key: `summarize:${customerEmail || clientIp(request)}`,
      limit: 12,
      windowMs: 10 * 60 * 1000,
    });
    if (rateLimitError) return rateLimitError;

    if (!customerEmail) {
      return NextResponse.json(
        { error: "Please sign in before generating summaries." },
        { status: 401 },
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured on the server." },
        { status: 500 },
      );
    }

    const contentLength = Number(request.headers.get("content-length") || 0);

    if (contentLength > MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: "Upload up to 5 files with a 10MB limit per file." }, { status: 413 });
    }

    const formData = await request.formData();
    const instructions = normalizeInstructions(formData.get("instructions"));

    const usageCheck = await getServerAccount(customerEmail);

    if (usageCheck.databaseBacked && remainingSummaries(usageCheck.account) <= 0) {
      return NextResponse.json(
        {
          error: "You have reached your summary limit. Upgrade to JustFlamsit Pro to continue.",
          usage: usageCheck.account,
          databaseBacked: true,
          upgradeRequired: true,
        },
        { status: 402 },
      );
    }

    const files = formData
      .getAll("files")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);

    if (!files.length) {
      return NextResponse.json({ error: "Upload at least one PDF, DOCX, or TXT file." }, { status: 400 });
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: `Upload ${MAX_FILES} files or fewer.` }, { status: 400 });
    }

    const documents = await Promise.all(files.map(extractDocumentText));
    const availableDocuments = documents.filter((document) => document.text.trim().length > 0);

    if (!availableDocuments.length) {
      return NextResponse.json(
        { error: "No readable text was found in the uploaded file." },
        { status: 400 },
      );
    }

    const usage = await consumeServerSummary(customerEmail);

    if (!usage.allowed) {
      return NextResponse.json(
        {
          error: "You have reached your summary limit. Upgrade to JustFlamsit Pro to continue.",
          usage: usage.account,
          databaseBacked: usage.databaseBacked,
          upgradeRequired: true,
        },
        { status: 402 },
      );
    }

    let summary: string;

    try {
      const prompt = buildPrompt(availableDocuments, instructions);
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: 0,
              topP: 0.2,
              maxOutputTokens: 4096,
              responseMimeType: "application/json",
            },
          }),
        },
      );

      const data = await geminiResponse.json();

      if (!geminiResponse.ok) {
        const message =
          typeof data?.error?.message === "string"
            ? data.error.message
            : "Gemini summarization failed.";
        throw new Error(message);
      }

      summary = extractGeminiText(data);
    } catch (error) {
      await refundServerSummary(customerEmail);
      throw error;
    }

    return NextResponse.json({
      summary,
      documents: availableDocuments.map((document) => ({
        name: document.name,
        characters: document.text.length,
      })),
      usage: usage.account,
      databaseBacked: usage.databaseBacked,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Something went wrong while summarizing.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
