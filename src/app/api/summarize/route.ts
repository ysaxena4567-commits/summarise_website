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

const SUMMARY_ERROR_MESSAGE = "Summary generation could not be completed. Please check the file and generate again.";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";
const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
const GEMINI_MODELS_TO_TRY = Array.from(
  new Set([GEMINI_MODEL, DEFAULT_GEMINI_MODEL, "gemini-2.0-flash-lite", "gemini-1.5-flash"]),
);
const MAX_FILES = 5;
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_REQUEST_BYTES = MAX_FILES * MAX_FILE_BYTES + 256_000;
const MAX_TEXT_CHARS = 90_000;
const MAX_TEXT_CHARS_RETRY = 45_000;
const MAX_INSTRUCTION_CHARS = 1_000;
const fallbackText = "Not found in this document";

type ExtractedDocument = {
  name: string;
  text: string;
};

type DetectedRole =
  | "CHAPTER_NOTES"
  | "PYQ_QUESTION_PAPER"
  | "QUESTION_BANK"
  | "CLASS_HANDOUT"
  | "SHORT_NOTES"
  | "UNKNOWN";

type PreparedDocument = ExtractedDocument & {
  role: DetectedRole;
  extractionQuality: string;
  questionLines: string[];
  sourceChars: number;
};

type PreparedDataset = {
  documents: PreparedDocument[];
  pyqDetected: boolean;
  questionLineCount: number;
  chunkingUsed: boolean;
  context: string;
};

type StructuredSummary = Record<string, unknown>;

class AiProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiProviderError";
  }
}

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
    format: "premium-cards",
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

function cleanExtractedText(text: string) {
  return text
    .replace(/-{8,}\s*Page\s*\(\d+\)\s*Break\s*-{8,}/gi, "\n")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function prioritizeDocumentText(text: string, maxChars: number) {
  const cleaned = cleanExtractedText(text);

  if (cleaned.length <= maxChars) return cleaned;

  const chunks = cleaned
    .split(/\n{2,}|(?<=[.!?])\s+/)
    .map((chunk) => chunk.replace(/\s+/g, " ").trim())
    .filter((chunk) => chunk.length >= 24);

  const scoredChunks = chunks.map((chunk, index) => {
    const lower = chunk.toLowerCase();
    const score =
      (/\b(definition|formula|equation|diagram|figure|table|flowchart|cycle|phase|process|difference|function|role|importance|question|pyq|marks?|explain|describe|derive|calculate)\b/.test(lower)
        ? 5
        : 0) +
      (/\d/.test(chunk) ? 2 : 0) +
      (chunk.includes("?") ? 3 : 0) +
      (index < 20 ? 2 : 0);

    return { chunk, index, score };
  });

  const compact = scoredChunks
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 260)
    .sort((a, b) => a.index - b.index)
    .map((item) => item.chunk)
    .join("\n\n")
    .slice(0, maxChars)
    .trim();

  return compact || cleaned.slice(0, maxChars).trim();
}

function detectDocumentRole(name: string, text: string): DetectedRole {
  const haystack = `${name}\n${text.slice(0, 20_000)}`.toLowerCase();

  if (/\b(pyq|previous\s*year|question\s*paper|sample\s*paper|model\s*paper|exam\s*paper|part[-\s]*a|part[-\s]*b|two\s*marks?|long\s*answer|short\s*answer)\b/.test(haystack)) {
    return "PYQ_QUESTION_PAPER";
  }

  if (/\b(question\s*bank|viva|define|explain|what\s+is|describe|differentiate|short\s+note|numericals?)\b/.test(haystack)) {
    return "QUESTION_BANK";
  }

  if (/\b(handout|worksheet|assignment|class\s*notes?)\b/.test(haystack)) {
    return "CLASS_HANDOUT";
  }

  if (/\b(short\s*notes?|revision|mug\s*up|summary|cheat\s*sheet)\b/.test(haystack)) {
    return "SHORT_NOTES";
  }

  if (/\b(chapter|unit|module|ncert|textbook|notes?|definition|concept|formula|diagram|table)\b/.test(haystack)) {
    return "CHAPTER_NOTES";
  }

  return "UNKNOWN";
}

function extractionQuality(text: string) {
  const cleaned = cleanExtractedText(text);
  const alphaCount = (cleaned.match(/[A-Za-z]/g) || []).length;
  const alphaRatio = cleaned.length ? alphaCount / cleaned.length : 0;

  if (cleaned.length < 500) return "WEAK: very little readable text extracted";
  if (alphaRatio < 0.35) return "WEAK: extraction appears noisy or OCR-like";
  if (cleaned.length < 3_000) return "MEDIUM: readable but short";
  return "GOOD: readable extracted text";
}

function extractQuestionLikeLines(text: string, maxLines = 80) {
  const seen = new Set<string>();
  const questionPattern =
    /\b(define|explain|describe|differentiate|distinguish|what\s+is|why|how|derive|calculate|prove|write\s+short\s+note|short\s+note|give\s+reason|draw|label|diagram|compare|discuss|state|list|enumerate|marks?|part[-\s]*a|part[-\s]*b|viva|numerical)\b/i;

  return cleanExtractedText(text)
    .split(/\n+|(?<=[?])\s+|(?<=\.)\s+(?=\d+[\).])/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => {
      if (line.length < 12 || line.length > 320) return false;
      if (!questionPattern.test(line) && !line.includes("?")) return false;
      const key = line.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, maxLines);
}

function compactChapterEvidence(text: string, maxChars: number) {
  const cleaned = cleanExtractedText(text);
  if (cleaned.length <= maxChars) return cleaned;

  const chunks = cleaned.match(/[\s\S]{1,12000}/g) || [cleaned];
  const chunkNotes = chunks.map((chunk, index) => {
    const evidence = prioritizeDocumentText(chunk, Math.max(1200, Math.floor(maxChars / Math.max(chunks.length, 1))));
    return `[Chunk ${index + 1} dense evidence]\n${evidence}`;
  });

  return chunkNotes.join("\n\n").slice(0, maxChars).trim();
}

function prepareDataset(documents: ExtractedDocument[], maxChars: number): PreparedDataset {
  const preparedDocuments = documents.map((document) => {
    const text = cleanExtractedText(document.text);
    const role = detectDocumentRole(document.name, text);
    const questionLines = extractQuestionLikeLines(text);

    return {
      ...document,
      text,
      role,
      extractionQuality: extractionQuality(text),
      questionLines,
      sourceChars: text.length,
    };
  });

  const pyqDocuments = preparedDocuments.filter((document) =>
    ["PYQ_QUESTION_PAPER", "QUESTION_BANK"].includes(document.role),
  );
  const pyqDetected = pyqDocuments.length > 0;
  const questionLineCount = pyqDocuments.reduce((total, document) => total + document.questionLines.length, 0);
  const totalChars = preparedDocuments.reduce((total, document) => total + document.text.length, 0);
  const chunkingUsed = totalChars > maxChars;
  const pyqBudget = Math.min(Math.floor(maxChars * 0.38), 36_000);
  const remainingBudget = Math.max(maxChars - pyqBudget, 20_000);
  const nonPyqDocuments = preparedDocuments.filter((document) => !pyqDocuments.includes(document));
  const chapterBudget = Math.max(Math.floor(remainingBudget / Math.max(nonPyqDocuments.length, 1)), 8_000);
  const pyqPerFileBudget = Math.max(Math.floor(pyqBudget / Math.max(pyqDocuments.length, 1)), 8_000);

  const orderedDocuments = [...pyqDocuments, ...nonPyqDocuments];
  const context = orderedDocuments
    .map((document, index) => {
      const isPyq = ["PYQ_QUESTION_PAPER", "QUESTION_BANK"].includes(document.role);
      const evidenceText = isPyq
        ? [
            document.questionLines.length
              ? `[Extracted question-like lines]\n${document.questionLines.join("\n")}`
              : "[Extraction note]\nPYQ/question-paper file was uploaded, but readable question text could not be extracted clearly. Upload a clearer/text-based PDF for stronger PYQ probability analysis.",
            "[Readable extracted text]\n" + prioritizeDocumentText(document.text, pyqPerFileBudget),
          ].join("\n\n")
        : compactChapterEvidence(document.text, chapterBudget);

      return [
        `[FILE ${index + 1}]`,
        `Name: ${document.name}`,
        `Detected role: ${document.role}`,
        `Extraction quality: ${document.extractionQuality}`,
        `Extracted character count: ${document.sourceChars}`,
        `Question-like line count: ${document.questionLines.length}`,
        "Extracted text:",
        evidenceText,
      ].join("\n");
    })
    .join("\n\n---\n\n")
    .slice(0, maxChars);

  console.log("Summary dataset prepared", {
    uploadedFileCount: preparedDocuments.length,
    filenames: preparedDocuments.map((document) => document.name),
    detectedRoles: preparedDocuments.map((document) => document.role),
    extractedCharacterCounts: preparedDocuments.map((document) => document.sourceChars),
    pyqDetected,
    extractedQuestionLikeLineCount: questionLineCount,
    chunkingUsed,
  });

  return {
    documents: preparedDocuments,
    pyqDetected,
    questionLineCount,
    chunkingUsed,
    context,
  };
}

function normalizeUploadedDocument(document: UploadedDocumentInput, index: number): ExtractedDocument {
  const name = document.name?.trim() || `uploaded-document-${index + 1}`;
  const text = cleanExtractedText(document.text || "");

  if (!text) {
    console.log(`File rejected due to no extracted text. name="${name}", type="${document.type || "missing"}", size=${document.size ?? 0}`);
    throw new Error(`${name} has no selectable text. Use an OCR/scanned-PDF version with selectable text, then upload again.`);
  }

  return {
    name,
    text,
  };
}

function buildDatasetPrompt(dataset: PreparedDataset, instructions: string) {
  const instructionBlock = instructions
    ? `\nUSER INSTRUCTIONS:\n${instructions}\n\nApply these only when they do not conflict with grounding, PYQ extraction, or the required 8-section output.\n`
    : "\nUSER INSTRUCTIONS:\nNo extra user instructions provided.\n";

  const pyqStatus = dataset.pyqDetected
    ? dataset.questionLineCount > 0
      ? `PYQ/question-paper evidence detected with ${dataset.questionLineCount} readable question-like lines.`
      : "PYQ/question-paper file was uploaded, but readable question text could not be extracted clearly. Do not pretend PYQ text is available."
    : "No dedicated PYQ/question-paper file was detected. Generate chapter-derived predictions only and label them as chapter-derived.";

  return `You are JustFlamsit AI, an elite exam-focused document intelligence system for students.

Your job is to analyze uploaded chapter PDFs, 100-page notes, PYQs, question papers, handouts, DOCX, and TXT files together and generate a dense, accurate, exam-scoring summary.

You must act like:
- a semester exam strategist
- a PYQ pattern analyzer
- a strict grounded summarizer
- a teacher who knows what students must revise first
- a last-night-before-exam mentor

Use ONLY the uploaded document content.
Do not hallucinate.
Do not add unsupported outside textbook knowledge.
If a detail is not present, say "Not mentioned in the uploaded material."
But before saying that, carefully check all uploaded files, especially PYQ/question-paper files.

Dataset status:
- Uploaded files analyzed: ${dataset.documents.length}
- ${pyqStatus}
- Long-document compression used: ${dataset.chunkingUsed ? "yes" : "no"}

When multiple files are uploaded:
1. Identify chapter/source files.
2. Identify PYQ/question-paper files.
3. Extract key concepts from chapter files.
4. Extract actual questions from PYQ/question-paper files.
5. Match PYQ questions to chapter concepts.
6. Rank topics by importance using repeated concepts, direct PYQ questions, headings, definitions, formulas, examples, diagram mentions, and examiner-style wording.
7. Produce a final answer using EXACTLY the existing 8-section JustFlamsit layout.

Do not reveal internal reasoning.
Do not create new section headings.
Do not change section names.
Do not output generic filler.
Be dense, specific, and practical.

UPLOADED FILE DATASET

${dataset.context}
${instructionBlock}

TASK:
Analyze all uploaded files together. Treat chapter files as source material and PYQ/question-paper files as exam-pattern evidence. Generate the existing JustFlamsit 8-section structured summary only. Make the output dense, accurate, exam-focused, PYQ-mapped, and useful for semester exams.

STRICT FINAL OUTPUT:
Return ONLY valid JSON. Do not wrap it in markdown. Do not add commentary.
Use exactly these 8 keys and no other keys:

{
  "weightageTrendRadar": ["Overall chapter priority: High/Medium/Low | Why: ... | Exam nature: definition-heavy/concept-heavy/formula-heavy/diagram-heavy/numerical-heavy | PYQ trend evidence: ..."],
  "coreHeadlines": ["Topic: ... | Priority: High/Medium/Low | Exam-ready explanation: ... | Key terms to memorize: ... | Likely question wording: ... | Source hint: ... | Why it matters: ..."],
  "multimodalExtractionMatrix": "### Key definition/formula/diagram/table/example\\n* **Core Measurement / Text Data:** ...\\n* **Visual / Diagram Calculation:** ...\\n* **Examiner's Trap:** ...\\n\\n> **The Winning Move:** ...\\n---",
  "pyqProbabilityAnalysis": ["Question: [actual readable PYQ/question line, if present] | Mapped topic: ... | Probability: High/Medium/Low | Type: definition/short answer/long answer/numerical/diagram/comparison | Why it matters: ... | Repeated/similar wording: ... | Answer framework: ..."],
  "hiddenTraps": ["Trap topic: ... | Common mistake: ... | Similar terms to differentiate: ... | Examiner warning: ... | Exact wording to remember: ..."],
  "phoenixGapAnalysis": ["High-risk gap: ... | Evidence: ... | Why it may appear: ... | Revision action: ..."],
  "sprintPracticeQuestions": ["Question: ... | Marks/type: ... | Evaluation guide: ..."],
  "eleventhHourLifeline": ["Bullet 1", "Bullet 2", "Bullet 3", "Bullet 4", "Bullet 5", "Bullet 6", "Bullet 7", "Bullet 8", "Bullet 9", "Bullet 10"]
}

Section rules:
- SECTION 1 content must include overall chapter priority, why assigned, most exam-relevant subtopics, PYQ trend evidence when readable PYQ exists, and whether the chapter is definition-heavy, concept-heavy, formula-heavy, diagram-heavy, or numerical-heavy.
- SECTION 2 must contain only highest-yield topics. Do not use phrases like "Uploaded document concept." Make every point a polished study note.
- SECTION 3 must use vertical Premium List Cards only. Never use a markdown table. Include definitions, formulas, numerical patterns, diagrams/visual topics, tables/classifications, and examples only when present. If absent, write: "No clear formula/diagram evidence was found in extracted text."
- SECTION 4 is most important when PYQ/question paper is uploaded. If readable question text exists, use actual question-like lines and never write "Question: Not mentioned." If PYQ was uploaded but unreadable, write exactly: "PYQ/question-paper file was not readable enough for reliable question extraction." Then create likely chapter-derived questions and label them chapter-derived.
- SECTION 5 must contain real traps from the uploaded chapter content, not generic warnings.
- SECTION 6 must identify chapter topics weak/missing in PYQ, PYQ topics weakly explained in notes, foundational surprise topics, and unreadable/unclear PDF areas. If PYQ data is limited, say: "Frequency-based prediction is limited because only limited readable PYQ content was extracted."
- SECTION 7 must generate practice questions based only on uploaded material, including 2-mark, 5-mark, long-answer, PYQ-style, and diagram/formula/numerical questions when supported.
- SECTION 8 must be an ultra-condensed last-minute rescue sheet with exactly 10 bullets.

Quality gate before final JSON:
1. All 8 keys are present.
2. No extra keys are added.
3. PYQ section does not falsely say PYQ missing when question text exists.
4. Output is not generic.
5. Topic names are clean.
6. Definitions are exam-ready.
7. Section 8 is useful for last-minute revision.
8. Every JSON array contains strings only. No nested objects, arrays, null, or booleans.`;
}

function displayJsonValue(value: unknown): string {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }

  if (Array.isArray(value)) {
    return value
      .map(displayJsonValue)
      .filter(Boolean)
      .join(" | ");
  }

  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([key, item]) => {
        const content = displayJsonValue(item);
        const label = key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").trim();
        return content ? `${label}: ${content}` : "";
      })
      .filter(Boolean)
      .join(" | ");
  }

  return "";
}

function normalizeSection(value: unknown) {
  if (Array.isArray(value)) {
    const items = value.map(displayJsonValue).filter(Boolean);
    return items.length ? items : [fallbackText];
  }

  const item = displayJsonValue(value);
  if (item) {
    return [item];
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

function formatSummary(summary: StructuredSummary) {
  return summarySections
    .map((section) => {
      const { key, label } = section;
      const format = "format" in section ? section.format : undefined;

      if (format === "premium-cards") {
        const cards = displayJsonValue(summary[key]);
        const fallbackCards = [
          "### \uD83E\uDDE9 Key scientific data",
          `* \uD83C\uDFAF **Core Measurement / Text Data:** ${fallbackText}`,
          "* \uD83E\uDDE0 **Visual / Diagram Calculation:** Text-derived concept only.",
          "* \uD83D\uDEA8 **Examiner's Trap:** Do not add measurements or visual labels that are not present in the uploaded material.",
          "",
          "> **\uD83D\uDCA1 The Winning Move:** State only the verified scientific value, its unit, and the condition attached to it.",
          "---",
        ].join("\n");

        return `## ${label}\n${cards.startsWith("###") && !cards.includes("|") ? cards : fallbackCards}`;
      }

      const items = normalizeSection(summary[key]);
      const body = items.map((item) => `- ${item.replace(/\s+/g, " ").trim()}`).join("\n");
      return `## ${label}\n${body}`;
    })
    .join("\n\n");
}

function formatAiSummaryText(text: string) {
  try {
    const parsed = JSON.parse(cleanJsonText(text)) as StructuredSummary;
    const normalizedSummary = summarySections.reduce<StructuredSummary>((accumulator, section) => {
      accumulator[section.key] = parsed[section.key] ?? [fallbackText];
      return accumulator;
    }, {});
    return formatSummary(normalizedSummary);
  } catch {
    return text;
  }
}

function extractUsefulLines(text: string, limit = 12) {
  const seen = new Set<string>();

  return prioritizeDocumentText(text, 18_000)
    .split(/\n{2,}|(?<=[.!?])\s+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => {
      if (line.length < 35 || line.length > 260) return false;
      const key = line.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return /[a-zA-Z]/.test(line);
    })
    .slice(0, limit);
}

function buildGroundedContinuitySummary(dataset: PreparedDataset) {
  const mergedText = dataset.documents.map((document) => document.text).join("\n\n");
  const usefulLines = extractUsefulLines(mergedText, 12);
  const coreLines = usefulLines.slice(0, 6);
  const practiceLines = usefulLines.slice(0, 5);
  const questionLines = dataset.documents.flatMap((document) => document.questionLines).slice(0, 5);

  const structured: StructuredSummary = {
    weightageTrendRadar: [
      `Overall chapter priority: ${dataset.pyqDetected && dataset.questionLineCount > 0 ? "High" : "Medium"} | Why: based on ${dataset.documents.length} uploaded file(s), ${dataset.questionLineCount} readable question-like line(s), and extracted chapter evidence. | Exam nature: revise definitions, repeated terms, diagrams/tables when mentioned, and question-linked concepts first.`,
      dataset.pyqDetected
        ? dataset.questionLineCount > 0
          ? `PYQ trend evidence: ${questionLines.slice(0, 3).join(" | ")}`
          : "PYQ trend evidence: PYQ/question-paper file was uploaded, but readable question text could not be extracted clearly. Upload a clearer/text-based PDF for stronger PYQ probability analysis."
        : "PYQ trend evidence: No dedicated PYQ/question-paper file was detected, so probability is chapter-derived.",
    ],
    coreHeadlines: coreLines.length
      ? coreLines.map((line) => `Topic: ${line.slice(0, 80)} | Priority: High | Exam-ready explanation: ${line} | Key terms to memorize: extract exact terms from this line | Likely question wording: Explain or define this concept. | Why it matters: It appears as readable evidence in the uploaded study material.`)
      : [fallbackText],
    multimodalExtractionMatrix: [
      "### Key extracted evidence",
      `* 🎯 **Core Measurement / Text Data:** ${coreLines[0] || fallbackText}`,
      "* 🧠 **Visual / Diagram Calculation:** Text-derived concept only.",
      "* 🚨 **Examiner's Trap:** Do not invent diagram labels, formulas, or measurements unless they are visible in extracted text.",
      "",
      "> **💡 The Winning Move:** Quote the extracted keyword, then add only the supported explanation from the uploaded material.",
      "---",
    ].join("\n"),
    pyqProbabilityAnalysis: questionLines.length
      ? questionLines.map((line) => `Question: ${line} | Mapped topic: closest matching chapter concept in the uploaded material | Probability: High | Type: question-paper evidence | Why it matters: It was extracted directly as a question-like line. | Answer framework: define key term, explain mechanism/steps, add diagram/formula only if present.`)
      : [
          dataset.pyqDetected
            ? "PYQ/question-paper file was not readable enough for reliable question extraction. Chapter-derived likely question: Explain the most repeated readable concept from the uploaded material. | Probability: Medium | Type: chapter-derived | Answer framework: Use exact uploaded definitions and key terms."
            : "Chapter-derived likely question: Explain the highest-yield readable concept from the uploaded material. | Probability: Medium | Type: chapter-derived | Answer framework: Use exact uploaded definitions and key terms.",
        ],
    hiddenTraps: coreLines.length
      ? coreLines.slice(0, 4).map((line) => `Trap topic: ${line.slice(0, 90)} | Common mistake: writing a broad answer without the exact extracted keyword. | Similar terms to differentiate: compare only terms that appear nearby in uploaded text. | Examiner warning: do not add unsupported textbook facts.`)
      : [fallbackText],
    phoenixGapAnalysis: [
      dataset.questionLineCount > 0
        ? "High-risk gap: Compare extracted PYQ question lines against the chapter concepts above. | Evidence: Some readable questions are present, but frequency clustering was limited by extracted text quality. | Revision action: revise every topic mapped to an extracted question line first."
        : "High-risk gap: Frequency-based prediction is limited because only limited readable PYQ content was extracted. | Evidence: No strong question-line cluster was readable. | Revision action: revise chapter headings, definitions, examples, and diagram/table mentions first.",
    ],
    sprintPracticeQuestions: practiceLines.length
      ? practiceLines.map((line, index) => `Question: ${index + 1 <= 2 ? "2-mark" : index + 1 <= 4 ? "5-mark" : "Long-answer"} practice from uploaded material: ${line} | Evaluation guide: include exact keyword, one direct explanation, and one supported example/step if present.`)
      : [fallbackText],
    eleventhHourLifeline: Array.from({ length: 10 }, (_, index) => {
      const line = usefulLines[index % Math.max(usefulLines.length, 1)];
      return line || fallbackText;
    }),
  };

  return formatSummary(structured);
}

function getGeminiApiKey() {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    ""
  ).trim();
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
    throw new Error("Gemini did not return a summary.");
  }

  return formatAiSummaryText(text);
}

async function summarizeWithGemini(prompt: string) {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    console.log("Gemini summary failed", { message: "GEMINI_API_KEY is missing" });
    throw new AiProviderError("Gemini API key is not configured.");
  }

  console.log("Gemini summary request started");
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 45_000);

  try {
    let lastFailure = "Gemini summarization failed.";

    for (const model of GEMINI_MODELS_TO_TRY) {
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          signal: abortController.signal,
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text:
                    "You are JustFlamsit AI, an exam-focused document intelligence assistant for students. Generate accurate, grounded, structured study outputs from uploaded documents such as chapter notes, PYQs, handouts, PDFs, DOCX, and TXT files. Use only the uploaded document content. Do not hallucinate. If information is not present in the document, write: \"Not mentioned in the document.\" Keep the output useful for semester exams and viva preparation. Preserve the same structured sections currently used by JustFlamsit. Include all sections expected by the existing summary layout. Keep the tone clear, concise, and student-friendly. Make the summary practical for last-minute revision.",
                },
              ],
            },
            contents: [
              {
                role: "user",
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: 0,
              topP: 0.2,
              maxOutputTokens: 8192,
              responseMimeType: "application/json",
            },
          }),
        },
      );

      const data = await geminiResponse.json().catch(() => ({}));

      if (!geminiResponse.ok) {
        lastFailure =
          typeof data?.error?.message === "string"
            ? data.error.message
            : "Gemini summarization failed.";
        console.log("Gemini summary failed", {
          model,
          status: geminiResponse.status,
          message: lastFailure,
        });
        continue;
      }

      const summary = extractGeminiText(data);
      console.log("Gemini summary generated successfully", { model });
      return summary;
    }

    throw new AiProviderError(lastFailure);
  } catch (error) {
    if (error instanceof AiProviderError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : "Gemini summarization failed.";
    console.log("Gemini summary failed", {
      message,
    });
    throw new AiProviderError(message);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function summarizeWithGeminiRetry(documents: ExtractedDocument[], instructions: string) {
  const fullDataset = prepareDataset(documents, MAX_TEXT_CHARS);

  try {
    return await summarizeWithGemini(buildDatasetPrompt(fullDataset, instructions));
  } catch (error) {
    console.log("Gemini summary retrying with compact prompt", {
      message: error instanceof Error ? error.message : "unknown",
    });
    try {
      const compactDataset = prepareDataset(documents, MAX_TEXT_CHARS_RETRY);
      return await summarizeWithGemini(buildDatasetPrompt(compactDataset, instructions));
    } catch (retryError) {
      console.log("Gemini summary continuity response used", {
        message: retryError instanceof Error ? retryError.message : "unknown",
      });
      return buildGroundedContinuitySummary(fullDataset);
    }
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

      documents = uploadedDocuments
        .map((document, index) => {
          try {
            return normalizeUploadedDocument(document, index);
          } catch (error) {
            console.log("Uploaded JSON document skipped after extraction failure", {
              name: document.name || `uploaded-document-${index + 1}`,
              message: error instanceof Error ? error.message : "unknown",
            });
            return null;
          }
        })
        .filter((document): document is ExtractedDocument => document !== null);
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

      const extractionResults = await Promise.allSettled(files.map(extractDocumentText));
      documents = extractionResults
        .map((result, index) => {
          if (result.status === "fulfilled") return result.value;

          console.log("Uploaded file skipped after extraction failure", {
            name: files[index]?.name || `uploaded-file-${index + 1}`,
            message: result.reason instanceof Error ? result.reason.message : "unknown",
          });
          return null;
        })
        .filter((document): document is ExtractedDocument => document !== null);
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
      summary = await summarizeWithGeminiRetry(availableDocuments, instructions);
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
    const message = error instanceof AiProviderError ? SUMMARY_ERROR_MESSAGE : error instanceof Error ? error.message : "Something went wrong while summarizing.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
