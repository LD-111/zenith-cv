import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Link,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type {
  Root,
  RootContent,
  PhrasingContent,
  Heading,
  Paragraph,
  List,
  ListItem,
  ThematicBreak,
  Blockquote,
  Code,
  Table,
  TableRow,
  TableCell,
} from "mdast";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Times-Roman",
    fontSize: 10.5,
    lineHeight: 1.55,
    color: "#1a1a1a",
    paddingTop: "14mm",
    paddingBottom: "14mm",
    paddingLeft: "16mm",
    paddingRight: "16mm",
  },
  h1: {
    fontSize: 22,
    fontFamily: "Times-Bold",
    color: "#111827",
    letterSpacing: -0.44,
    marginBottom: 2,
    lineHeight: 1.15,
  },
  h2Wrap: {
    marginTop: 18,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1.5,
    borderBottomColor: "#e0e7ff",
    borderBottomStyle: "solid",
  },
  h2: {
    fontSize: 10,
    fontFamily: "Times-Bold",
    color: "#4338ca",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  h3: {
    fontSize: 11,
    fontFamily: "Times-Bold",
    color: "#111827",
    marginTop: 12,
    marginBottom: 1,
  },
  p: {
    marginTop: 3,
    marginBottom: 6,
    color: "#374151",
  },
  ulWrap: {
    marginTop: 4,
    marginBottom: 8,
  },
  liRow: {
    flexDirection: "row",
    marginBottom: 3,
    paddingLeft: 12,
  },
  bullet: {
    width: 12,
    color: "#374151",
  },
  liText: {
    flex: 1,
    color: "#374151",
  },
  strong: {
    fontFamily: "Times-Bold",
    color: "#111827",
  },
  em: {
    fontFamily: "Times-Italic",
    color: "#6b7280",
    fontSize: 9.5,
  },
  link: {
    color: "#4338ca",
    textDecoration: "none",
  },
  inlineCode: {
    fontFamily: "Courier",
    fontSize: 9,
    color: "#374151",
  },
  hrWrap: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    marginTop: 14,
    marginBottom: 14,
  },
  blockquoteWrap: {
    borderLeftWidth: 3,
    borderLeftColor: "#e0e7ff",
    paddingLeft: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  blockquoteText: {
    fontFamily: "Times-Italic",
    color: "#6b7280",
  },
  codeBlockWrap: {
    backgroundColor: "#f3f4f6",
    padding: 8,
    marginTop: 4,
    marginBottom: 8,
    borderRadius: 3,
  },
  codeBlock: {
    fontFamily: "Courier",
    fontSize: 9,
    color: "#374151",
  },
  tableWrap: {
    marginTop: 8,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1.5,
    borderBottomColor: "#e5e7eb",
  },
  tableCell: {
    flex: 1,
    paddingVertical: 3,
    paddingHorizontal: 8,
    color: "#4b5563",
    fontSize: 9.5,
  },
  tableHeaderCell: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 8,
    color: "#374151",
    fontSize: 9.5,
    fontFamily: "Times-Bold",
  },
});

function renderInline(nodes: PhrasingContent[]): React.ReactNode[] {
  return nodes.map((node, i) => {
    switch (node.type) {
      case "text":
        return <Text key={i}>{node.value}</Text>;
      case "strong":
        return (
          <Text key={i} style={styles.strong}>
            {renderInline(node.children as PhrasingContent[])}
          </Text>
        );
      case "emphasis":
        return (
          <Text key={i} style={styles.em}>
            {renderInline(node.children as PhrasingContent[])}
          </Text>
        );
      case "inlineCode":
        return (
          <Text key={i} style={styles.inlineCode}>
            {node.value}
          </Text>
        );
      case "link":
        return (
          <Link key={i} src={node.url}>
            <Text style={styles.link}>
              {renderInline(node.children as PhrasingContent[])}
            </Text>
          </Link>
        );
      case "break":
        return <Text key={i}>{"\n"}</Text>;
      case "delete":
        return (
          <Text key={i} style={{ textDecoration: "line-through" }}>
            {renderInline(node.children as PhrasingContent[])}
          </Text>
        );
      default:
        if ("children" in node && Array.isArray(node.children)) {
          return (
            <Text key={i}>
              {renderInline(node.children as PhrasingContent[])}
            </Text>
          );
        }
        if ("value" in node && typeof node.value === "string") {
          return <Text key={i}>{node.value}</Text>;
        }
        return null;
    }
  });
}

function getListItemInline(item: ListItem): PhrasingContent[] {
  const inline: PhrasingContent[] = [];
  for (const child of item.children) {
    if (child.type === "paragraph") {
      inline.push(...(child as Paragraph).children);
    }
  }
  return inline;
}

function renderBlock(node: RootContent, i: number): React.ReactNode {
  switch (node.type) {
    case "heading": {
      const h = node as Heading;
      if (h.depth === 1) {
        return (
          <Text key={i} style={styles.h1}>
            {renderInline(h.children as PhrasingContent[])}
          </Text>
        );
      }
      if (h.depth === 2) {
        return (
          <View key={i} style={styles.h2Wrap} wrap={false}>
            <Text style={styles.h2}>
              {renderInline(h.children as PhrasingContent[])}
            </Text>
          </View>
        );
      }
      return (
        <Text key={i} style={styles.h3} wrap={false}>
          {renderInline(h.children as PhrasingContent[])}
        </Text>
      );
    }

    case "paragraph": {
      const p = node as Paragraph;
      return (
        <Text key={i} style={styles.p}>
          {renderInline(p.children as PhrasingContent[])}
        </Text>
      );
    }

    case "list": {
      const list = node as List;
      return (
        <View key={i} style={styles.ulWrap}>
          {list.children.map((item, j) => (
            <View key={j} style={styles.liRow}>
              <Text style={styles.bullet}>{"• "}</Text>
              <Text style={styles.liText}>
                {renderInline(getListItemInline(item))}
              </Text>
            </View>
          ))}
        </View>
      );
    }

    case "thematicBreak": {
      void (node as ThematicBreak);
      return <View key={i} style={styles.hrWrap} />;
    }

    case "blockquote": {
      const bq = node as Blockquote;
      return (
        <View key={i} style={styles.blockquoteWrap}>
          {bq.children.map((child, j) => {
            if (child.type === "paragraph") {
              return (
                <Text key={j} style={styles.blockquoteText}>
                  {renderInline((child as Paragraph).children as PhrasingContent[])}
                </Text>
              );
            }
            return null;
          })}
        </View>
      );
    }

    case "code": {
      const c = node as Code;
      return (
        <View key={i} style={styles.codeBlockWrap}>
          <Text style={styles.codeBlock}>{c.value}</Text>
        </View>
      );
    }

    case "table": {
      const table = node as Table;
      return (
        <View key={i} style={styles.tableWrap}>
          {table.children.map((row: TableRow, r) => (
            <View key={r} style={r === 0 ? styles.tableHeaderRow : styles.tableRow}>
              {row.children.map((cell: TableCell, c) => (
                <Text
                  key={c}
                  style={r === 0 ? styles.tableHeaderCell : styles.tableCell}
                >
                  {renderInline(cell.children as PhrasingContent[])}
                </Text>
              ))}
            </View>
          ))}
        </View>
      );
    }

    default:
      return null;
  }
}

export async function downloadCVAsPDF(
  markdown: string,
  fileName: string
): Promise<void> {
  const pdfName = fileName.replace(/\.md$/, "") + ".pdf";
  const tree = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .parse(markdown) as Root;

  const docElement = (
    <Document>
      <Page size="A4" style={styles.page}>
        {tree.children.map((node, i) => renderBlock(node, i))}
      </Page>
    </Document>
  );

  const blob = await pdf(docElement).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = pdfName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
