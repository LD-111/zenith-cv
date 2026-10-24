export interface CvFrontmatter {
  body: string;
  target: string;
  notes: string;
}

export function splitFrontmatter(markdown: string): CvFrontmatter {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { body: markdown, target: "", notes: "" };
  let target = "";
  let notes = "";
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!field) continue;
    const key = field[1].toLowerCase();
    if (key === "target") target = field[2].trim();
    if (key === "notes") notes = field[2].trim();
  }
  return { body: markdown.slice(match[0].length), target, notes };
}
