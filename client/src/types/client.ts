import type { StoredImage } from "./image";

export interface ClientPortalAccess {
  exists: boolean;
  isActive: boolean;
}

export interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  companyId: string;
  notes: string | null;
  /**
   * Foto do cliente. `null`/ausente quando não existe imagem.
   * Opcional para tolerar respostas parciais; o backend devolve sempre
   * `{ url, publicId } | null`.
   */
  avatar?: StoredImage | null;
  isActive: boolean;
  portalAccess: ClientPortalAccess;
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