const fs = require("fs");
const path = require("path");

const pagePath = path.join(__dirname, "..", "src", "app", "page.tsx");

function replaceOnce(content, from, to, label) {
  if (!content.includes(from)) {
    throw new Error(`Unable to apply footer social patch: ${label}`);
  }

  return content.replace(from, to);
}

let content = fs.readFileSync(pagePath, "utf8");

if (!content.includes("const socialLinks = [")) {
  content = replaceOnce(
    content,
    `] as const;

type SummaryModeId = (typeof summaryModes)[number]["id"];`,
    `] as const;

const socialLinks = [
  { label: "X / Twitter", href: "https://x.com/justflamsit", mark: "X" },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/justflamsit", mark: "in" },
  { label: "Reddit", href: "https://www.reddit.com/user/justflamsit", mark: "r" },
  { label: "GitHub", href: "https://github.com/ysaxena4567-commits/summarise_website", mark: "GH" },
  { label: "Instagram", href: "https://www.instagram.com/justflamsit", mark: "IG" },
] as const;

type SummaryModeId = (typeof summaryModes)[number]["id"];`,
    "social link config",
  );
}

if (!content.includes("Follow JustFlamsit on")) {
  content = replaceOnce(
    content,
    `          <a href="mailto:support@justflamsit.com" className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:border-[#c5b358]/60 hover:text-white">
            <Mail size={17} className="text-[#c5b358]" />
            support@justflamsit.com
          </a>`,
    `          <div className="flex flex-col items-start gap-4 sm:items-end">
            <a href="mailto:support@justflamsit.com" className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:border-[#c5b358]/60 hover:text-white">
              <Mail size={17} className="text-[#c5b358]" />
              support@justflamsit.com
            </a>
            <div className="flex flex-col gap-2 sm:items-end">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#f2e7a5]">Follow us</p>
              <div className="flex flex-wrap gap-2">
                {socialLinks.map(({ label, href, mark }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={\`Follow JustFlamsit on \${label}\`}
                    className="grid size-10 place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-zinc-300 transition hover:scale-105 hover:border-[#c5b358]/60 hover:text-[#c5b358]"
                  >
                    <span className="text-xs font-bold leading-none">{mark}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>`,
    "footer social block",
  );
}

fs.writeFileSync(pagePath, content, "utf8");
console.log("Applied JustFlamsit footer social links patch.");
