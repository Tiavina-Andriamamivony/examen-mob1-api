import { ProjectStatistics } from "@clients";

import PDFDocument = require("pdfkit");

const COLORS = {
  primary: "#1E3A5F",
  accent: "#3B82F6",
  success: "#22C55E",
  danger: "#EF4444",
  warning: "#F59E0B",
  textDark: "#111827",
  textMid: "#374151",
  textLight: "#6B7280",
  border: "#E5E7EB",
  bgLight: "#F9FAFB",
  bgAccent: "#EFF6FF",
  white: "#FFFFFF",
};

const FONTS = {
  bold: "Helvetica-Bold",
  regular: "Helvetica",
};

const PAGE = {
  marginX: 50,
  marginY: 50,
  width: 595, // A4
  height: 842,
  contentWidth: 495,
};

function rect(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, fill: string, stroke?: string) {
  doc.save();
  doc.rect(x, y, w, h).fillColor(fill).fill();
  if (stroke) {
    doc.rect(x, y, w, h).strokeColor(stroke).lineWidth(0.5).stroke();
  }
  doc.restore();
}

function divider(doc: PDFKit.PDFDocument, y: number, color = COLORS.border) {
  doc
    .save()
    .moveTo(PAGE.marginX, y)
    .lineTo(PAGE.width - PAGE.marginX, y)
    .strokeColor(color)
    .lineWidth(0.5)
    .stroke()
    .restore();
}

function pageHeader(doc: PDFKit.PDFDocument, title: string, subtitle: string, accentColor = COLORS.accent) {
  rect(doc, 0, 0, PAGE.width, 90, COLORS.primary);

  rect(doc, 0, 0, 6, 90, accentColor);

  doc
    .fillColor(COLORS.white)
    .font(FONTS.bold)
    .fontSize(20)
    .text(title, PAGE.marginX + 10, 22, { width: PAGE.contentWidth - 80 });

  doc
    .fillColor(accentColor)
    .font(FONTS.regular)
    .fontSize(10)
    .text(subtitle, PAGE.marginX + 10, 48);

  doc
    .fillColor(COLORS.white)
    .font(FONTS.regular)
    .fontSize(9)
    .text(`Généré le ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString("fr-FR")}`, PAGE.marginX + 10, 66);
}

function pageFooter(doc: PDFKit.PDFDocument, projectName: string, pageNum = 1) {
  const y = PAGE.height - 36;
  divider(doc, y - 6);
  doc
    .fillColor(COLORS.textLight)
    .font(FONTS.regular)
    .fontSize(8)
    .text(projectName, PAGE.marginX, y, { width: 200 })
    .text(`Page ${pageNum}`, 0, y, { align: "right", width: PAGE.width - PAGE.marginX * 2 });
}

function statCard(doc: PDFKit.PDFDocument, x: number, y: number, w: number, label: string, value: string, accentColor: string) {
  rect(doc, x, y, w, 72, COLORS.bgLight, COLORS.border);
  rect(doc, x, y, w, 4, accentColor);

  doc
    .fillColor(COLORS.textLight)
    .font(FONTS.regular)
    .fontSize(9)
    .text(label, x + 10, y + 14, { width: w - 20 });

  doc
    .fillColor(COLORS.textDark)
    .font(FONTS.bold)
    .fontSize(15)
    .text(value, x + 10, y + 30, { width: w - 20 });
}

function progressBar(doc: PDFKit.PDFDocument, x: number, y: number, w: number, percent: number, label: string): number {
  const barH = 14;
  const clampedPercent = Math.min(percent, 100);
  const barColor = percent > 100 ? COLORS.danger : percent > 80 ? COLORS.warning : COLORS.success;

  doc
    .fillColor(COLORS.textMid)
    .font(FONTS.bold)
    .fontSize(9)
    .text(label, x, y, { width: w - 50 });

  doc
    .fillColor(COLORS.textDark)
    .font(FONTS.bold)
    .fontSize(9)
    .text(`${Math.round(percent)}%`, x + w - 45, y, { width: 45, align: "right" });

  y += 14;

  rect(doc, x, y, w, barH, COLORS.border);
  if (clampedPercent > 0) rect(doc, x, y, Math.max((clampedPercent / 100) * w, 4), barH, barColor);

  return y + barH + 8;
}

function fcfa(value: number | undefined): string {
  const n = value ?? 0;
  return `${n.toLocaleString("fr-FR")} FCFA`;
}

function projectName(statistics: ProjectStatistics): string {
  return statistics.project?.name ?? "Projet sans nom";
}

export class PdfGeneratorService {
  static generateProjectStatisticsPDF(statistics: ProjectStatistics): PDFKit.PDFDocument {
    const doc = new PDFDocument({ margin: 0, size: "A4" });

    const project = statistics.project;
    const budget = project?.initialBudget ?? 1;
    const realCost = statistics.totalRealCost ?? 0;
    const estimatedCost = statistics.totalEstimatedCost ?? 0;
    const remaining = statistics.remainingBudget ?? 0;
    const txCount = statistics.transactionCount ?? 0;

    const percentReal = (realCost / budget) * 100;
    const percentEstimated = (estimatedCost / budget) * 100;

    // ── Header ──
    pageHeader(doc, "STATISTIQUES DU PROJET", projectName(statistics));

    // ── Project info section ──
    let y = 110;

    doc.fillColor(COLORS.primary).font(FONTS.bold).fontSize(11).text("INFORMATIONS DU PROJET", PAGE.marginX, y);

    y += 18;
    divider(doc, y);
    y += 12;

    doc.fillColor(COLORS.textMid).font(FONTS.regular).fontSize(10);
    doc
      .text(`Nom :`, PAGE.marginX, y)
      .font(FONTS.bold)
      .text(project?.name ?? "N/A", 150, y);
    y += 18;
    doc
      .font(FONTS.regular)
      .text(`Description :`, PAGE.marginX, y)
      .font(FONTS.bold)
      .text(project?.description ?? "Aucune description", 150, y, { width: 345 });
    y += 22;
    doc.font(FONTS.regular).text(`Budget initial :`, PAGE.marginX, y).font(FONTS.bold).fillColor(COLORS.accent).text(fcfa(project?.initialBudget), 150, y);

    // ── KPI cards ──
    y += 36;
    doc.fillColor(COLORS.primary).font(FONTS.bold).fontSize(11).text("STATISTIQUES BUDGÉTAIRES", PAGE.marginX, y);
    y += 18;
    divider(doc, y);
    y += 12;

    const cardW = 115;
    const cardGap = 8;

    statCard(doc, PAGE.marginX, y, cardW, "Budget Initial", fcfa(project?.initialBudget), COLORS.accent);
    statCard(doc, PAGE.marginX + cardW + cardGap, y, cardW, "Coût Réel Total", fcfa(realCost), realCost > budget ? COLORS.danger : COLORS.success);
    statCard(doc, PAGE.marginX + (cardW + cardGap) * 2, y, cardW, "Coût Estimé Total", fcfa(estimatedCost), COLORS.warning);
    statCard(doc, PAGE.marginX + (cardW + cardGap) * 3, y, cardW, "Budget Restant", fcfa(remaining), remaining < 0 ? COLORS.danger : COLORS.success);

    y += 88;

    // Transaction count badge
    rect(doc, PAGE.marginX, y, PAGE.contentWidth, 36, COLORS.bgAccent, COLORS.accent);
    doc
      .fillColor(COLORS.accent)
      .font(FONTS.bold)
      .fontSize(10)
      .text(`${txCount} transaction${txCount > 1 ? "s" : ""} enregistrée${txCount > 1 ? "s" : ""}`, PAGE.marginX + 12, y + 12);

    // ── Progress bars ──
    y += 54;
    doc.fillColor(COLORS.primary).font(FONTS.bold).fontSize(11).text("UTILISATION DU BUDGET", PAGE.marginX, y);
    y += 18;
    divider(doc, y);
    y += 16;

    y = progressBar(doc, PAGE.marginX, y, PAGE.contentWidth, percentReal, "Consommation réelle");
    y += 4;
    y = progressBar(doc, PAGE.marginX, y, PAGE.contentWidth, percentEstimated, "Consommation estimée");

    // ── Footer ──
    pageFooter(doc, projectName(statistics));

    doc.end();
    return doc;
  }

  static generateProjectInvoicePDF(statistics: ProjectStatistics, transactions: any[] = []): PDFKit.PDFDocument {
    const doc = new PDFDocument({ margin: 0, size: "A4" });

    const budget = statistics.project?.initialBudget ?? 0;
    const accentColor = statistics.project?.color ?? COLORS.accent;

    // ── Header ──
    pageHeader(doc, "FACTURE PROJET", projectName(statistics), accentColor);

    // Project meta row
    let y = 100;
    rect(doc, PAGE.marginX, y, PAGE.contentWidth, 30, COLORS.bgLight, COLORS.border);

    doc
      .fillColor(COLORS.textLight)
      .font(FONTS.regular)
      .fontSize(9)
      .text("Projet :", PAGE.marginX + 10, y + 10);
    doc
      .fillColor(COLORS.textDark)
      .font(FONTS.bold)
      .fontSize(9)
      .text(statistics.project?.name ?? "N/A", PAGE.marginX + 50, y + 10);

    doc
      .fillColor(COLORS.textLight)
      .font(FONTS.regular)
      .fontSize(9)
      .text("Budget :", 360, y + 10);
    doc
      .fillColor(COLORS.accent)
      .font(FONTS.bold)
      .fontSize(9)
      .text(fcfa(budget), 400, y + 10);

    // ── Table header ──
    y += 44;
    rect(doc, PAGE.marginX, y, PAGE.contentWidth, 24, COLORS.primary);

    const cols = {
      name: PAGE.marginX + 8,
      desc: PAGE.marginX + 170,
      est: PAGE.marginX + 330,
      real: PAGE.marginX + 420,
    };

    doc
      .fillColor(COLORS.white)
      .font(FONTS.bold)
      .fontSize(9)
      .text("NOM", cols.name, y + 8)
      .text("DESCRIPTION", cols.desc, y + 8)
      .text("COÛT EST.", cols.est, y + 8)
      .text("COÛT RÉEL", cols.real, y + 8);

    y += 24;

    // ── Table rows ──
    doc.font(FONTS.regular).fontSize(9);

    if (transactions.length === 0) {
      rect(doc, PAGE.marginX, y, PAGE.contentWidth, 32, COLORS.bgLight);
      doc.fillColor(COLORS.textLight).text("Aucune transaction pour ce projet.", PAGE.marginX + 10, y + 11, {
        width: PAGE.contentWidth - 20,
        align: "center",
      });
      y += 32;
    } else {
      transactions.forEach((tx, index) => {
        // Add new page if needed — leave room for footer and totals
        if (y > PAGE.height - 130) {
          pageFooter(doc, projectName(statistics));
          doc.addPage({ margin: 0, size: "A4" });
          y = PAGE.marginY;

          // Repeat table header on new page
          rect(doc, PAGE.marginX, y, PAGE.contentWidth, 24, COLORS.primary);
          doc
            .fillColor(COLORS.white)
            .font(FONTS.bold)
            .fontSize(9)
            .text("NOM", cols.name, y + 8)
            .text("DESCRIPTION", cols.desc, y + 8)
            .text("COÛT EST.", cols.est, y + 8)
            .text("COÛT RÉEL", cols.real, y + 8);
          y += 24;
          doc.font(FONTS.regular).fontSize(9);
        }

        const rowBg = index % 2 === 0 ? COLORS.white : COLORS.bgLight;
        rect(doc, PAGE.marginX, y, PAGE.contentWidth, 22, rowBg, COLORS.border);

        doc
          .fillColor(COLORS.textDark)
          .text(tx.name ?? "", cols.name, y + 6, { width: 155, ellipsis: true })
          .fillColor(COLORS.textMid)
          .text(tx.description ?? "—", cols.desc, y + 6, { width: 150, ellipsis: true })
          .fillColor(COLORS.textDark)
          .text(fcfa(tx.estimatedCost), cols.est, y + 6, { width: 84 })
          .fillColor(tx.realCost > tx.estimatedCost ? COLORS.danger : COLORS.textDark)
          .text(fcfa(tx.realCost), cols.real, y + 6, { width: 84 });

        y += 22;
      });
    }

    // ── Totals block ──
    y += 8;
    divider(doc, y, COLORS.primary);
    y += 10;

    const totalsX = PAGE.marginX + 260;
    const totalsW = PAGE.contentWidth - 260;

    rect(doc, totalsX, y, totalsW, 72, COLORS.bgLight, COLORS.border);
    rect(doc, totalsX, y, 4, 72, COLORS.accent);

    doc
      .fillColor(COLORS.textLight)
      .font(FONTS.regular)
      .fontSize(9)
      .text("Total estimé", totalsX + 12, y + 8)
      .fillColor(COLORS.textDark)
      .font(FONTS.bold)
      .text(fcfa(statistics.totalEstimatedCost), totalsX + 110, y + 8, { align: "right", width: totalsW - 122 });

    doc
      .fillColor(COLORS.textLight)
      .font(FONTS.regular)
      .fontSize(9)
      .text("Total réel", totalsX + 12, y + 28)
      .fillColor((statistics.totalRealCost ?? 0) > (statistics.totalEstimatedCost ?? 0) ? COLORS.danger : COLORS.textDark)
      .font(FONTS.bold)
      .text(fcfa(statistics.totalRealCost), totalsX + 110, y + 28, { align: "right", width: totalsW - 122 });

    doc
      .fillColor(COLORS.textLight)
      .font(FONTS.regular)
      .fontSize(9)
      .text("Budget restant", totalsX + 12, y + 48)
      .fillColor((statistics.remainingBudget ?? 0) < 0 ? COLORS.danger : COLORS.success)
      .font(FONTS.bold)
      .text(fcfa(statistics.remainingBudget), totalsX + 110, y + 48, { align: "right", width: totalsW - 122 });

    pageFooter(doc, projectName(statistics));

    doc.end();
    return doc;
  }

  static generateProjectSummaryPDF(statistics: ProjectStatistics): PDFKit.PDFDocument {
    const doc = new PDFDocument({ margin: 0, size: "A4" });

    const project = statistics.project;
    const accentColor = project?.color ?? COLORS.accent;
    const budget = project?.initialBudget ?? 1;
    const realCost = statistics.totalRealCost ?? 0;
    const estimatedCost = statistics.totalEstimatedCost ?? 0;
    const remaining = statistics.remainingBudget ?? 0;
    const txCount = statistics.transactionCount ?? 0;
    const percentReal = (realCost / budget) * 100;
    const percentEstimated = (estimatedCost / budget) * 100;

    // ── Header ──
    pageHeader(doc, "RÉSUMÉ EXÉCUTIF", projectName(statistics), accentColor);

    // Project title band
    let y = 98;
    rect(doc, PAGE.marginX, y, PAGE.contentWidth, 48, accentColor);
    doc
      .fillColor(COLORS.white)
      .font(FONTS.bold)
      .fontSize(18)
      .text(project?.name ?? "Projet", PAGE.marginX + 14, y + 8, { width: PAGE.contentWidth - 100 });
    doc
      .fillColor(COLORS.white)
      .font(FONTS.regular)
      .fontSize(9)
      .opacity(0.85)
      .text(project?.description ?? "Aucune description", PAGE.marginX + 14, y + 32, {
        width: PAGE.contentWidth - 28,
        ellipsis: true,
      })
      .opacity(1);

    // ── Budget cards row ──
    y += 64;
    doc.fillColor(COLORS.primary).font(FONTS.bold).fontSize(10).text("TABLEAU DE BORD BUDGÉTAIRE", PAGE.marginX, y);
    y += 16;
    divider(doc, y);
    y += 12;

    const cW = (PAGE.contentWidth - 16) / 4;
    statCard(doc, PAGE.marginX, y, cW, "Budget Initial", fcfa(budget), accentColor);
    statCard(doc, PAGE.marginX + cW + 6, y, cW, "Coût Réel", fcfa(realCost), realCost > budget ? COLORS.danger : COLORS.success);
    statCard(doc, PAGE.marginX + (cW + 6) * 2, y, cW, "Coût Estimé", fcfa(estimatedCost), COLORS.warning);
    statCard(doc, PAGE.marginX + (cW + 6) * 3, y, cW, "Restant", fcfa(remaining), remaining < 0 ? COLORS.danger : COLORS.success);

    // ── Progress bars ──
    y += 90;
    doc.fillColor(COLORS.primary).font(FONTS.bold).fontSize(10).text("AVANCEMENT BUDGÉTAIRE", PAGE.marginX, y);
    y += 16;
    divider(doc, y);
    y += 16;

    y = progressBar(doc, PAGE.marginX, y, PAGE.contentWidth, percentReal, "Consommation réelle (dépenses effectives)");
    y += 6;
    y = progressBar(doc, PAGE.marginX, y, PAGE.contentWidth, percentEstimated, "Consommation estimée (projections)");

    // ── Summary metrics ──
    y += 20;
    doc.fillColor(COLORS.primary).font(FONTS.bold).fontSize(10).text("INDICATEURS CLÉS", PAGE.marginX, y);
    y += 16;
    divider(doc, y);
    y += 14;

    const metrics: [string, string, string][] = [
      ["Nombre de transactions", `${txCount}`, COLORS.accent],
      ["Statut budgétaire", remaining < 0 ? "⚠ Dépassement de budget" : "✓ Dans le budget", remaining < 0 ? COLORS.danger : COLORS.success],
      [
        "Écart estimé / réel",
        fcfa(Math.abs(estimatedCost - realCost)) + (realCost > estimatedCost ? " (surcoût)" : " (économie)"),
        realCost > estimatedCost ? COLORS.warning : COLORS.success,
      ],
    ];

    metrics.forEach(([label, value, color]) => {
      rect(doc, PAGE.marginX, y, PAGE.contentWidth, 28, COLORS.bgLight, COLORS.border);
      doc
        .fillColor(COLORS.textMid)
        .font(FONTS.regular)
        .fontSize(9)
        .text(label, PAGE.marginX + 10, y + 9);
      doc
        .fillColor(color)
        .font(FONTS.bold)
        .fontSize(9)
        .text(value, PAGE.marginX + 10, y + 9, { align: "right", width: PAGE.contentWidth - 20 });
      y += 30;
    });

    pageFooter(doc, projectName(statistics));

    doc.end();
    return doc;
  }
}
