export interface CvSnippet {
  id: "experience" | "skills" | "education" | "project";
  label: string;
  body: string;
}

export const SNIPPETS: CvSnippet[] = [
  {
    id: "experience",
    label: "Experience",
    body: "\n### Role — Company\n*Month Year – Present · City*\n\n- \n",
  },
  {
    id: "skills",
    label: "Skills",
    body: "\n## Skills\n\n**Category:** \n",
  },
  {
    id: "education",
    label: "Education",
    body: "\n## Education\n\n### Degree — School\n*Year*\n",
  },
  {
    id: "project",
    label: "Project",
    body: "\n### Project Name\n*Stack · Link*\n\n- \n",
  },
];
