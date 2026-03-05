import { ProjectMapper } from "@/mappers";
import { ProjectServices } from "@/services";
import { handler } from "@/utilities/handler";
import { createLogger } from "@/utilities/logger";
import { PdfGeneratorService } from "@/utilities/pdf-generator";
import { ProjectValidator } from "@/validator";

const log = createLogger("ProjectController");

export class ProjectController {
  static readonly create = handler(async ({ req, accountId }) => {
    log.info(`Creating project for account=${accountId}`);

    ProjectValidator.create(req.body);
    const data = await ProjectServices.create(accountId, req.body);

    return ProjectMapper.toRest(data);
  });

  static readonly update = handler(async ({ req, accountId }) => {
    const { projectId } = req.params as Record<string, string>;
    log.info(`Updating project=${projectId} for account=${accountId}`);

    ProjectValidator.create(req.body);
    const data = await ProjectServices.update(accountId, projectId, req.body);

    return ProjectMapper.toRest(data);
  });

  static readonly getOne = handler(async ({ req, accountId }) => {
    const { projectId } = req.params as Record<string, string>;
    log.info(`Fetching project=${projectId} for account=${accountId}`);

    const data = await ProjectServices.getOneById(accountId, projectId);

    return ProjectMapper.toRest(data);
  });

  static readonly getAll = handler(async ({ req, accountId }) => {
    const { page = "1", pageSize = "10" } = req.query as Record<string, string>;
    log.info(`Fetching all projects for account=${accountId}`);

    const data = await ProjectServices.getAll(accountId, {
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      name: req.query.name as string | undefined,
      isArchived: req.query.isArchived ? req.query.isArchived === "true" : false,
    });

    return data.values.map(ProjectMapper.toRest.bind(ProjectMapper));
  });

  static readonly archiveOne = handler(async ({ req, accountId }) => {
    const { projectId } = req.params as Record<string, string>;
    log.info(`Archiving project=${projectId} for account=${accountId}`);

    const data = await ProjectServices.archiveOneById(accountId, projectId);

    return ProjectMapper.toRest(data);
  });

  static readonly delete = handler(async ({ req, accountId }) => {
    const { projectId } = req.params as Record<string, string>;
    log.info(`Deleting project=${projectId} for account=${accountId}`);

    const data = await ProjectServices.deleteOneById(accountId, projectId);

    return ProjectMapper.toRest(data);
  });

  static readonly createTransaction = handler(async ({ req, accountId }) => {
    const { projectId } = req.params as Record<string, string>;
    log.info(`Creating transaction for project=${projectId} account=${accountId}`);

    ProjectValidator.createTransaction(req.body);
    const data = await ProjectServices.createTransaction(accountId, projectId, req.body);

    return ProjectMapper.transactionToRest(data);
  });

  static readonly updateTransaction = handler(async ({ req, accountId }) => {
    const { projectId, transactionId } = req.params as Record<string, string>;
    log.info(`Updating transaction=${transactionId} for project=${projectId}`);

    ProjectValidator.updateTransaction(req.body);
    const data = await ProjectServices.updateTransaction(accountId, projectId, transactionId, req.body);

    return ProjectMapper.transactionToRest(data);
  });

  static readonly getTransaction = handler(async ({ req, accountId }) => {
    const { projectId, transactionId } = req.params as Record<string, string>;
    log.info(`Fetching transaction=${transactionId} for project=${projectId}`);

    const data = await ProjectServices.getTransactionById(accountId, projectId, transactionId);

    return ProjectMapper.transactionToRest(data);
  });

  static readonly getTransactions = handler(async ({ req, accountId }) => {
    const { projectId } = req.params as Record<string, string>;
    log.info(`Fetching all transactions for project=${projectId}`);

    const data = await ProjectServices.getTransactionsByProject(accountId, projectId);

    return data.map(ProjectMapper.transactionToRest.bind(ProjectMapper));
  });

  static readonly deleteTransaction = handler(async ({ req, accountId }) => {
    const { projectId, transactionId } = req.params as Record<string, string>;
    log.info(`Deleting transaction=${transactionId} for project=${projectId}`);

    const data = await ProjectServices.deleteTransaction(accountId, projectId, transactionId);

    return ProjectMapper.transactionToRest(data);
  });

  static readonly getStatistics = handler(async ({ req, accountId }) => {
    const { projectId } = req.params as Record<string, string>;
    log.info(`Fetching statistics for project=${projectId}`);

    const data = await ProjectServices.getStatistics(accountId, projectId);

    return ProjectMapper.statisticsToRest(data);
  });

  static readonly generateStatisticsPDF = handler(async ({ req, res, accountId }) => {
    const { projectId } = req.params as Record<string, string>;
    log.info(`Generating statistics PDF for project=${projectId}`);

    const statistics = await ProjectServices.getStatistics(accountId, projectId);
    const pdfStream = PdfGeneratorService.generateProjectStatisticsPDF(ProjectMapper.statisticsToRest(statistics));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="statistics-${projectId}.pdf"`);
    pdfStream.pipe(res);

    return null; // handler won't call res.json — we piped manually
  });

  static readonly generateInvoicePDF = handler(async ({ req, res, accountId }) => {
    const { projectId } = req.params as Record<string, string>;
    log.info(`Generating invoice PDF for project=${projectId}`);

    const statistics = await ProjectServices.getStatistics(accountId, projectId);
    const transactions = await ProjectServices.getTransactionsByProject(accountId, projectId);
    const pdfStream = PdfGeneratorService.generateProjectInvoicePDF(
      ProjectMapper.statisticsToRest(statistics),
      transactions.map(ProjectMapper.transactionToRest.bind(ProjectMapper)),
    );
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="invoice-${projectId}.pdf"`);
    pdfStream.pipe(res);

    return null;
  });

  static readonly generateSummaryPDF = handler(async ({ req, res, accountId }) => {
    const { projectId } = req.params as Record<string, string>;
    log.info(`Generating summary PDF for project=${projectId}`);

    const statistics = await ProjectServices.getStatistics(accountId, projectId);
    const pdfStream = PdfGeneratorService.generateProjectSummaryPDF(ProjectMapper.statisticsToRest(statistics));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="summary-${projectId}.pdf"`);
    pdfStream.pipe(res);

    return null;
  });
}
