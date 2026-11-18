#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const uiDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "components/ui");

const HTML = {
  div: ["HTMLDivElement", "HTMLAttributes<HTMLDivElement>"],
  span: ["HTMLSpanElement", "HTMLAttributes<HTMLSpanElement>"],
  p: ["HTMLParagraphElement", "HTMLAttributes<HTMLParagraphElement>"],
  h1: ["HTMLHeadingElement", "HTMLAttributes<HTMLHeadingElement>"],
  h2: ["HTMLHeadingElement", "HTMLAttributes<HTMLHeadingElement>"],
  h3: ["HTMLHeadingElement", "HTMLAttributes<HTMLHeadingElement>"],
  h4: ["HTMLHeadingElement", "HTMLAttributes<HTMLHeadingElement>"],
  button: ["HTMLButtonElement", "ButtonHTMLAttributes<HTMLButtonElement>"],
  input: ["HTMLInputElement", "InputHTMLAttributes<HTMLInputElement>"],
  textarea: ["HTMLTextAreaElement", "TextareaHTMLAttributes<HTMLTextAreaElement>"],
  table: ["HTMLTableElement", "TableHTMLAttributes<HTMLTableElement>"],
  thead: ["HTMLTableSectionElement", "HTMLAttributes<HTMLTableSectionElement>"],
  tbody: ["HTMLTableSectionElement", "HTMLAttributes<HTMLTableSectionElement>"],
  tfoot: ["HTMLTableSectionElement", "HTMLAttributes<HTMLTableSectionElement>"],
  tr: ["HTMLTableRowElement", "HTMLAttributes<HTMLTableRowElement>"],
  th: ["HTMLTableCellElement", "ThHTMLAttributes<HTMLTableCellElement>"],
  td: ["HTMLTableCellElement", "TdHTMLAttributes<HTMLTableCellElement>"],
  caption: ["HTMLTableCaptionElement", "HTMLAttributes<HTMLTableCaptionElement>"],
  ul: ["HTMLUListElement", "HTMLAttributes<HTMLUListElement>"],
  ol: ["HTMLOListElement", "HTMLAttributes<HTMLOListElement>"],
  li: ["HTMLLIElement", "LiHTMLAttributes<HTMLLIElement>"],
  nav: ["HTMLElement", "HTMLAttributes<HTMLElement>"],
  a: ["HTMLAnchorElement", "AnchorHTMLAttributes<HTMLAnchorElement>"],
  form: ["HTMLFormElement", "FormHTMLAttributes<HTMLFormElement>"],
};

function inferFromSnippet(snippet) {
  const refLine = snippet.match(
    /<([A-Za-z][\w]*Primitives?)\.([A-Za-z][\w]*)[\s\S]{0,600}?ref=\{ref\}/
  );
  if (refLine) {
    const [, mod, comp] = refLine;
    return {
      ref: `React.ElementRef<typeof ${mod}.${comp}>`,
      props: `React.ComponentPropsWithoutRef<typeof ${mod}.${comp}>`,
    };
  }
  const htmlRef = snippet.match(
    /<\s*(div|span|p|h[1-4]|button|input|textarea|table|thead|tbody|tfoot|tr|th|td|caption|ul|ol|li|nav|a|form)\b[\s\S]{0,400}?ref=\{ref\}/
  );
  if (htmlRef) {
    const tag = htmlRef[1];
    const [refEl, props] = HTML[tag];
    return { ref: refEl, props: `React.${props}` };
  }
  return null;
}

function patchContent(content) {
  const needle = "React.forwardRef";
  let out = "";
  let pos = 0;
  while (pos < content.length) {
    const idx = content.indexOf(needle, pos);
    if (idx === -1) {
      out += content.slice(pos);
      break;
    }
    out += content.slice(pos, idx);
    if (content.startsWith("React.forwardRef<", idx)) {
      out += needle;
      pos = idx + needle.length;
      continue;
    }
    const open = idx + needle.length;
    if (content[open] !== "(") {
      out += needle;
      pos = idx + needle.length;
      continue;
    }
    const types = inferFromSnippet(content.slice(open, open + 4000));
    if (!types) {
      out += needle;
      pos = idx + needle.length;
      continue;
    }
    out += `React.forwardRef<\n  ${types.ref},\n  ${types.props}\n>(`;
    pos = open + 1;
  }
  return out;
}

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (ent.name.endsWith(".tsx")) {
      const before = fs.readFileSync(p, "utf8");
      const after = patchContent(before);
      if (after !== before) fs.writeFileSync(p, after);
    }
  }
}

walk(uiDir);
console.log("patch-forward-ref done");