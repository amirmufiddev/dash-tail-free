import { toc } from "mdast-util-toc";
import { remark } from "remark";
import type { Node } from "unist";
import { visit } from "unist-util-visit";

const textTypes = ["text", "emphasis", "strong", "inlineCode"];

interface MdNode extends Node {
  value?: string;
  url?: string;
  children?: MdNode[];
}

interface TocItem {
  title?: string;
  url?: string;
  items?: TocItem[];
}

function flattenNode(node: Node) {
  const parts: string[] = [];
  visit(node, (current: MdNode) => {
    if (!textTypes.includes(current.type) || typeof current.value !== "string") return;
    parts.push(current.value);
  });
  return parts.join("");
}

function getItems(node: MdNode | undefined, current: TocItem): TocItem {
  if (!node) {
    return {};
  }

  if (node.type === "paragraph") {
    visit(node, (item: MdNode) => {
      if (item.type === "link") {
        current.url = item.url;
        current.title = flattenNode(node);
      }

      if (item.type === "text") {
        current.title = flattenNode(node);
      }
    });

    return current;
  }

  if (node.type === "list") {
    current.items = (node.children ?? []).map((child) => getItems(child, {}));
    return current;
  }

  if (node.type === "listItem") {
    const heading = getItems(node.children?.[0], {});

    const nested = node.children?.[1];
    if (nested) {
      getItems(nested, heading);
    }

    return heading;
  }

  return {};
}

const getToc = () => (node: Node, file: { data: unknown }) => {
  const table = toc(node);
  file.data = getItems(table.map as MdNode | undefined, {});
};

export async function getTableOfContents(content: string) {
  const result = await remark().use(getToc).process(content);

  return result.data;
}
