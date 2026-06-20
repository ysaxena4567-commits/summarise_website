import { NextResponse } from "next/server";
import mammoth from "mammoth";
import PDFParser from "pdf2json";
import { accountIdentityFromClerk, anonymousIdentity, getClerkIdentity } from "@/lib/clerkIdentity";
import {
  consumeServerSummary,
  recordSummaryMetadata,
  refundServerSummary,
} from "@/lib/serverUsage";
import { clientIp, rateLimit, requireSameOrigin } from "@/lib/security";

export const runtime = "nodejs";

const GEMINI_MODEL = "gemini-2.5-flash-lite";
const MAX_FILES = 5;
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_REQUEST_BYTES = MAX_FILES * MAX_FILE_BYTES + 256_000;
const MAX_TEXT_CHARS = 240_000;
const MAX_INSTRUCTION_CHARS = 1_000;
const fallbackText = "Not found in this document";

type ExtractedDocument = {
  name: string;
  text: string;
};

type GeminiSummary = Record<string, string[] | string | undefined>;

type UploadedDocumentInput = {
  name?: string;
  text?: string;
  type?: string;
  size?: number;
};

const summarySections = [
  { key: "weightageTrendRadar", label: "SECTION 1: CHAPTER WEIGHTAGE & TREND RADAR" },
  { key: "coreHeadlines", label: "SECTION 2: THE 80/20 CORE HEADLINES & TOPICS" },
  {
    key: "multimodalExtractionMatrix",
    label: "SECTION 3: THE MULTIMODAL EXTRACTION & CALCULATION MATRIX",
    format: "markdown-table",
  },
  { key: "pyqProbabilityAnalysis", label: "SECTION 4: DATA-DRIVEN PYQ SELECTION & PROBABILITY ANALYSIS" },
  { key: "hiddenTraps", label: "SECTION 5: TEACHER'S FAVORITE CORNER & HIDDEN TRAPS" },
  { key: "phoenixGapAnalysis", label: "SECTION 6: THE PHOENIX GAP ANALYSIS (HIGH-RISK PREDICTORS)" },
  { key: "sprintPracticeQuestions", label: "SECTION 7: AI-GENERATED SPRINT PRACTICE QUESTIONS" },
  { key: "eleventhHourLifeline", label: "SECTION 8: KUCH NAHI PADHA TOH YEH PADHKE CHALE JAAO" },
] as const;

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
    console.log(`File rejected due to file exceeds 50MB limit. name="${file.name}", size=${file.size}`);
    throw new Error(`${file.name} is larger than the 50MB limit.`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = file.name || "uploaded-document";
  const lowerName = fileName.toLowerCase();
  const mimeType = file.type.toLowerCase();

  if (mimeType === "application/pdf" || lowerName.endsWith(".pdf")) {
    try {
      return {
        name: fileName,
        text: await extractPdfText(buffer),
      };
    } catch (error) {
      console.log(`File rejected due to PDF text extraction failure. name="${fileName}"`, error);
      throw new Error(`${fileName} could not be read as a PDF. Try re-saving or compressing the PDF and upload again.`);
    }
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

  console.log(
    `File rejected due to unsupported file type. name="${fileName}", mime="${mimeType || "missing"}"`,
  );
  throw new Error(`${file.name} is not supported. Upload PDF, DOCX, or TXT files.`);
}

function normalizeInstructions(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return "";

  return value.replace(/\s+/g, " ").trim().slice(0, MAX_INSTRUCTION_CHARS);
}

function normalizeJsonInstructions(value: unknown) {
  if (typeof value !== "string") return "";

  return value.replace(/\s+/g, " ").trim().slice(0, MAX_INSTRUCTION_CHARS);
}

function normalizeUploadedDocument(document: UploadedDocumentInput, index: number): ExtractedDocument {
  const name = document.name?.trim() || `uploaded-document-${index + 1}`;
  const text = document.text?.trim() || "";

  if (!text) {
    console.log(`File rejected due to no extracted text. name="${name}", type="${document.type || "missing"}", size=${document.size ?? 0}`);
    throw new Error(`${name} has no selectable text. Use an OCR/scanned-PDF version with selectable text, then upload again.`);
  }

  return {
    name,
    text,
  };
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

  return `You are Semester Hacker Engine v1.0 inside JustFlamsit: an elite Academic Data Scientist and Master Exam Analyst.

You ingest two academic inputs:
- Input A: the source theory, chapter, textbook, notes, or assignment.
- Input B: previous year questions, sample questions, or historical exam patterns.

If the upload contains multiple files, infer Input A and Input B from filenames and content:
- Files with many question marks, marks labels, years, "PYQ", "sample", "question", or "paper" are Input B.
- Files with chapter prose, definitions, examples, formulas, diagrams, or theory are Input A.
- If classification is uncertain, still perform the analysis but explicitly mark the uncertain source classification in Section 1.

CRITICAL RULES:
- Use ONLY the information explicitly present in the uploaded document text below.
- Never invent facts.
- Never guess.
- Never add information that is not in the document text.
- If a category has no relevant information, return exactly: ${fallbackText}
- Every topic, headline, definition, formula, question pattern, trap, and practice-question evaluation guide must include a source citation from Input A or Input B.
- Prefer citations in this form: [Document: filename, Page/Section/Heading if available]. If page numbers are missing, cite the exact sub-headline or local paragraph context.
- Priority weightings must be proportional to frequency in Input B. Count recurring terms/concepts/question patterns from Input B and use those counts in Section 1 and Section 4.
- Treat diagrams, tables, flowcharts, cycles, figures, graph labels, and captions as high-value exam material. Extract them when the uploaded text contains captions, labels, table rows, or figure references.
- If a PDF is scanned/image-heavy and only sparse captions are extracted, state that limitation exactly. Do not invent unseen visual content.
- Be ruthless: remove conversational filler, broad history, and low-signal explanation.
- Preserve only the mechanics needed to score marks with minimum effort.
- Be thorough. Do not skip names, dates, events, causes, results, definitions, formulas, derivations, examples, diagrams, exceptions, or important facts that appear in the document.
- Preserve original meaning, names, date ranges, and chronology.
- If chapter notes and previous-year questions are both uploaded, connect topics to questions only when the documents support the connection.
- If multiple files are uploaded, combine overlapping information only when the documents support it.
- Keep the response structured with clear headings once formatted.
- Use bullet-point style strings inside each JSON array.
- Maintain an authoritative, sharp, clinical, intensely tactical tone.

Return ONLY valid JSON. Do not wrap it in markdown. Do not add commentary.
The JSON must match this exact shape:

{
  "weightageTrendRadar": ["[METRIC] Overall Chapter Weightage: ...", "[TREND ANALYSIS] ..."],
  "coreHeadlines": ["Topic Name [Source Citation] - Priority Level: Critical/High/Medium | Core Concept: ... | Standard Exam Definition: ..."],
  "multimodalExtractionMatrix": "| Target Entity / Variable | Text-Derived Measurement / Composition | Diagram-Derived Data & Calculations | High-Yield Exam Context |\\n| :--- | :--- | :--- | :--- |\\n| ... | ... | ... | ... |",
  "pyqProbabilityAnalysis": ["Isolated Question Pattern: ... | Frequency Score: ... | AI Prediction Confidence: High 90%/Medium 70%/Low 50% | The Winning Framework: ..."],
  "hiddenTraps": ["The Hidden Concept: ... | The Examiner's Trap: ... | The Counter-Shield: ..."],
  "phoenixGapAnalysis": ["Statistically Overdue Topic: ... | Warning: The professor has ignored this dense topic for several cycles, making it a high-risk candidate for a surprise high-weightage question on this upcoming paper. | Sleeper Topic Summary: ..."],
  "sprintPracticeQuestions": ["Practice Question: ... | Evaluation Guide: ..."],
  "eleventhHourLifeline": ["Bullet 1", "Bullet 2", "Bullet 3", "Bullet 4", "Bullet 5", "Bullet 6", "Bullet 7", "Bullet 8", "Bullet 9", "Bullet 10"]
}

Section-specific mandates:
- Section 1 must assign a definitive percentage, marks trend, or priority class based on Input B frequency. If total exam marks are not available, use "High/Medium/Low Priority" with observed frequency counts.
- Section 2 must isolate the absolute critical 20% of topics that produce most marks and include source citations on every topic.
- Section 2 must include exam-critical diagrams/tables as core topics when Input A or Input B indicates they are important.
- Section 3 is exclusively the Multimodal Extraction & Calculation Matrix. Return it as one valid Markdown table string, never as a bullet list and never as prose outside the table.
- Section 3 must use this exact four-column header and divider row:
  | Target Entity / Variable | Text-Derived Measurement / Composition | Diagram-Derived Data & Calculations | High-Yield Exam Context |
  | :--- | :--- | :--- | :--- |
- In Section 3, extract every explicit numerical measurement, range, scale, dimension, variable, formula, chemical composition, equation, unit, concentration, temperature, pH, volume, rate, yield, labelled process sequence, table value, and derivation fact present in Input A.
- Preserve values and scientific units exactly as written. Do not round, convert, or infer values unless the calculation is mathematically deducible from values, scales, axes, labels, or annotations present in the uploaded text.
- For each row, Column 3 must contain diagram/table/graph data only when captions, labels, figure references, table rows, graph axes, scale values, or annotations are explicitly present in the uploaded text. Otherwise write exactly: N/A - Text Only.
- For a scanned or image-only PDF with no extracted visual labels, do not claim to inspect a diagram. Use N/A - Text Only and state the source limitation in the relevant exam-context cell.
- Every row must include a source citation in either Column 2, Column 3, or Column 4. If no qualifying data exists, return the required table header plus one row whose measurement cells say "${fallbackText}".
- Section 4 must include the top 5 recurring question types from Input B whenever available.
- Section 5 must focus on footnotes, exceptions, edge cases, diagrams, table traps, labelled-process traps, phrasing traps, and short-answer traps found in Input A.
- Section 6 must identify dense foundational concepts from Input A that are under-tested in Input B. If no gap can be proven, return ["${fallbackText}"].
- Section 7 must generate 5 unique practice questions that do not exist verbatim in Input B but are grounded in Input A and shaped by Input B trends.
- Section 8 must contain exactly 10 high-density emergency bullets. No more, no fewer. Include a diagram/table bullet only if the source text supports it.

Each array should contain detailed bullet-style strings. If a section has no information, use ["${fallbackText}"].
${instructionBlock}

Uploaded document text:

${sourceText}`;
}

function normalizeSection(value: string[] | string | undefined) {
  if (Array.isArray(value)) {
    const items = value.map((item) => String(item).trim()).filter(Boolean);
    return items.length ? items : [fallbackText];
  }

  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

  return [fallbackText];
}

function cleanJsonText(text: string) {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function formatSummary(summary: GeminiSummary) {
  return summarySections
    .map((section) => {
      const { key, label } = section;
      const format = "format" in section ? section.format : undefined;

      if (format === "markdown-table") {
        const matrix = typeof summary[key] === "string" ? summary[key].trim() : "";
        const fallbackMatrix = [
          "| Target Entity / Variable | Text-Derived Measurement / Composition | Diagram-Derived Data & Calculations | High-Yield Exam Context |",
          "| :--- | :--- | :--- | :--- |",
          `| ${fallbackText} | ${fallbackText} | N/A - Text Only | ${fallbackText} |`,
        ].join("\n");

        return `## ${label}\n${matrix.startsWith("|") ? matrix : fallbackMatrix}`;
      }

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
    const parsed = JSON.parse(cleanJsonText(text)) as GeminiSummary;
    const normalizedSummary = summarySections.reduce<GeminiSummary>((accumulator, section) => {
      accumulator[section.key] = parsed[section.key] ?? [fallbackText];
      return accumulator;
    }, {});
    return formatSummary(normalizedSummary);
  } catch {
    return text;
  }
}

export async function POST(request: Request) {
  try {
    const originError = requireSameOrigin(request);
    if (originError) return originError;

    const clerkIdentity = await getClerkIdentity();
    const signedInIdentity =
      clerkIdentity?.email && clerkIdentity.emailVerified
        ? accountIdentityFromClerk(clerkIdentity)
        : null;
    const usageIdentity = signedInIdentity || anonymousIdentity(clientIp(request));
    const rateLimitError = rateLimit({
      key: `summarize:${usageIdentity.key}`,
      limit: 12,
      windowMs: 10 * 60 * 1000,
    });
    if (rateLimitError) return rateLimitError;

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured on the server." },
        { status: 500 },
      );
    }

    const contentLength = Number(request.headers.get("content-length") || 0);

    if (contentLength > MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: "Upload up to 5 files with a 50MB limit per file." }, { status: 413 });
    }

    const contentType = request.headers.get("content-type") || "";
    let instructions = "";
    let documents: ExtractedDocument[];

    if (contentType.includes("application/json")) {
      const body = (await request.json().catch(() => ({}))) as {
        documents?: UploadedDocumentInput[];
        instructions?: unknown;
      };

      instructions = normalizeJsonInstructions(body.instructions);
      const uploadedDocuments = Array.isArray(body.documents) ? body.documents : [];

      if (!uploadedDocuments.length) {
        return NextResponse.json({ error: "Upload at least one PDF, DOCX, or TXT file." }, { status: 400 });
      }

      if (uploadedDocuments.length > MAX_FILES) {
        return NextResponse.json({ error: `Upload ${MAX_FILES} files or fewer.` }, { status: 400 });
      }

      documents = uploadedDocuments.map(normalizeUploadedDocument);
    } else {
      const formData = await request.formData();
      instructions = normalizeInstructions(formData.get("instructions"));
      const files = formData
        .getAll("files")
        .filter((entry): entry is File => entry instanceof File && entry.size > 0);

      if (!files.length) {
        return NextResponse.json({ error: "Upload at least one PDF, DOCX, or TXT file." }, { status: 400 });
      }

      if (files.length > MAX_FILES) {
        return NextResponse.json({ error: `Upload ${MAX_FILES} files or fewer.` }, { status: 400 });
      }

      documents = await Promise.all(files.map(extractDocumentText));
    }

    const availableDocuments = documents.filter((document) => document.text.trim().length > 0);

    if (!availableDocuments.length) {
      return NextResponse.json(
        { error: "No readable text was found in the uploaded file." },
        { status: 400 },
      );
    }

    const usage = await consumeServerSummary(usageIdentity);
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
      await refundServerSummary(usageIdentity);
      throw error;
    }

    if (signedInIdentity) {
      await recordSummaryMetadata(signedInIdentity, {
        documentNames: availableDocuments.map((document) => document.name),
        documentCount: availableDocuments.length,
        totalCharacters: availableDocuments.reduce((total, document) => total + document.text.length, 0),
        instructionLength: instructions.length,
      });
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
