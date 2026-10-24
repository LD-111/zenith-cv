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
import { getTheme, type ThemeId, type CvTheme } from "@/lib/cv-theme";
import { splitFrontmatter } from "@/lib/frontmatter";

function buildPdfStyles(theme: CvTheme) {
  return StyleSheet.create({
  page: {
    fontFamily: theme.pdfFont,
    fontSize: theme.fontSize,
    lineHeight: theme.lineHeight,
    color: theme.color,
    paddingTop: "14mm",
    paddingBottom: "14mm",
    paddingLeft: "16mm",
    paddingRight: "16mm",
  },
  h1: {
    fontSize: theme.h1Size,
    fontFamily: theme.pdfFontBold,
    color: theme.heading,
    letterSpacing: theme.h1TrackingEm * theme.h1Size,
    marginBottom: 1,
    lineHeight: 1.15,
  },
  h2Wrap: {
    marginTop: theme.h2MarginTop * 0.55,
    marginBottom: 3,
    paddingBottom: 2,
    borderBottomWidth: 1.5,
    borderBottomColor: theme.softRule,
    borderBottomStyle: "solid",
  },
  h2: {
    fontSize: theme.h2Size,
    fontFamily: theme.pdfFontBold,
    color: theme.accent,
    textTransform: "uppercase",
    letterSpacing: theme.h2TrackingEm * theme.h2Size,
  },
  h3: {
    fontSize: theme.h3Size,
    fontFamily: theme.pdfFontBold,
    color: theme.heading,
    marginTop: theme.h3MarginTop * 0.6,
    marginBottom: 0,
  },
  p: {
    marginTop: 0,
    marginBottom: theme.pMarginBottom * 0.5,
    color: "#374151",
    textAlign: "justify",
  },
  ulWrap: {
    marginTop: 2,
    marginBottom: 4,
  },
  liRow: {
    flexDirection: "row",
    marginBottom: 2,
    paddingLeft: 12,
  },
  bullet: {
    width: 14,
    color: "#374151",
  },
  orderedMarker: {
    width: 18,
    color: "#374151",
  },
  nestedList: {
    marginTop: 1,
    marginBottom: 2,
    paddingLeft: 10,
  },
  liText: {
    flex: 1,
    color: "#374151",
    textAlign: "justify",
  },
  strong: {
    fontFamily: theme.pdfFontBold,
    color: theme.heading,
  },
  em: {
    fontFamily: theme.pdfFontItalic,
    color: theme.muted,
    fontSize: theme.emSize,
  },
  link: {
    color: theme.accent,
    textDecoration: "none",
  },
  inlineCode: {
    fontFamily: "Courier",
    fontSize: 9,
    color: "#374151",
  },
  hrWrap: {
    borderTopWidth: 1,
    borderTopColor: theme.rule,
    marginTop: 7,
    marginBottom: 7,
  },
  blockquoteWrap: {
    borderLeftWidth: 3,
    borderLeftColor: theme.softRule,
    paddingLeft: 12,
    marginTop: 4,
    marginBottom: 4,
  },
  blockquoteText: {
    fontFamily: theme.pdfFontItalic,
    color: theme.muted,
    textAlign: "justify",
  },
  codeBlockWrap: {
    backgroundColor: "#f3f4f6",
    padding: 6,
    marginTop: 2,
    marginBottom: 4,
    borderRadius: 3,
  },
  codeBlock: {
    fontFamily: "Courier",
    fontSize: 9,
    color: "#374151",
  },
  tableWrap: {
    marginTop: 4,
    marginBottom: 4,
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
    paddingVertical: 2,
    paddingHorizontal: 6,
    color: "#4b5563",
    fontSize: 9.5,
  },
  tableHeaderCell: {
    flex: 1,
    paddingVertical: 3,
    paddingHorizontal: 6,
    color: "#374151",
    fontSize: 9.5,
    fontFamily: theme.pdfFontBold,
  },
  });
}

type PdfStyles = ReturnType<typeof buildPdfStyles>;

function renderInline(nodes: PhrasingContent[], styles: PdfStyles): React.ReactNode[] {
  return nodes.map((node, i) => {
    switch (node.type) {
      case "text":
        return <Text key={i}>{node.value}</Text>;
      case "strong":
        return (
          <Text key={i} style={styles.strong}>
            {renderInline(node.children as PhrasingContent[], styles)}
          </Text>
        );
      case "emphasis":
        return (
          <Text key={i} style={styles.em}>
            {renderInline(node.children as PhrasingContent[], styles)}
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
              {renderInline(node.children as PhrasingContent[], styles)}
            </Text>
          </Link>
        );
      case "break":
        return <Text key={i}>{"\n"}</Text>;
      case "delete":
        return (
          <Text key={i} style={{ textDecoration: "line-through" }}>
            {renderInline(node.children as PhrasingContent[], styles)}
          </Text>
        );
      default:
        if ("children" in node && Array.isArray(node.children)) {
          return (
            <Text key={i}>
              {renderInline(node.children as PhrasingContent[], styles)}
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

function renderList(list: List, key: number, depth: number, styles: PdfStyles): React.ReactNode {
  const start = list.start ?? 1;
  return (
    <View key={key} style={depth > 0 ? styles.nestedList : styles.ulWrap}>
      {list.children.map((item, j) => {
        const marker = list.ordered ? `${start + j}. ` : "• ";
        const nested = item.children.filter((child): child is List => child.type === "list");
        return (
          <View key={j}>
            <View style={styles.liRow}>
              <Text style={list.ordered ? styles.orderedMarker : styles.bullet}>
                {marker}
              </Text>
              <Text style={styles.liText}>
                {renderInline(getListItemInline(item), styles)}
              </Text>
            </View>
            {nested.map((child, k) => renderList(child, k, Math.min(depth + 1, 1), styles))}
          </View>
        );
      })}
    </View>
  );
}

function renderBlock(node: RootContent, i: number, styles: PdfStyles): React.ReactNode {
  switch (node.type) {
    case "heading": {
      const h = node as Heading;
      if (h.depth === 1) {
        return (
          <Text key={i} style={styles.h1}>
            {renderInline(h.children as PhrasingContent[], styles)}
          </Text>
        );
      }
      if (h.depth === 2) {
        return (
          <View key={i} style={styles.h2Wrap} wrap={false}>
            <Text style={styles.h2}>
              {renderInline(h.children as PhrasingContent[], styles)}
            </Text>
          </View>
        );
      }
      return (
        <Text key={i} style={styles.h3} wrap={false}>
          {renderInline(h.children as PhrasingContent[], styles)}
        </Text>
      );
    }

    case "paragraph": {
      const p = node as Paragraph;
      return (
        <Text key={i} style={styles.p}>
          {renderInline(p.children as PhrasingContent[], styles)}
        </Text>
      );
    }

    case "list":
      return renderList(node as List, i, 0, styles);

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
                  {renderInline((child as Paragraph).children as PhrasingContent[], styles)}
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
                  {renderInline(cell.children as PhrasingContent[], styles)}
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

export type PdfPageSize = "A4" | "LETTER";

export async function downloadCVAsPDF(
  markdown: string,
  fileName: string,
  pageSize: PdfPageSize = "A4",
  themeId: ThemeId = "serif"
): Promise<void> {
  const styles = buildPdfStyles(getTheme(themeId));
  const pdfName = fileName.replace(/\.md$/, "") + ".pdf";
  const tree = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .parse(splitFrontmatter(markdown).body) as Root;

  const docElement = (
    <Document>
      <Page size={pageSize} style={styles.page}>
        {tree.children.map((node, i) => renderBlock(node, i, styles))}
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
