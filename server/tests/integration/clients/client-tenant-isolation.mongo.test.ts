import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose, { Types } from "mongoose";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import Company from "../../../src/modules/companies/models/Company.model";
import Client from "../../../src/modules/Clients/models/Client.model";
import ClientRepository from "../../../src/modules/Clients/repositories/ClientRepository";

let replSet: MongoMemoryReplSet | undefined;

async function connectTestDatabase(): Promise<void> {
  const externalUri = process.env.GW3_TEST_MONGO_URI?.trim();

  if (externalUri) {
    await mongoose.connect(externalUri);
    await Client.syncIndexes();
    return;
  }

  replSet = await MongoMemoryReplSet.create({
    instanceOpts: [{ launchTimeout: 120_000 }],
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  await mongoose.connect(replSet.getUri());
  await Client.syncIndexes();
}

async function seedCompany(label: string) {
  return Company.create({
    name: `iso-client-co-${label}-${Date.now()}`,
    timezone: "UTC",
    isActive: true,
  });
}

describe("Bloco B — Clients tenant isolation (MongoDB)", () => {
  let companyA: Types.ObjectId;
  let companyB: Types.ObjectId;
  let clientBId: Types.ObjectId;

  beforeAll(async () => {
    await connectTestDatabase();
  }, 120_000);

  afterAll(async () => {
    if (replSet) {
      await mongoose.disconnect();
      await replSet.stop();
    } else {
      await mongoose.disconnect();
    }
  });

  beforeEach(async () => {
    await Client.deleteMany({});
    await Company.deleteMany({});

    const coA = await seedCompany("a");
    const coB = await seedCompany("b");
    companyA = coA._id;
    companyB = coB._id;

    const clientB = await Client.create({
      name: "Cliente B",
      email: `b-${Date.now()}@test.local`,
      phone: "910000002",
      companyId: companyB,
      isActive: true,
    });
    clientBId = clientB._id;

    await Client.create({
      name: "Cliente A",
      email: `a-${Date.now()}@test.local`,
      phone: "910000001",
      companyId: companyA,
      isActive: true,
    });
  });

  it("findByCompanyId da empresa A não devolve clientes da B", async () => {
    const clients = await ClientRepository.findByCompanyId(companyA);

    expect(clients).toHaveLength(1);
    expect(clients[0]?.companyId.toString()).toBe(companyA.toString());
  });

  it("findByIdAndCompany com tenant errado devolve null", async () => {
    const doc = await ClientRepository.findByIdAndCompany(
      clientBId,
      companyA,
    );

    expect(doc).toBeNull();
  });

  it("update com companyId da sessão A não altera cliente da B", async () => {
    const updated = await ClientRepository.update(
      clientBId.toString(),
      companyA,
      { name: "Hack" },
    );

    expect(updated).toBeNull();

    const stillB = await ClientRepository.findByIdAndCompany(
      clientBId,
      companyB,
    );
    expect(stillB?.name).toBe("Cliente B");
  });

  it("softDelete com tenant A não elimina cliente da B", async () => {
    await ClientRepository.softDelete(clientBId.toString(), companyA);

    const stillThere = await ClientRepository.findByIdAndCompany(
      clientBId,
      companyB,
    );
    expect(stillThere).not.toBeNull();
  });
});