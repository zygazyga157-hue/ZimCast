/**
 * Generates missing barrel .d.ts files for @base-ui/react.
 * The installed package ships individual component type declarations
 * but is missing the barrel index.d.ts files that TypeScript needs
 * when resolving subpath imports via the package.json exports map.
 *
 * Run: node scripts/fix-base-ui-types.js
 */
const fs = require("fs");
const path = require("path");

const base = path.join(
  __dirname,
  "..",
  "node_modules",
  "@base-ui",
  "react",
  "esm"
);

function writeIfMissing(filePath, content) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log("  Created", path.relative(base, filePath));
  }
}

// For each subpath module, mirror the index.js (and index.parts.js) as .d.ts
const modules = [
  "avatar",
  "button",
  "dialog",
  "input",
  "menu",
  "merge-props",
  "separator",
  "use-render",
  "label",
];

let created = 0;
for (const mod of modules) {
  const dir = path.join(base, mod);
  if (!fs.existsSync(dir)) continue;

  // index.parts.js → index.parts.d.ts
  const partsJs = path.join(dir, "index.parts.js");
  if (fs.existsSync(partsJs)) {
    const partsDts = path.join(dir, "index.parts.d.ts");
    if (!fs.existsSync(partsDts)) {
      // Copy content — TS resolves .js → .d.ts automatically
      fs.copyFileSync(partsJs, partsDts);
      console.log("  Created", path.relative(base, partsDts));
      created++;
    }
  }

  // index.js → index.d.ts
  const indexJs = path.join(dir, "index.js");
  const indexDts = path.join(dir, "index.d.ts");
  if (fs.existsSync(indexJs) && !fs.existsSync(indexDts)) {
    fs.copyFileSync(indexJs, indexDts);
    console.log("  Created", path.relative(base, indexDts));
    created++;
  }
}

console.log(
  created > 0
    ? `Fixed ${created} missing barrel .d.ts files.`
    : "All barrel .d.ts files already exist."
);
