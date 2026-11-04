import type { PublicService } from "../../../types/publicBooking";
import {
  formatBookingDuration,
  formatBookingPrice,
} from "../../../config/publicBooking";

interface BookingServicePickerProps {
  services: PublicService[];
  selectedServiceId: string | null;
  onSelect: (serviceId: string) => void;
}

/**
 * Escolha do serviço.
 *
 * São `<input type="radio">` reais, escondidos por CSS mas Focusáveis, e não
 * uma lista de `<button>` com `onClick`. A diferença prática: com radios o
 * teclado passa a setas entre as opções e o leitor de ecrã anuncia
 * "selecionado" — coisas que teria de ser reconstruídas à mão com botões, e que
 * seria imediato divergir num dos browsers testados.
 */
export default function BookingServicePicker({
  services,
  selectedServiceId,
  onSelect,
}: BookingServicePickerProps) {
  return (
    <fieldset className="booking-choice-group">
      <legend className="booking-legend">Escolha o serviço</legend>
      <div className="booking-cards">
        {services.map((service) => {
          const isSelected = service.id === selectedServiceId;
          const inputId = `booking-service-${service.id}`;
          const duration = formatBookingDuration(service.durationMinutes);
          return (
            <div
              key={service.id}
              className={`booking-card${isSelected ? " is-selected" : ""}`}
            >
              <input
                className="booking-card-input"
                type="radio"
                name="booking-service"
                id={inputId}
                value={service.id}
                checked={isSelected}
                onChange={() => onSelect(service.id)}
              />
              <label className="booking-card-label" htmlFor={inputId}>
                <span className="booking-card-title">{service.name}</span>
                {service.description && (
                  <span className="booking-card-description">
                    {service.description}
                  </span>
                )}
                <span className="booking-card-meta">
                  {duration && <span>{duration}</span>}
                  <span>{formatBookingPrice(service.price)}</span>
                </span>
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}