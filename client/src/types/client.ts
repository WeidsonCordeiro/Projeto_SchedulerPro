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

/**
 * Payload para definir as credenciais de acesso do cliente ao portal
 * (POST /clients/:id/credentials). Server-side a senha é sempre hashed e
 * o utilizador criado com role CLIENT e mustChangePassword true.
 */
export interface SetClientCredentialsPayload {
  password: string;
  confirmPassword: string;
}