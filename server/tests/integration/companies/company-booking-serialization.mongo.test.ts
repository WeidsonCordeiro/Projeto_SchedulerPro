import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import Company from "../../../src/modules/companies/models/Company.model";
import CompanyRepository from "../../../src/modules/companies/repositories/CompanyRepository";

const NOW = new Date("2028-01-01T00:00:00.000Z");

let replSet: MongoMemoryReplSet | undefined;

async function connectTestDatabase(): Promise<void> {
  const externalUri = process.env.GW3_TEST_MONGO_URI?.trim();

  if (externalUri) {
    await mongoose.connect(externalUri);
    await Company.syncIndexes();
    return;
  }

  replSet = await MongoMemoryReplSet.create({
    instanceOpts: [{ launchTimeout: 120_000 }],
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  await mongoose.connect(replSet.getUri());
  await Company.syncIndexes();
}

async function readSerializationVersion(companyId: string): Promise<number> {
  const doc = await Company.findById(companyId).select(
    "+bookingSerializationVersion",
  );
  return doc?.bookingSerializationVersion ?? -1;
}

describe("Company bookingSerializationVersion (mongo)", () => {
  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    await connectTestDatabase();
  }, 120_000);

  afterAll(async () => {
    vi.useRealTimers();
    await mongoose.disconnect();
    if (replSet) {
      await replSet.stop();
    }
  }, 60_000);

  beforeEach(async () => {
    await Company.deleteMany({});
  });

  it("nova empresa inicia com bookingSerializationVersion = 0", async () => {
    const company = await Company.create({
      name: `serial-co-${Date.now()}`,
      timezone: "UTC",
      isActive: true,
    });

    expect(await readSerializationVersion(company._id.toString())).toBe(0);
  });

  it("touchBookingSerialization incrementa o contador", async () => {
    const company = await Company.create({
      name: `serial-inc-${Date.now()}`,
      timezone: "UTC",
      isActive: true,
    });
    const id = company._id.toString();
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        const touched = await CompanyRepository.touchBookingSerialization(
          id,
          session,
        );
        expect(touched).not.toBeNull();
      });
    } finally {
      await session.endSession();
    }

    expect(await readSerializationVersion(id)).toBe(1);
  });

  it("duas touches consecutivas com relógio congelado incrementam duas vezes", async () => {
    const company = await Company.create({
      name: `serial-frozen-${Date.now()}`,
      timezone: "UTC",
      isActive: true,
    });
    const id = company._id.toString();
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        await CompanyRepository.touchBookingSerialization(id, session);
        await CompanyRepository.touchBookingSerialization(id, session);
      });
    } finally {
      await session.endSession();
    }

    expect(await readSerializationVersion(id)).toBe(2);
  });

  it("documento legado sem o campo passa a versão 1 na primeira touch", async () => {
    const rawId = new mongoose.Types.ObjectId();
    const id = rawId.toString();

    await Company.collection.insertOne({
      _id: rawId,
      name: `legacy-${Date.now()}`,
      timezone: "UTC",
      isActive: true,
      createdAt: NOW,
      updatedAt: NOW,
      deletedAt: null,
    });

    const legacyDocument = await Company.collection.findOne({ _id: rawId });
    expect(legacyDocument).toBeTruthy();
    expect(legacyDocument).not.toHaveProperty("bookingSerializationVersion");

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const touched = await CompanyRepository.touchBookingSerialization(
          id,
          session,
        );
        expect(touched).not.toBeNull();
      });
    } finally {
      await session.endSession();
    }

    expect(await readSerializationVersion(id)).toBe(1);

    const persisted = await Company.collection.findOne({ _id: rawId });
    expect(persisted?.bookingSerializationVersion).toBe(1);
  });

  it("toJSON não expõe bookingSerializationVersion", async () => {
    const name = `serial-json-${Date.now()}`;
    const company = await Company.create({
      name,
      timezone: "UTC",
      isActive: true,
    });

    const serialized = company.toJSON() as Record<string, unknown>;

    expect(serialized).not.toHaveProperty("bookingSerializationVersion");
    expect(serialized.name).toBe(name);
    expect(serialized.timezone).toBe("UTC");
    expect(serialized.isActive).toBe(true);
  });

  it("empresa eliminada não é actualizada por touchBookingSerialization", async () => {
    const company = await Company.create({
      name: `serial-del-${Date.now()}`,
      timezone: "UTC",
      isActive: false,
      deletedAt: NOW,
    });
    const id = company._id.toString();
    const session = await mongoose.startSession();

    try {
      let result: unknown;
      await session.withTransaction(async () => {
        result = await CompanyRepository.touchBookingSerialization(id, session);
      });
      expect(result).toBeNull();
    } finally {
      await session.endSession();
    }

    expect(await readSerializationVersion(id)).toBe(0);
  });

  it("touch dentro de transação com session comita sem erro", async () => {
    const company = await Company.create({
      name: `serial-txn-${Date.now()}`,
      timezone: "UTC",
      isActive: true,
    });
    const id = company._id.toString();
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        const touched = await CompanyRepository.touchBookingSerialization(
          id,
          session,
        );
        expect(touched?.isActive).toBe(true);
      });
    } finally {
      await session.endSession();
    }

    expect(await readSerializationVersion(id)).toBe(1);
  });
});