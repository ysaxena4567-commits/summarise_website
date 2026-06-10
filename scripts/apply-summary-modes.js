const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content, "utf8");
}

function replaceOnce(content, from, to, label) {
  if (!content.includes(from)) {
    throw new Error(`Unable to apply summary mode patch: ${label}`);
  }

  return content.replace(from, to);
}

function patchPage() {
  const file = "src/app/page.tsx";
  let content = read(file);

  if (!content.includes("const summaryModes = [")) {
    content = replaceOnce(
      content,
      `const faqs = [
  ["Which auth system does JustFlamsit use?", "JustFlamsit uses Clerk for sign-in, sign-up, email verification, Google login, sessions, and user identity."],
  ["Can I use the first free summary without signing in?", "The app keeps the first flow simple, but saving usage, payments, history, and account data requires a verified Clerk email."],
  ["Are uploaded documents stored?", "No. Files are sent only for summary generation and are not stored as account history content."],
];
`,
      `const faqs = [
  ["Which auth system does JustFlamsit use?", "JustFlamsit uses Clerk for sign-in, sign-up, email verification, Google login, sessions, and user identity."],
  ["Can I use the first free summary without signing in?", "The app keeps the first flow simple, but saving usage, payments, history, and account data requires a verified Clerk email."],
  ["Are uploaded documents stored?", "No. Files are sent only for summary generation and are not stored as account history content."],
];

const summaryModes = [
  {
    id: "backlog-killer",
    icon: "📚",
    label: "Backlog Killer",
    resultLabel: "Backlog Killer Mode",
    description: "Exam-focused revision, important concepts, and last-night study notes.",
  },
  {
    id: "medical",
    icon: "🩺",
    label: "Medical",
    resultLabel: "Medical Mode",
    description: "High-yield medical notes, diseases, drugs, and clinical pearls.",
  },
  {
    id: "research",
    icon: "🔬",
    label: "Research",
    resultLabel: "Research Mode",
    description: "Academic paper breakdown with objective, methods, findings, and limitations.",
  },
  {
    id: "professional",
    icon: "💼",
    label: "Professional",
    resultLabel: "Professional Mode",
    description: "Business-ready summary with risks, dates, people, and action items.",
  },
] as const;

type SummaryModeId = (typeof summaryModes)[number]["id"];

const defaultSummaryMode: SummaryModeId = "backlog-killer";

function getSummaryModeLabel(modeId: SummaryModeId) {
  return summaryModes.find((mode) => mode.id === modeId)?.resultLabel || "Backlog Killer Mode";
}
`,
      "page mode config",
    );
  }

  if (!content.includes("selectedMode?: string;")) {
    content = replaceOnce(
      content,
      `type SummarizeResponse = {
  summary?: string;
  error?: string;`,
      `type SummarizeResponse = {
  summary?: string;
  selectedMode?: string;
  error?: string;`,
      "page response type",
    );
  }

  if (!content.includes("const [selectedMode, setSelectedMode]")) {
    content = replaceOnce(
      content,
      `  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const [instructions, setInstructions] = useState("");`,
      `  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const [instructions, setInstructions] = useState("");
  const [selectedMode, setSelectedMode] = useState<SummaryModeId>(defaultSummaryMode);
  const [generatedModeLabel, setGeneratedModeLabel] = useState<string>(getSummaryModeLabel(defaultSummaryMode));`,
      "page mode state",
    );
  }

  if (!content.includes(`formData.append("selectedMode", selectedMode);`)) {
    content = replaceOnce(
      content,
      `      uploadedFiles.forEach(({ file }) => formData.append("files", file));
      formData.append("instructions", instructions.trim());`,
      `      uploadedFiles.forEach(({ file }) => formData.append("files", file));
      formData.append("instructions", instructions.trim());
      formData.append("selectedMode", selectedMode);`,
      "page request payload",
    );
  }

  if (!content.includes("setGeneratedModeLabel(data.selectedMode")) {
    content = replaceOnce(
      content,
      `      setSummary(data.summary);
      if (data.usage) {`,
      `      setSummary(data.summary);
      setGeneratedModeLabel(data.selectedMode || getSummaryModeLabel(selectedMode));
      if (data.usage) {`,
      "page generated mode label",
    );
  }

  if (!content.includes("Choose one AI mode before generating.")) {
    content = replaceOnce(
      content,
      `            <button type="button" onClick={summarizeFiles} disabled={isLoading || isUsageSyncing} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#c5b358] px-5 text-sm font-semibold text-[#28282b] transition hover:bg-[#dbc966] disabled:cursor-not-allowed disabled:opacity-70">`,
      `            <div className="mt-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Summary mode</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">Choose one AI mode before generating.</p>
                </div>
                <span className="w-fit rounded-md border border-[#c5b358]/30 bg-[#c5b358]/10 px-2.5 py-1 text-xs font-semibold text-[#f2e7a5]">
                  {getSummaryModeLabel(selectedMode)}
                </span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {summaryModes.map((mode) => {
                  const isSelected = selectedMode === mode.id;

                  return (
                    <button
                      key={mode.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setSelectedMode(mode.id)}
                      className={\`min-h-24 rounded-xl border p-3 text-left transition \${
                        isSelected
                          ? "border-[#c5b358] bg-[#c5b358]/10 shadow-[0_0_28px_rgba(197,179,88,0.18)]"
                          : "border-white/10 bg-white/[0.035] hover:border-[#c5b358]/50 hover:bg-white/[0.05]"
                      }\`}
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold text-white">
                        <span className="text-lg leading-none" aria-hidden="true">{mode.icon}</span>
                        {mode.label}
                      </span>
                      <span className="mt-2 block text-xs leading-5 text-zinc-400">{mode.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button type="button" onClick={summarizeFiles} disabled={isLoading || isUsageSyncing} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#c5b358] px-5 text-sm font-semibold text-[#28282b] transition hover:bg-[#dbc966] disabled:cursor-not-allowed disabled:opacity-70">`,
      "page mode selector",
    );
  }

  if (!content.includes("Structured output tailored to your selected mode.")) {
    content = replaceOnce(
      content,
      `                  <p className="text-sm font-semibold text-white">AI Summary Output</p>
                  <p className="mt-1 text-xs text-zinc-500">Executive summary, key points, action items, and risks.</p>`,
      `                  <p className="text-sm font-semibold text-white">{summary ? \`Generated with \${generatedModeLabel}\` : "AI Summary Output"}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {summary ? "Structured output tailored to your selected mode." : "Choose a mode, upload files, and generate a grounded summary."}
                  </p>`,
      "page output heading",
    );
  }

  write(file, content);
}

function patchRoute() {
  const file = "src/app/api/summarize/route.ts";
  let content = read(file);

  if (!content.includes("const summaryModes = [")) {
    content = replaceOnce(
      content,
      `type GeminiSummary = {
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
`,
      `type GeminiSummary = Record<string, string[] | string | undefined>;

type SummarySection = {
  key: string;
  label: string;
};

type SummaryMode = {
  id: string;
  label: string;
  instruction: string;
  sections: SummarySection[];
};

const fallbackText = "Not found in this document";

const summaryModes = [
  {
    id: "backlog-killer",
    label: "Backlog Killer Mode",
    instruction:
      "Analyze this study material for exam-focused revision, important concepts, and last-night study notes. Keep the language student-friendly and practical.",
    sections: [
      { key: "topConcepts", label: "Top 20% Concepts Responsible For Most Marks" },
      { key: "importantQuestions", label: "Most Important Questions" },
      { key: "revisionNotes", label: "Night-Before-Exam Revision Notes" },
      { key: "mustMemorizeFacts", label: "Must Memorize Facts" },
      { key: "fiveMinuteRevisionSheet", label: "5-Minute Revision Sheet" },
    ],
  },
  {
    id: "medical",
    label: "Medical Mode",
    instruction:
      "Analyze this medical document for high-yield medical notes, diseases, drugs, and clinical pearls. Keep the language student-friendly and exam-focused.",
    sections: [
      { key: "highYieldConcepts", label: "High-Yield Concepts" },
      { key: "diseasesMentioned", label: "Diseases Mentioned" },
      { key: "importantDrugs", label: "Important Drugs" },
      { key: "clinicalPearls", label: "Clinical Pearls" },
      { key: "examFocusedNotes", label: "Exam-Focused Notes" },
      { key: "rapidRevisionSheet", label: "Rapid Revision Sheet" },
    ],
  },
  {
    id: "research",
    label: "Research Mode",
    instruction:
      "Analyze this academic paper with a formal research-paper breakdown. Focus on objective, methods, findings, limitations, and future scope.",
    sections: [
      { key: "researchObjective", label: "Research Objective" },
      { key: "methodology", label: "Methodology" },
      { key: "keyFindings", label: "Key Findings" },
      { key: "limitations", label: "Limitations" },
      { key: "futureScope", label: "Future Scope" },
      { key: "executiveSummary", label: "Executive Summary" },
    ],
  },
  {
    id: "professional",
    label: "Professional Mode",
    instruction:
      "Analyze this document for a business-ready summary. Keep the language formal, concise, and action-oriented.",
    sections: [
      { key: "executiveSummary", label: "Executive Summary" },
      { key: "keyPeople", label: "Key People" },
      { key: "importantDates", label: "Important Dates" },
      { key: "risks", label: "Risks" },
      { key: "actionItems", label: "Action Items" },
      { key: "decisionsRequired", label: "Decisions Required" },
    ],
  },
] satisfies SummaryMode[];

const defaultSummaryMode = summaryModes[0];
`,
      "route mode config",
    );
  }

  if (!content.includes("function normalizeSelectedMode")) {
    content = replaceOnce(
      content,
      `function buildPrompt(documents: ExtractedDocument[], instructions: string) {`,
      `function normalizeSelectedMode(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return defaultSummaryMode;

  return summaryModes.find((mode) => mode.id === value.trim()) || defaultSummaryMode;
}

function buildPrompt(documents: ExtractedDocument[], instructions: string, mode: SummaryMode) {`,
      "route selected mode normalizer",
    );
  }

  if (!content.includes("Selected summary mode: ${mode.label}")) {
    content = replaceOnce(
      content,
      `  return \`You are JustFlamsit, an AI document summarization assistant.

CRITICAL RULES:`,
      `  const jsonShape = mode.sections
    .map((section) => \`  "\${section.key}": ["..."]\`)
    .join(",\\n");
  const requiredSections = mode.sections.map((section) => \`- \${section.label}\`).join("\\n");

  return \`You are JustFlamsit, an AI document summarization assistant.

Selected summary mode: \${mode.label}
Mode-specific behavior:
\${mode.instruction}

CRITICAL RULES:`,
      "route prompt intro",
    );

    content = content
      .replace("- If a category has no relevant information, return exactly: Not Mentioned In Document", "- If a category has no relevant information, return exactly: ${fallbackText}")
      .replace("- If multiple files are uploaded, combine overlapping information only when the documents support it.", `- If multiple files are uploaded, combine overlapping information only when the documents support it.
- Keep the response structured with clear headings once formatted.
- Use bullet-point style strings inside each JSON array.
- Make the output practical and useful for the selected user type.`);

    content = replaceOnce(
      content,
      `Return ONLY valid JSON. Do not wrap it in markdown. Do not add commentary.
The JSON must match this exact shape:
{
  "executiveSummary": ["..."],
  "keyPoints": ["..."],
  "importantDates": ["..."],
  "importantPeople": ["..."],
  "actionItems": ["..."],
  "risks": ["..."]
}

Each array should contain detailed bullet-style strings. If a section has no information, use ["Not Mentioned In Document"].`,
      `Return ONLY valid JSON. Do not wrap it in markdown. Do not add commentary.
The JSON must match this exact shape and include these sections:
\${requiredSections}

{
\${jsonShape}
}

Each array should contain detailed bullet-style strings. If a section has no information, use ["\${fallbackText}"].`,
      "route prompt shape",
    );
  }

  content = content.replaceAll('["Not Mentioned In Document"]', "[fallbackText]");
  content = content.replaceAll('return ["Not Mentioned In Document"];', "return [fallbackText];");

  if (content.includes("function formatSummary(summary: GeminiSummary)")) {
    content = replaceOnce(
      content,
      `function formatSummary(summary: GeminiSummary) {
  return sectionLabels
    .map(([key, label]) => {
      const items = normalizeSection(summary[key]);
      const body = items.map((item) => \`- \${item.replace(/\\s+/g, " ").trim()}\`).join("\\n");
      return \`## \${label}\\n\${body}\`;
    })
    .join("\\n\\n");
}

function extractGeminiText(response: unknown) {`,
      `function formatSummary(summary: GeminiSummary, mode: SummaryMode) {
  return mode.sections
    .map(({ key, label }) => {
      const items = normalizeSection(summary[key]);
      const body = items.map((item) => \`- \${item.replace(/\\s+/g, " ").trim()}\`).join("\\n");
      return \`## \${label}\\n\${body}\`;
    })
    .join("\\n\\n");
}

function extractGeminiText(response: unknown, mode: SummaryMode) {`,
      "route formatter",
    );
  }

  if (content.includes("const parsed = JSON.parse(cleanJsonText(text)) as Partial<GeminiSummary>;")) {
    content = replaceOnce(
      content,
      `    const parsed = JSON.parse(cleanJsonText(text)) as Partial<GeminiSummary>;
    return formatSummary({
      executiveSummary: parsed.executiveSummary ?? [fallbackText],
      keyPoints: parsed.keyPoints ?? [fallbackText],
      importantDates: parsed.importantDates ?? [fallbackText],
      importantPeople: parsed.importantPeople ?? [fallbackText],
      actionItems: parsed.actionItems ?? [fallbackText],
      risks: parsed.risks ?? [fallbackText],
    });`,
      `    const parsed = JSON.parse(cleanJsonText(text)) as GeminiSummary;
    const normalizedSummary = mode.sections.reduce<GeminiSummary>((accumulator, section) => {
      accumulator[section.key] = parsed[section.key] ?? [fallbackText];
      return accumulator;
    }, {});
    return formatSummary(normalizedSummary, mode);`,
      "route parser",
    );
  }

  if (!content.includes("const selectedMode = normalizeSelectedMode")) {
    content = replaceOnce(
      content,
      `    const formData = await request.formData();
    const instructions = normalizeInstructions(formData.get("instructions"));`,
      `    const formData = await request.formData();
    const instructions = normalizeInstructions(formData.get("instructions"));
    const selectedMode = normalizeSelectedMode(formData.get("selectedMode"));`,
      "route selected mode form",
    );
  }

  content = content.replace("const prompt = buildPrompt(availableDocuments, instructions);", "const prompt = buildPrompt(availableDocuments, instructions, selectedMode);");
  content = content.replace("summary = extractGeminiText(data);", "summary = extractGeminiText(data, selectedMode);");

  if (!content.includes("selectedMode: selectedMode.label")) {
    content = content.replace(
      `        instructionLength: instructions.length,
      });`,
      `        instructionLength: instructions.length,
        selectedMode: selectedMode.label,
      });`,
    );
    content = content.replace(
      `    return NextResponse.json({
      summary,`,
      `    return NextResponse.json({
      summary,
      selectedMode: selectedMode.label,`,
    );
  }

  write(file, content);
}

function patchServerUsage() {
  const file = "src/lib/serverUsage.ts";
  let content = read(file);

  if (!content.includes("selectedMode?: string;")) {
    content = replaceOnce(
      content,
      `  totalCharacters: number;
  instructionLength: number;`,
      `  totalCharacters: number;
  instructionLength: number;
  selectedMode?: string;`,
      "summary metadata selected mode",
    );
  }

  write(file, content);
}

patchPage();
patchRoute();
patchServerUsage();
console.log("Applied JustFlamsit summary mode source patches.");
