export interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  companyId: string;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientPayload {
  name: string;
  email?: string;
  phone: string;
  notes?: string;
}

export interface UpdateClientPayload {
  name?: string;
  email?: string;
  phone?: string;
  notes?: string;
}