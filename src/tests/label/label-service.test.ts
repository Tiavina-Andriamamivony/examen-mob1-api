import { beforeEach, describe, expect, it, vi } from "vitest";

import { getPrismaClient } from "@/configs";
import { BadRequestError, NotFoundError } from "@/errors";
import { LabelServices } from "@/services/label-services";

import { LABEL_ACCOUNT_ID, LABEL_ID, makePrismaLabel, makeRestLabel } from "../fixtures/label.fixtures";

vi.mock("@/configs", () => ({ getPrismaClient: vi.fn() }));
vi.mock("@/mappers", () => ({
  LabelMapper: {
    create: vi.fn((accountId, label) => ({ ...label, accountId, id: "new-id" })),
    update: vi.fn((accountId, label) => ({ ...label, accountId })),
  },
}));

const mockDb = {
  label: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  $transaction: vi.fn(),
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getPrismaClient).mockReturnValue(mockDb as any);
});

describe("LabelServices", () => {
  describe("create", () => {
    it("should create a label successfully", async () => {
      const label = makePrismaLabel();
      mockDb.label.findFirst.mockResolvedValue(null);
      mockDb.label.create.mockResolvedValue(label);

      const result = await LabelServices.create(LABEL_ACCOUNT_ID, makeRestLabel());

      expect(mockDb.label.findFirst).toHaveBeenCalledWith({
        where: { name: "Food", accountId: LABEL_ACCOUNT_ID, isArchived: false },
      });
      expect(mockDb.label.create).toHaveBeenCalled();
      expect(result).toEqual(label);
    });

    it("should throw BadRequestError when name already exists", async () => {
      mockDb.label.findFirst.mockResolvedValue(makePrismaLabel());

      await expect(LabelServices.create(LABEL_ACCOUNT_ID, makeRestLabel())).rejects.toThrow(BadRequestError);
      expect(mockDb.label.create).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("should update a label successfully", async () => {
      const label = makePrismaLabel();
      mockDb.label.findFirst.mockResolvedValueOnce(label).mockResolvedValueOnce(null);
      mockDb.label.update.mockResolvedValue(label);

      const result = await LabelServices.update(LABEL_ACCOUNT_ID, makeRestLabel());

      expect(mockDb.label.update).toHaveBeenCalled();
      expect(result).toEqual(label);
    });

    it("should throw NotFoundError when label does not exist", async () => {
      mockDb.label.findFirst.mockResolvedValue(null);

      await expect(LabelServices.update(LABEL_ACCOUNT_ID, makeRestLabel())).rejects.toThrow(NotFoundError);
      expect(mockDb.label.update).not.toHaveBeenCalled();
    });

    it("should throw NotFoundError when label is archived", async () => {
      mockDb.label.findFirst.mockResolvedValue(makePrismaLabel({ isArchived: true }));

      await expect(LabelServices.update(LABEL_ACCOUNT_ID, makeRestLabel())).rejects.toThrow(NotFoundError);
    });

    it("should throw BadRequestError when name conflicts with another label", async () => {
      mockDb.label.findFirst.mockResolvedValueOnce(makePrismaLabel()).mockResolvedValueOnce(makePrismaLabel({ id: "other-label" }));

      await expect(LabelServices.update(LABEL_ACCOUNT_ID, makeRestLabel())).rejects.toThrow(BadRequestError);
      expect(mockDb.label.update).not.toHaveBeenCalled();
    });
  });

  describe("getOneById", () => {
    it("should return label when found", async () => {
      const label = makePrismaLabel();
      mockDb.label.findFirst.mockResolvedValue(label);

      const result = await LabelServices.getOneById(LABEL_ACCOUNT_ID, LABEL_ID);

      expect(mockDb.label.findFirst).toHaveBeenCalledWith({
        where: { id: LABEL_ID, accountId: LABEL_ACCOUNT_ID, isArchived: false },
      });
      expect(result).toEqual(label);
    });

    it("should throw NotFoundError when label does not exist", async () => {
      mockDb.label.findFirst.mockResolvedValue(null);

      await expect(LabelServices.getOneById(LABEL_ACCOUNT_ID, LABEL_ID)).rejects.toThrow(NotFoundError);
    });
  });

  describe("archiveOneById", () => {
    it("should archive label successfully", async () => {
      const label = makePrismaLabel();
      mockDb.label.findFirst.mockResolvedValue(label);
      mockDb.label.update.mockResolvedValue({ ...label, isArchived: true });

      const result = await LabelServices.archiveOneById(LABEL_ACCOUNT_ID, LABEL_ID);

      expect(mockDb.label.update).toHaveBeenCalledWith({
        data: { isArchived: true },
        where: { id: LABEL_ID, accountId: LABEL_ACCOUNT_ID },
      });
      expect(result.isArchived).toBe(true);
    });

    it("should throw NotFoundError when label does not exist", async () => {
      mockDb.label.findFirst.mockResolvedValue(null);

      await expect(LabelServices.archiveOneById(LABEL_ACCOUNT_ID, LABEL_ID)).rejects.toThrow(NotFoundError);
    });
  });

  describe("getAll", () => {
    it("should return labels and count", async () => {
      const labels = [makePrismaLabel(), makePrismaLabel({ id: "label-2", name: "Transport" })];
      mockDb.$transaction.mockResolvedValue([labels, 2]);

      const result = await LabelServices.getAll(LABEL_ACCOUNT_ID, { page: 1, pageSize: 10 });

      expect(result.values).toEqual(labels);
      expect(result.count).toBe(2);
    });

    it("should not return archived labels", async () => {
      mockDb.$transaction.mockResolvedValue([[], 0]);

      await LabelServices.getAll(LABEL_ACCOUNT_ID, { page: 1, pageSize: 10 });

      expect(mockDb.$transaction).toHaveBeenCalled();
    });
  });
});
