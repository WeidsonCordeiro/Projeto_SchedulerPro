import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { StoredImage } from "../../types/image";

/**
 * Iniciais para o placeholder: primeiras letras das duas primeiras palavras.
 * Ex.: "Ana Silva" -> "AS"; "Ana" -> "A".
 */
export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export type ImageAvatarKind = "person" | "company";
export type ImageAvatarSize = "sm" | "md" | "lg";
export type ImageAvatarShape = "rounded" | "circle";

interface ImageAvatarProps {
  /** Imagem a apresentar. Ausente/`null` mostra o placeholder. */
  image?: StoredImage | null;
  /** Nome da entidade; alimenta as iniciais e o texto alternativo padrão. */
  name?: string;
  /** Texto alternativo explícito. `""` marca a imagem como decorativa. */
  alt?: string;
  /** "person" usa iniciais; "company" usa a inicial do nome. */
  kind?: ImageAvatarKind;
  size?: ImageAvatarSize;
  shape?: ImageAvatarShape;
  className?: string;
  /** Conteúdo alternativo ao placeholder (ex.: ícone). */
  fallbackIcon?: ReactNode;
}

/**
 * Apresentação visual de uma imagem (avatar/logo) com placeholder offline.
 *
 * Puramente visual: não faz pedidos, não conhece a API. Se a imagem falhar ao
 * carregar (`onError`), volta de forma permanente ao placeholder, evitando
 * ciclos de recarregamento de uma URL quebrada.
 */
export default function ImageAvatar({
  image,
  name = "",
  alt,
  kind = "person",
  size = "md",
  shape = "circle",
  className = "",
  fallbackIcon,
}: ImageAvatarProps) {
  const [hasFailed, setHasFailed] = useState(false);
  const url = image?.url ?? null;

  useEffect(() => {
    setHasFailed(false);
  }, [url]);

  const showImage = Boolean(url) && !hasFailed;
  const label = alt ?? name;
  const placeholderText =
    kind === "company"
      ? name.trim().charAt(0).toUpperCase()
      : getInitials(name);

  const classes = [
    "entity-avatar",
    `entity-avatar-${size}`,
    `entity-avatar-${shape}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (showImage) {
    return (
      <span className={classes}>
        <img
          src={url as string}
          alt={label}
          className="entity-avatar-img"
          onError={() => setHasFailed(true)}
        />
      </span>
    );
  }

  return (
    <span
      className={classes}
      role={label ? "img" : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
    >
      {placeholderText || fallbackIcon || "?"}
    </span>
  );
}
