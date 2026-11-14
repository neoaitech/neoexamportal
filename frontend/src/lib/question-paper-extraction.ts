import type { SchemeQuestionInput } from "./evaluation-types";

interface TextLine {
  text: string;
  y: number;
}

function questionLabel(line: string, parent: string | null): string | null {
  const prefixed = line.match(
    /^\s*(?:Q(?:uestion)?\.?\s*)(\d+(?:\.\d+)*)(?:\s*[\[(]([a-z0-9]+)[\])])?/i,
  );
  if (prefixed) {
    return `Q${prefixed[1]}${prefixed[2] ? `(${prefixed[2]})` : ""}`;
  }

  const numbered = line.match(
    /^\s*(\d+(?:\.\d+)*)(?:\s*[\[(]([a-z0-9]+)[\])])?\s*[.):]\s+/i,
  );
  if (numbered) {
    return `Q${numbered[1]}${numbered[2] ? `(${numbered[2]})` : ""}`;
  }

  const subQuestion = line.match(/^\s*\(([a-z])\)\s+/i);
  if (parent && subQuestion) return `${parent}(${subQuestion[1]})`;
  return null;
}

function marksIn(text: string): number | null {
  const total = text.match(/[\[(]\s*\d+\s*[*×x]\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/i);
  if (total) return Number(total[2]);

  const pattern =
    /\[\s*(\d+(?:\.\d+)?)\s*(?:marks?|m)?\s*\]|\(\s*(\d+(?:\.\d+)?)\s*(?:marks?|m)?\s*\)|\b(\d+(?:\.\d+)?)\s*(?:marks?|m)\b/gi;
  let marks: number | null = null;
  for (const match of text.matchAll(pattern)) {
    const value = Number(match[1] ?? match[2] ?? match[3]);
    if (Number.isFinite(value) && value > 0) marks = value;
  }
  return marks;
}

function attemptCount(text: string): number | null {
  const value = text.match(/attempt\s+any\s+(\d+|[a-z]+)/i)?.[1]?.toLowerCase();
  if (!value) return null;
  if (/^\d+$/.test(value)) return Number(value);
  const words: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
  };
  return words[value] ?? null;
}

function questionHeading(line: string): string | null {
  const match = line.match(
    /^\s*Q(?:uestion)?\.?\s*(\d+)(?!\d)(?!\.\d)(?:\s*[\[(]([a-z])[\])])?\s*(?:[.):]\s*|$)/i,
  );
  return match ? `Q${match[1]}${match[2] ? `(${match[2]})` : ""}` : null;
}

function suggestedQuestion(
  questionNumber: string,
  headingText: string,
): SchemeQuestionInput {
  const multiplied = headingText.match(
    /[\[(]\s*(\d+)\s*[*×x]\s*(\d+(?:\.\d+)?)\s*=\s*(\d+(?:\.\d+)?)/i,
  );
  const count = attemptCount(headingText) ?? (multiplied ? Number(multiplied[1]) : null);
  const eachMark = multiplied ? Number(multiplied[2]) : null;
  const extractedMarks = marksIn(headingText) ?? 0;
  const maxMarks =
    count && eachMark ? count * eachMark : count && extractedMarks ? count * extractedMarks : extractedMarks;
  const stepMarks = eachMark ?? (count && maxMarks ? maxMarks / count : 0);

  return {
    questionNumber,
    maxMarks,
    optionGroup: null,
    steps:
      count && count > 1 && stepMarks > 0
        ? Array.from({ length: count }, (_, index) => ({
            description: `Answer ${index + 1}`,
            maxMarks: stepMarks,
          }))
        : [],
  };
}

function uniqueQuestions(questions: SchemeQuestionInput[]): SchemeQuestionInput[] {
  const unique = new Map<string, SchemeQuestionInput>();
  const quality = (value: SchemeQuestionInput) =>
    (value.maxMarks > 0 ? 2 : 0) + (value.steps.length > 0 ? 1 : 0);

  for (const question of questions) {
    const existing = unique.get(question.questionNumber);
    if (!existing || quality(question) > quality(existing)) {
      unique.set(question.questionNumber, question);
    }
  }
  return [...unique.values()];
}

export function parseQuestionPaperText(text: string): SchemeQuestionInput[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const answerKeyIndex = lines.findIndex((line) =>
    /^\s*(?:(?:brief|suggested|model)\s+)?(?:answer\s+key|answers?\s+and\s+mark(?:ing)?\s+scheme|mark(?:ing)?\s+scheme)\b/i.test(
      line,
    ),
  );
  const questionPaperLines = answerKeyIndex < 0 ? lines : lines.slice(0, answerKeyIndex);
  const headings = questionPaperLines.flatMap((line, lineIndex) => {
    const questionNumber = questionHeading(line);
    return questionNumber ? [{ questionNumber, lineIndex }] : [];
  });

  if (headings.length > 0) {
    const extracted = headings.map((heading, index) => {
      const end = headings[index + 1]?.lineIndex ?? questionPaperLines.length;
      const headingLines = questionPaperLines.slice(
        heading.lineIndex,
        Math.min(heading.lineIndex + 3, end),
      );
      const childStart = headingLines.findIndex((line, lineIndex) =>
        lineIndex > 0 && /^\s*\d+[.)]\s+/.test(line),
      );
      const headingText =
        childStart > 0 ? headingLines.slice(0, childStart).join(" ") : headingLines.join(" ");
      return suggestedQuestion(heading.questionNumber, headingText);
    });
    return uniqueQuestions(extracted);
  }

  const found: { questionNumber: string; lineIndex: number }[] = [];
  for (const [lineIndex, line] of questionPaperLines.entries()) {
    const label = questionLabel(line, null);
    if (label) found.push({ questionNumber: label, lineIndex });
  }

  return uniqueQuestions(
    found.map((question, index) => {
      const end = found[index + 1]?.lineIndex ?? questionPaperLines.length;
      const text = questionPaperLines.slice(question.lineIndex, end).join(" ");
      return suggestedQuestion(question.questionNumber, text);
    }),
  );
}

function pdfLines(items: { str: string; transform: number[] }[]): string[] {
  const positioned = items
    .filter((item) => item.str.trim())
    .map((item) => ({ text: item.str.trim(), y: item.transform[5] }))
    .sort((a, b) => b.y - a.y);
  const lines: TextLine[] = [];

  for (const item of positioned) {
    const current = lines[lines.length - 1];
    if (current && Math.abs(current.y - item.y) <= 3) {
      current.text += ` ${item.text}`;
    } else {
      lines.push({ text: item.text, y: item.y });
    }
  }
  return lines.map((line) => line.text);
}

export async function extractQuestionPaperText(file: File): Promise<string> {
  if (/\.docx$/i.test(file.name)) {
    const mammoth = (await import("mammoth")).default;
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return result.value;
  }

  if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) {
    throw new Error("Question extraction supports text-based PDF and DOCX files.");
  }

  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const task = pdfjs.getDocument({ data: await file.arrayBuffer() });
  const pdf = await task.promise;
  const pages: string[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const items = content.items.filter(
        (item): item is typeof item & { str: string; transform: number[] } =>
          "str" in item && "transform" in item,
      );
      pages.push(...pdfLines(items));
      page.cleanup();
    }
  } finally {
    await task.destroy();
  }
  return pages.join("\n");
}
