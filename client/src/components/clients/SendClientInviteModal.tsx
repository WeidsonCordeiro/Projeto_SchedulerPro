import { useState } from "react";
import type { FormEvent } from "react";
import clientsApi from "../../api/endpoints/clients.api";
import { getApiError, getFriendlyErrorMessage } from "../../api/errors";
import type { Client } from "../../types/client";

interface SendClientInviteModalProps {
  isOpen: boolean;
  client: Client;
  onClose: () => void;
  onSent: (email: string) => void;
}

/**
 * Modal de confirmação da emissão de convite de conta CLIENT.
 *
 * O e-mail já vai no cadastro do cliente — aqui só se confirma o
 * envio. O backend emite o token, envia o link e responde apenas
 * com a validade; o token nunca chega ao browser.
 *
 * Erros (409 de "já tem conta", e-mail inválido, falha de envio)
 * ficam no modal para quem a ação possa corrigir, sem fechar a
 * janela.
 */
export default function SendClientInviteModal({
  isOpen,
  client,
  onClose,
  onSent,
}: SendClientInviteModalProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleClose() {
    if (isSubmitting) {
      return;
    }
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    setIsSubmitting(true);
    try {
      await clientsApi.sendClientInvite(client.id);
      onSent(client.email ?? "");
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(getApiError(error)));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal show d-block" role="dialog" aria-modal="true">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h2 className="modal-title h5">Enviar convite de acesso</h2>
            <button
              type="button"
              className="btn-close"
              aria-label="Fechar"
              onClick={handleClose}
              disabled={isSubmitting}
            />
          </div>

          <div className="modal-body">
            <p className="text-muted">
              Será enviado um convite para <strong>{client.email}</strong> com
              um link para <strong>{client.name}</strong> definir a própria
              senha e criar a conta de acesso. O link expira em 7 dias e só
              pode ser usado uma vez — um novo convite invalida o anterior.
            </p>

            {errorMessage && (
              <div className="alert alert-danger" role="alert">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="modal-footer px-0 pb-0 d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting && (
                    <span
                      className="spinner-border spinner-border-sm me-1"
                      aria-hidden="true"
                    />
                  )}
                  {isSubmitting ? "Enviando..." : "Enviar convite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
