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
import User from "../../../src/modules/users/models/User.model";
import UserRepository from "../../../src/modules/users/repositories/UserRepository";
import { Role } from "../../../src/constants/roles";

let replSet: MongoMemoryReplSet | undefined;

async function connectTestDatabase(): Promise<void> {
  const externalUri = process.env.GW3_TEST_MONGO_URI?.trim();

  if (externalUri) {
    await mongoose.connect(externalUri);
    await User.syncIndexes();
    return;
  }

  replSet = await MongoMemoryReplSet.create({
    instanceOpts: [{ launchTimeout: 120_000 }],
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  await mongoose.connect(replSet.getUri());
  await User.syncIndexes();
}

async function seedCompany(label: string) {
  return Company.create({
    name: `iso-user-co-${label}-${Date.now()}`,
    timezone: "UTC",
    isActive: true,
  });
}

describe("Bloco B — Users tenant isolation (MongoDB)", () => {
  let companyA: Types.ObjectId;
  let companyB: Types.ObjectId;
  let userBId: Types.ObjectId;

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
    await User.deleteMany({});
    await Company.deleteMany({});

    const coA = await seedCompany("a");
    const coB = await seedCompany("b");
    companyA = coA._id;
    companyB = coB._id;

    await User.create({
      name: "Staff A",
      email: `staff-a-${Date.now()}@test.local`,
      passwordHash: "hash",
      companyId: companyA,
      role: Role.EMPLOYEE,
      isActive: true,
      emailVerified: true,
      phoneVerified: false,
      failedLoginAttempts: 0,
      mustChangePassword: false,
    });

    const userB = await User.create({
      name: "Staff B",
      email: `staff-b-${Date.now()}@test.local`,
      passwordHash: "hash",
      companyId: companyB,
      role: Role.EMPLOYEE,
      isActive: true,
      emailVerified: true,
      phoneVerified: false,
      failedLoginAttempts: 0,
      mustChangePassword: false,
    });
    userBId = userB._id;
  });

  it("findByCompanyId não mistura utilizadores de tenants", async () => {
    const usersA = await UserRepository.findByCompanyId(companyA.toString());
    const usersB = await UserRepository.findByCompanyId(companyB.toString());

    expect(usersA).toHaveLength(1);
    expect(usersB).toHaveLength(1);
    expect(usersA[0]?.companyId.toString()).toBe(companyA.toString());
    expect(usersB[0]?.companyId.toString()).toBe(companyB.toString());
  });

  it("findById devolve utilizador mas validação de tenant é responsabilidade do service", async () => {
    const user = await UserRepository.findById(userBId);

    expect(user).not.toBeNull();
    expect(user?.companyId.toString()).toBe(companyB.toString());
  });

  it("softDelete por ID global afecta documento — serviço impede cross-tenant no HTTP", async () => {
    /**
     * Documenta limitação: o repositório expõe softDelete por id sem companyId.
     * O isolamento HTTP depende de UserService.findById / delete.
     */
    await UserRepository.softDelete(userBId.toString());

    const deleted = await UserRepository.findById(userBId);
    expect(deleted).toBeNull();
  });
});