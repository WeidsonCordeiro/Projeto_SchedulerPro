import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  MOBILE_CALENDAR_MEDIA_QUERY,
  useMatchMedia,
} from "../../hooks/useMatchMedia";
import {
  filterIanaTimezones,
  formatTimezoneOptionLabel,
  getIanaTimezones,
} from "../../config/timezones";

export interface TimezonePickerProps {
  id: string;
  label: string;
  value: string;
  onChange: (iana: string) => void;
  invalid?: boolean;
  errorMessage?: string;
  helperText?: string;
  disabled?: boolean;
  /** Mantém seleccionável um valor legado ausente da lista runtime. */
  ensureOption?: string;
}

const MOBILE_MODAL_TITLE = "Selecionar fuso horário";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((element) => !element.hasAttribute("disabled"));
}

function buildTimezoneOptions(ensureOption?: string): string[] {
  const base = getIanaTimezones();
  if (ensureOption && !base.includes(ensureOption)) {
    return [ensureOption, ...base];
  }
  return base;
}

export default function TimezonePicker({
  id,
  label,
  value,
  onChange,
  invalid = false,
  errorMessage,
  helperText,
  disabled = false,
  ensureOption,
}: TimezonePickerProps) {
  const isMobile = useMatchMedia(MOBILE_CALENDAR_MEDIA_QUERY);
  const reactId = useId();
  const listboxId = `${id}-listbox${reactId}`;
  const labelId = `${id}-label${reactId}`;
  const searchInputId = `${id}-search${reactId}`;
  const modalTitleId = `${id}-modal-title${reactId}`;

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const allZones = useMemo(
    () => buildTimezoneOptions(ensureOption),
    [ensureOption],
  );

  const filteredZones = useMemo(
    () => filterIanaTimezones(allZones, searchQuery),
    [allZones, searchQuery],
  );

  const selectedLabel = useMemo(
    () => formatTimezoneOptionLabel(value),
    [value],
  );

  const closePicker = useCallback(() => {
    setOpen(false);
    setSearchQuery("");
    triggerRef.current?.focus();
  }, []);

  const openPicker = useCallback(() => {
    if (disabled) {
      return;
    }
    setOpen(true);
    const visibleZones = filterIanaTimezones(allZones, "");
    const matchIndex = visibleZones.indexOf(value);
    setActiveIndex(matchIndex >= 0 ? matchIndex : 0);
  }, [allZones, disabled, value]);

  const selectZone = useCallback(
    (zone: string) => {
      onChange(zone);
      closePicker();
    },
    [closePicker, onChange],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    searchRef.current?.focus();

    if (!isMobile) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobile, open]);

  useEffect(() => {
    if (!open || isMobile) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        closePicker();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [closePicker, isMobile, open]);

  useEffect(() => {
    if (!open || !isMobile) {
      return;
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closePicker();
        return;
      }

      if (event.key !== "Tab" || !modalRef.current) {
        return;
      }

      const focusable = getFocusableElements(modalRef.current);
      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closePicker, isMobile, open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (filteredZones.length === 0) {
      setActiveIndex(-1);
      return;
    }
    setActiveIndex((current) => {
      if (current < 0 || current >= filteredZones.length) {
        return 0;
      }
      return current;
    });
  }, [filteredZones, open]);

  useEffect(() => {
    if (!open || activeIndex < 0) {
      return;
    }
    const activeEl = optionRefs.current.get(activeIndex);
    activeEl?.scrollIntoView?.({ block: "nearest" });
  }, [activeIndex, open]);

  function handleToggleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) {
      return;
    }
    if (
      event.key === "ArrowDown" ||
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      if (!open) {
        openPicker();
      }
    }
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closePicker();
      return;
    }

    if (filteredZones.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) =>
        current < filteredZones.length - 1 ? current + 1 : 0,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) =>
        current > 0 ? current - 1 : filteredZones.length - 1,
      );
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const zone = filteredZones[activeIndex];
      if (zone) {
        selectZone(zone);
      }
    }
  }

  function handleListboxKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closePicker();
    }
  }

  const activeDescendantId =
    open && activeIndex >= 0 && filteredZones[activeIndex]
      ? `${id}-option-${activeIndex}${reactId}`
      : undefined;

  const activeDescendantOnSearch = open && isMobile;
  const activeDescendantOnTrigger = open && !isMobile;

  const searchField = (
    <input
      ref={searchRef}
      id={searchInputId}
      type="search"
      className={`form-control ${isMobile ? "" : "form-control-sm"}`}
      placeholder="Pesquisar fuso horário…"
      value={searchQuery}
      aria-controls={listboxId}
      aria-label={`Pesquisar ${label}`}
      aria-expanded={open}
      aria-autocomplete="list"
      aria-activedescendant={
        activeDescendantOnSearch ? activeDescendantId : undefined
      }
      onChange={(event) => setSearchQuery(event.target.value)}
      onKeyDown={handleSearchKeyDown}
    />
  );

  const optionsList = (
    <div
      id={listboxId}
      role="listbox"
      aria-labelledby={isMobile ? modalTitleId : labelId}
      className={`timezone-picker__list list-group list-group-flush ${
        isMobile ? "timezone-picker__list--modal" : ""
      }`}
      tabIndex={-1}
      onKeyDown={handleListboxKeyDown}
    >
      {filteredZones.length === 0 ? (
        <div className="list-group-item text-muted small">
          Nenhum fuso horário encontrado.
        </div>
      ) : (
        filteredZones.map((zone, index) => {
          const isSelected = zone === value;
          const isActive = index === activeIndex;
          const optionId = `${id}-option-${index}${reactId}`;
          return (
            <button
              key={zone}
              id={optionId}
              type="button"
              role="option"
              aria-selected={isSelected}
              ref={(element) => {
                if (element) {
                  optionRefs.current.set(index, element);
                } else {
                  optionRefs.current.delete(index);
                }
              }}
              className={`list-group-item list-group-item-action text-start ${
                isActive ? "timezone-picker__option--active" : ""
              } ${isSelected ? "fw-semibold" : ""}`}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => selectZone(zone)}
            >
              {formatTimezoneOptionLabel(zone)}
            </button>
          );
        })
      )}
    </div>
  );

  let openSurface: ReactNode = null;

  if (open && isMobile) {
    openSurface = (
      <>
        <div className="modal-backdrop show" aria-hidden="true" />
        <div
          ref={modalRef}
          className="modal show d-block timezone-picker__modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={modalTitleId}
        >
          <div className="modal-dialog modal-fullscreen">
            <div className="modal-content">
              <div className="modal-header">
                <h2 className="modal-title h5" id={modalTitleId}>
                  {MOBILE_MODAL_TITLE}
                </h2>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Fechar"
                  onClick={closePicker}
                />
              </div>
              <div className="modal-body d-flex flex-column gap-2 timezone-picker__modal-body">
                {searchField}
                {optionsList}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  } else if (open && !isMobile) {
    openSurface = (
      <div className="timezone-picker__menu border rounded shadow-sm bg-body">
        <div className="p-2 border-bottom">{searchField}</div>
        {optionsList}
      </div>
    );
  }

  return (
    <div className="timezone-picker mb-3" ref={containerRef}>
      <label id={labelId} htmlFor={id} className="form-label">
        {label}
      </label>

      <div className="timezone-picker__control position-relative">
        <button
          ref={triggerRef}
          id={id}
          type="button"
          className={`form-select text-start timezone-picker__trigger ${
            invalid ? "is-invalid" : ""
          }`}
          role="combobox"
          aria-labelledby={labelId}
          aria-controls={listboxId}
          aria-expanded={open}
          aria-haspopup={isMobile ? "dialog" : "listbox"}
          aria-activedescendant={
            activeDescendantOnTrigger ? activeDescendantId : undefined
          }
          disabled={disabled}
          onClick={() => (open ? closePicker() : openPicker())}
          onKeyDown={handleToggleKeyDown}
        >
          {selectedLabel}
        </button>

        {openSurface}
      </div>

      {invalid && errorMessage && (
        <div className="invalid-feedback d-block">{errorMessage}</div>
      )}
      {helperText && !invalid && (
        <div className="form-text">{helperText}</div>
      )}

      <style>{`
        .timezone-picker__menu {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          z-index: 1050;
          margin-top: 0.25rem;
        }
        .timezone-picker__list {
          max-height: 40vh;
          overflow-y: auto;
        }
        .timezone-picker__list--modal {
          flex: 1 1 auto;
          min-height: 0;
          max-height: none;
          overflow-y: auto;
        }
        .timezone-picker__modal-body {
          min-height: 0;
          overflow: hidden;
        }
        .timezone-picker__modal {
          z-index: 1055;
        }
        .timezone-picker__trigger:disabled {
          cursor: not-allowed;
        }
        .timezone-picker__option--active {
          background-color: var(--bs-secondary-bg);
        }
      `}</style>
    </div>
  );
}
