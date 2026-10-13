#!/usr/bin/env node
// AL STORE V7 — Phase 00 verification (no dependencies).
// Usage:
//   node scripts/verify-phase-00.mjs          -> docs, cross-references, forbidden terms, secrets, .env ignore
//   node scripts/verify-phase-00.mjs --scope  -> additionally asserts that no application/business code exists yet
// Exit code 0 = all checks passed, 1 = at least one check failed.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const strictScope = process.argv.includes("--scope");
const failures = [];
const notes = [];
const ok = (msg) => console.log(`  ok   ${msg}`);
const fail = (msg) => {
  failures.push(msg);
  console.log(`  FAIL ${msg}`);
};

// 1. Required documents ------------------------------------------------------
const requiredDocs = [
  "SCOPE.md",
  "DOMAIN_MODEL.md",
  "ROLE_PERMISSION_MATRIX.md",
  "DATABASE_TRANSACTION_BOUNDARIES.md",
  "INVENTORY_INVARIANTS.md",
  "FINANCIAL_DOCUMENT_STATES.md",
  "LEGACY_CUTOVER_PLAN.md",
  "VAT_COMPLIANCE_GATES.md",
  "THREAT_MODEL.md",
  "ADR_001_TECH_STACK.md",
  "PHASE_DEPENDENCIES.md",
  "RELEASE_GATES.md",
  "OPEN_LEGAL_DECISIONS.md",
  "ARCHITECTURE_LOCK.md",
  "PHASE_00.md",
];
console.log("1. Required documents");
for (const d of requiredDocs) {
  const p = join(root, "docs", d);
  if (!existsSync(p)) fail(`missing docs/${d}`);
  else if (statSync(p).size < 500) fail(`docs/${d} is suspiciously small`);
  else ok(`docs/${d}`);
}

// File list: tracked + untracked-but-not-ignored ------------------------------
let files = [];
try {
  files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean)
    .filter(
      (f) =>
        !f.startsWith("node_modules/") &&
        existsSync(join(root, f)) &&
        statSync(join(root, f)).isFile(),
    );
} catch {
  fail("git ls-files failed (run from the repository root)");
}
// Every git-visible file that is not binary (NUL byte in the first 8 KB) is scanned — no extension allowlist.
const isUtf16 = (b) =>
  b.length >= 2 && ((b[0] === 0xff && b[1] === 0xfe) || (b[0] === 0xfe && b[1] === 0xff));
const isText = (f) => {
  const b = readFileSync(join(root, f));
  return isUtf16(b) || !b.subarray(0, 8192).includes(0);
};
const textFiles = files.filter(isText);
const read = (f) => {
  const b = readFileSync(join(root, f));
  if (b.length >= 2 && b[0] === 0xff && b[1] === 0xfe) return b.subarray(2).toString("utf16le");
  if (b.length >= 2 && b[0] === 0xfe && b[1] === 0xff) {
    const c = Buffer.from(b.subarray(2));
    c.swap16();
    return c.toString("utf16le");
  }
  return b.toString("utf8");
};

// 2. Cross-references between docs --------------------------------------------
console.log("2. Cross-references (every referenced ID is defined in a table row)");
const docText = requiredDocs
  .filter((d) => existsSync(join(root, "docs", d)))
  .map((d) => read(join("docs", d)))
  .join("\n");
const families = ["VG", "OLD", "OWN", "RG", "PG", "CMD", "INV", "T", "P", "C", "F", "SOD"];
for (const fam of families) {
  const defined = new Set(
    [...docText.matchAll(new RegExp(`^\\|\\s*(${fam}-\\d+)\\s*\\|`, "gm"))].map((m) => m[1]),
  );
  const referenced = new Set(
    [...docText.matchAll(new RegExp(`(?<![A-Za-z0-9-])(${fam}-\\d+)(?![0-9A-Za-z])`, "g"))].map(
      (m) => m[1],
    ),
  );
  const undefinedRefs = [...referenced].filter((r) => !defined.has(r));
  if (undefinedRefs.length)
    fail(`${fam}: referenced but not defined -> ${undefinedRefs.sort().join(", ")}`);
  else ok(`${fam}: ${defined.size} defined, ${referenced.size} referenced`);
}

// 3. Forbidden scope terms (spec A.2 bans the legacy secondary-location name everywhere) ----------
console.log("3. Forbidden terms");
const governing = new Set([
  "AL_STORE_V7_CURSOR_MASTER_PROMPTS.md",
  "rules.md",
  "scripts/verify-phase-00.mjs",
]);
const forbidden = [
  {
    name: "banned secondary stock location (spec A.2)",
    re: new RegExp(["dep", "o[\\s_-]*", "ba", "bi"].join(""), "i"),
  },
];
for (const { name, re } of forbidden) {
  const hits = textFiles.filter((f) => !governing.has(f) && re.test(read(f)));
  if (hits.length) fail(`${name} found in: ${hits.join(", ")}`);
  else ok(`${name}: absent`);
}

// 4. Secrets ------------------------------------------------------------------
console.log("4. Secret patterns in tracked/untracked (non-ignored) files");
const secretPatterns = [
  { name: "Supabase secret key", re: /sb_secret_[A-Za-z0-9_-]{10,}/ },
  { name: "Supabase access token", re: /sbp_[A-Za-z0-9]{20,}/ },
  { name: "JWT-like token", re: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  { name: "Postgres URL with password", re: /postgres(?:ql)?:\/\/[^:\s/]+:[^@\s]{3,}@/ },
  {
    name: "Assigned secret env value",
    re: /^(SUPABASE_SECRET_KEY|DATABASE_URL|DATABASE_MIGRATION_URL|SENTRY_AUTH_TOKEN)=\S+/m,
  },
];
for (const { name, re } of secretPatterns) {
  const hits = textFiles.filter((f) => f !== "scripts/verify-phase-00.mjs" && re.test(read(f)));
  if (hits.length) fail(`${name} in: ${hits.join(", ")}`);
  else ok(`${name}: none`);
}

// 5. .env must be ignored and never tracked -----------------------------------------
console.log("5. Environment file hygiene");
try {
  execFileSync("git", ["check-ignore", "-q", ".env"]);
  ok(".env is gitignored");
} catch {
  fail(".env is NOT gitignored");
}
const trackedEnv = files.filter((f) => /(^|\/)\.env(\.|$)/.test(f) && !f.endsWith(".env.example"));
if (trackedEnv.length) fail(`env files visible to git: ${trackedEnv.join(", ")}`);
else ok("no env files visible to git except .env.example");

// 5b. Architecture lock must mirror rules.md verbatim (rules.md §11) -------------
console.log("5b. Architecture lock drift");
try {
  const lockBody = read("docs/ARCHITECTURE_LOCK.md").split("\n").slice(8).join("\n");
  if (lockBody === read("rules.md")) ok("docs/ARCHITECTURE_LOCK.md body is identical to rules.md");
  else
    fail(
      "docs/ARCHITECTURE_LOCK.md body differs from rules.md (update both together, owner-approved)",
    );
} catch {
  fail("cannot compare docs/ARCHITECTURE_LOCK.md with rules.md");
}

// 6. Scope: no application / business code in Phase 00 ------------------------
if (strictScope) {
  console.log(
    "6. Phase 00 scope (allowlist: docs, verify script, root config/instruction files, agent guidance)",
  );
  const allowed = [
    /^docs\/[^/]+\.md$/,
    /^scripts\/verify-phase-00\.mjs$/,
    /^scripts\/qa\/[^/]+\.sh$/,
    /^\.agents\/skills\/.+\.md$/,
    /^\.cursor\/rules\/[^/]+\.mdc$/,
    /^(README\.md|CLAUDE\.md|rules\.md|AL_STORE_V7_CURSOR_MASTER_PROMPTS\.md|package\.json|package-lock\.json|\.gitignore|\.env\.example|\.nvmrc|\.editorconfig)$/,
  ];
  const outside = files.filter((f) => !allowed.some((re) => re.test(f)));
  if (outside.length)
    fail(`files outside the Phase 00 allowlist: ${outside.slice(0, 10).join(", ")}`);
  else ok("only Phase 00 documentation/scaffold files present");
  try {
    const pkg = JSON.parse(read("package.json"));
    const deps = [
      "dependencies",
      "devDependencies",
      "optionalDependencies",
      "peerDependencies",
    ].flatMap((k) => Object.keys(pkg[k] ?? {}));
    if (deps.length) fail(`package.json declares dependencies in Phase 00: ${deps.join(", ")}`);
    else ok("package.json declares no dependencies");
  } catch {
    fail("package.json missing or invalid");
  }
} else {
  notes.push("scope check skipped (run with --scope for Phase 00 QA)");
}

console.log("");
for (const n of notes) console.log(`note: ${n}`);
if (failures.length) {
  console.log(`RESULT: FAIL (${failures.length} problem(s))`);
  process.exit(1);
}
console.log("RESULT: PASS");
