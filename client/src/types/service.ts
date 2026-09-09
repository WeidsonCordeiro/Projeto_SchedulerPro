export interface Service {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  duration: number;
  price: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateServicePayload {
  name: string;
  description?: string;
  duration: number;
  price: number;
}

export interface UpdateServicePayload {
  name?: string;
  description?: string;
  duration?: number;
  price?: number;
}