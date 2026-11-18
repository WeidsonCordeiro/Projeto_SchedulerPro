/**
 * Identificadores ObjectId fixos para testes multi-tenant HTTP.
 * Reutilizados em vários ficheiros de integração (Bloco A/C).
 */
export const TENANT_IDS = {
  companyA: "507f1f77bcf86cd799439011",
  companyB: "507f1f77bcf86cd799439012",
  userA: "507f1f77bcf86cd799439021",
  userB: "507f1f77bcf86cd799439022",
  clientA: "507f1f77bcf86cd799439031",
  clientB: "507f1f77bcf86cd799439032",
  serviceA: "507f1f77bcf86cd799439041",
  serviceB: "507f1f77bcf86cd799439042",
  employeeA: "507f1f77bcf86cd799439051",
  employeeB: "507f1f77bcf86cd799439052",
} as const;

export const ref = (id: string) => ({ toString: () => id });

export const activeCompany = (id: string) => ({
  _id: ref(id),
  timezone: "Europe/Lisbon",
  isActive: true,
  deletedAt: null,
});