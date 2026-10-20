// Verifies that every locale catalogue has exactly the same message keys and
// ICU placeholders as the reference catalogue (Albanian). Run: npm run check:messages
import { readFile } from "node:fs/promises";

const MESSAGES_DIR = new URL("../src/messages/", import.meta.url);
const REFERENCE = "sq";
const LOCALES = ["sq", "en"];

async function load(locale) {
  return JSON.parse(await readFile(new URL(`${locale}.json`, MESSAGES_DIR), "utf8"));
}

/** Flattens a catalogue to a Map of "Namespace.key" -> sorted placeholder/tag list. */
function flatten(node, prefix = "", out = new Map()) {
  for (const [key, value] of Object.entries(node)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object") {
      flatten(value, path, out);
    } else {
      const tokens = new Set();
      for (const match of String(value).matchAll(/\{(\w+)|<(\w+)>/g)) {
        tokens.add(match[1] ?? `<${match[2]}>`);
      }
      out.set(path, [...tokens].sort().join(","));
    }
  }
  return out;
}

const reference = flatten(await load(REFERENCE));
const problems = [];

for (const locale of LOCALES.filter((l) => l !== REFERENCE)) {
  const catalogue = flatten(await load(locale));
  for (const [key, tokens] of reference) {
    if (!catalogue.has(key)) problems.push(`${locale}: missing key ${key}`);
    else if (catalogue.get(key) !== tokens)
      problems.push(
        `${locale}: placeholders differ for ${key} (${catalogue.get(key)} vs ${tokens})`,
      );
  }
  for (const key of catalogue.keys()) {
    if (!reference.has(key)) problems.push(`${locale}: extra key ${key} not in ${REFERENCE}.json`);
  }
}

if (problems.length > 0) {
  console.error(`Message catalogues are out of sync:\n- ${problems.join("\n- ")}`);
  process.exit(1);
}

console.log(`Message catalogues in sync (${reference.size} keys × ${LOCALES.length} locales).`);
