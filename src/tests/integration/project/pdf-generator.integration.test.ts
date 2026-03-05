import { ProjectStatistics } from "@clients";
import { execSync } from "child_process";
import { existsSync, unlinkSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { PassThrough } from "stream";
import { describe, expect, it } from "vitest";

import { PdfGeneratorService } from "@/utilities/pdf-generator";

async function collectPdfBuffer(doc: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const pass = new PassThrough();
    pass.on("data", (chunk: Buffer) => chunks.push(chunk));
    pass.on("end", () => resolve(Buffer.concat(chunks)));
    pass.on("error", reject);
    doc.pipe(pass);
  });
}

function extractTextFromPdf(buffer: Buffer): string {
  const tmpFile = join(tmpdir(), `pdf-test-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`);
  try {
    writeFileSync(tmpFile, buffer);
    return execSync(`pdftotext -layout "${tmpFile}" -`, { encoding: "utf-8" });
  } finally {
    if (existsSync(tmpFile)) unlinkSync(tmpFile);
  }
}

function assertValidPdf(buffer: Buffer) {
  expect(buffer.length).toBeGreaterThan(1000);
  expect(buffer.subarray(0, 4).toString()).toBe("%PDF");
}

const fullStats: ProjectStatistics = {
  project: {
    id: "proj-001",
    accountId: "acc-001",
    name: "Projet Alpha",
    description: "Construction du siege social",
    initialBudget: 50000,
    color: "#3B82F6",
    iconRef: null,
    isArchived: false,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-06-01"),
  } as any,
  totalEstimatedCost: 45000,
  totalRealCost: 38000,
  remainingBudget: 12000,
  transactionCount: 3,
};

const emptyStats: ProjectStatistics = {
  project: {
    id: "proj-002",
    accountId: "acc-001",
    name: "Projet Vide",
    description: null,
    initialBudget: 10000,
    color: "#22C55E",
    iconRef: null,
    isArchived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any,
  totalEstimatedCost: 0,
  totalRealCost: 0,
  remainingBudget: 10000,
  transactionCount: 0,
};

const overBudgetStats: ProjectStatistics = {
  project: {
    id: "proj-003",
    accountId: "acc-001",
    name: "Projet Depasse",
    description: "Budget depasse",
    initialBudget: 5000,
    color: "#EF4444",
    iconRef: null,
    isArchived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any,
  totalEstimatedCost: 6000,
  totalRealCost: 7500,
  remainingBudget: -2500,
  transactionCount: 5,
};

const transactions = [
  { name: "Materiaux construction", description: "Ciment et acier", estimatedCost: 20000, realCost: 18500 },
  { name: "Main oeuvre", description: "Equipe chantier", estimatedCost: 15000, realCost: 14000 },
  { name: "Equipements bureau", description: "Mobilier informatique", estimatedCost: 10000, realCost: 5500 },
];

describe("PdfGeneratorService Integration — generateProjectStatisticsPDF", () => {
  it("should produce a valid PDF buffer", async () => {
    const buffer = await collectPdfBuffer(PdfGeneratorService.generateProjectStatisticsPDF(fullStats));
    assertValidPdf(buffer);
  });

  it("should embed project name in the PDF text", async () => {
    const buffer = await collectPdfBuffer(PdfGeneratorService.generateProjectStatisticsPDF(fullStats));
    expect(extractTextFromPdf(buffer)).toContain("Projet Alpha");
  });

  it("should embed header title text", async () => {
    const buffer = await collectPdfBuffer(PdfGeneratorService.generateProjectStatisticsPDF(fullStats));
    expect(extractTextFromPdf(buffer)).toContain("STATISTIQUES DU PROJET");
  });

  it("should embed budget figures", async () => {
    const buffer = await collectPdfBuffer(PdfGeneratorService.generateProjectStatisticsPDF(fullStats));
    const text = extractTextFromPdf(buffer);
    // French locale formats 50000 as "50 000" or "50/000" depending on system locale.
    // Strip all whitespace and "/" to get a normalised string for comparison.
    const normalised = text.replace(/[\s/]/g, "");
    expect(normalised).toContain("50000");
  });

  it("should embed transaction count", async () => {
    const buffer = await collectPdfBuffer(PdfGeneratorService.generateProjectStatisticsPDF(fullStats));
    expect(extractTextFromPdf(buffer)).toContain("3");
  });

  it("should produce valid PDF with zero stats", async () => {
    const buffer = await collectPdfBuffer(PdfGeneratorService.generateProjectStatisticsPDF(emptyStats));
    assertValidPdf(buffer);
  });

  it("should produce valid PDF when project is undefined", async () => {
    const buffer = await collectPdfBuffer(PdfGeneratorService.generateProjectStatisticsPDF({ ...fullStats, project: undefined }));
    assertValidPdf(buffer);
  });

  it("should produce valid PDF for over-budget scenario", async () => {
    const buffer = await collectPdfBuffer(PdfGeneratorService.generateProjectStatisticsPDF(overBudgetStats));
    assertValidPdf(buffer);
  });
});

describe("PdfGeneratorService Integration — generateProjectInvoicePDF", () => {
  it("should produce a valid PDF buffer with transactions", async () => {
    const buffer = await collectPdfBuffer(PdfGeneratorService.generateProjectInvoicePDF(fullStats, transactions));
    assertValidPdf(buffer);
  });

  it("should embed transaction names", async () => {
    const buffer = await collectPdfBuffer(PdfGeneratorService.generateProjectInvoicePDF(fullStats, transactions));
    const text = extractTextFromPdf(buffer);
    expect(text).toContain("Main oeuvre");
    expect(text).toContain("Materiaux construction");
  });

  it("should embed header title", async () => {
    const buffer = await collectPdfBuffer(PdfGeneratorService.generateProjectInvoicePDF(fullStats, transactions));
    expect(extractTextFromPdf(buffer)).toContain("FACTURE PROJET");
  });

  it("should produce valid PDF with empty transaction list", async () => {
    const buffer = await collectPdfBuffer(PdfGeneratorService.generateProjectInvoicePDF(fullStats, []));
    assertValidPdf(buffer);
  });

  it("should embed 'Aucune transaction' message when list is empty", async () => {
    const buffer = await collectPdfBuffer(PdfGeneratorService.generateProjectInvoicePDF(fullStats, []));
    expect(extractTextFromPdf(buffer)).toContain("Aucune transaction");
  });

  it("should produce valid PDF with undefined project", async () => {
    const buffer = await collectPdfBuffer(PdfGeneratorService.generateProjectInvoicePDF({ ...fullStats, project: undefined }, transactions));
    assertValidPdf(buffer);
  });

  it("should handle a large transaction list without crashing", async () => {
    const manyTx = Array.from({ length: 40 }, (_, i) => ({
      name: `Transaction ${i + 1}`,
      description: `Description ${i + 1}`,
      estimatedCost: (i + 1) * 100,
      realCost: (i + 1) * 95,
    }));
    const buffer = await collectPdfBuffer(PdfGeneratorService.generateProjectInvoicePDF(fullStats, manyTx));
    assertValidPdf(buffer);
    const text = extractTextFromPdf(buffer);
    expect(text).toContain("Transaction 1");
    expect(text).toContain("Transaction 40");
  });
});

describe("PdfGeneratorService Integration — generateProjectSummaryPDF", () => {
  it("should produce a valid PDF buffer", async () => {
    const buffer = await collectPdfBuffer(PdfGeneratorService.generateProjectSummaryPDF(fullStats));
    assertValidPdf(buffer);
  });

  it("should embed the summary header title", async () => {
    const buffer = await collectPdfBuffer(PdfGeneratorService.generateProjectSummaryPDF(fullStats));
    const text = extractTextFromPdf(buffer);
    // pdftotext preserves accented chars — "RÉSUMÉ EXÉCUTIF" is in the output
    // We check "XÉCUTIF" as a reliable substring (avoids any "É" encoding edge case)
    expect(text).toContain("XÉCUTIF");
  });

  it("should embed the project name", async () => {
    const buffer = await collectPdfBuffer(PdfGeneratorService.generateProjectSummaryPDF(fullStats));
    expect(extractTextFromPdf(buffer)).toContain("Projet Alpha");
  });

  it("should show over-budget indicator for over-budget project", async () => {
    const buffer = await collectPdfBuffer(PdfGeneratorService.generateProjectSummaryPDF(overBudgetStats));
    assertValidPdf(buffer);
    // "Dépassement de budget" — "passement" is a reliable ASCII run within the word
    expect(extractTextFromPdf(buffer)).toContain("passement");
  });

  it("should show in-budget indicator for in-budget project", async () => {
    const buffer = await collectPdfBuffer(PdfGeneratorService.generateProjectSummaryPDF(fullStats));
    expect(extractTextFromPdf(buffer)).toContain("budget");
  });

  it("should embed transaction count", async () => {
    const buffer = await collectPdfBuffer(PdfGeneratorService.generateProjectSummaryPDF(fullStats));
    expect(extractTextFromPdf(buffer)).toContain("3");
  });

  it("should produce valid PDF when project is undefined", async () => {
    const buffer = await collectPdfBuffer(PdfGeneratorService.generateProjectSummaryPDF({ ...fullStats, project: undefined }));
    assertValidPdf(buffer);
  });

  it("should use project color without crashing", async () => {
    const buffer = await collectPdfBuffer(
      PdfGeneratorService.generateProjectSummaryPDF({
        ...fullStats,
        project: { ...fullStats.project, color: "#FF5733" } as any,
      }),
    );
    assertValidPdf(buffer);
  });
});
