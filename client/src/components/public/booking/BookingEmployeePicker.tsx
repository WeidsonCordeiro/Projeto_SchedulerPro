import ImageAvatar from "../../common/ImageAvatar";
import { toBookingAvatarImage } from "../../../config/publicBooking";
import type { PublicEmployee } from "../../../types/publicBooking";

interface BookingEmployeePickerProps {
  employees: PublicEmployee[];
  selectedEmployeeId: string | null;
  onSelect: (employeeId: string) => void;
}

/**
 * Escolha do profissional.
 *
 * A lista NÃO é filtrada pelo serviço escolhido: o backend não tem relação
 * serviço × profissional (Part 4 — a elegibilidade de um profissional é
 * "está ativo e tem role operacional"), pelo que filtrar aqui esconderia
 * exatamente as pessoas que a empresa aceita e mostraria uma lista incompleta
 * sem explicação.
 *
 * `ImageAvatar` trata do caso sem fotografia: desenha as iniciais, por isso
 * nunca há um cartão com um imagem partida.
 */
export default function BookingEmployeePicker({
  employees,
  selectedEmployeeId,
  onSelect,
}: BookingEmployeePickerProps) {
  return (
    <fieldset className="booking-choice-group">
      <legend className="booking-legend">Escolha o profissional</legend>
      <div className="booking-cards booking-cards-people">
        {employees.map((employee) => {
          const isSelected = employee.id === selectedEmployeeId;
          const inputId = `booking-employee-${employee.id}`;
          return (
            <div
              key={employee.id}
              className={`booking-card${isSelected ? " is-selected" : ""}`}
            >
              <input
                className="booking-card-input"
                type="radio"
                name="booking-employee"
                id={inputId}
                value={employee.id}
                checked={isSelected}
                onChange={() => onSelect(employee.id)}
              />
              <label className="booking-card-label" htmlFor={inputId}>
                <ImageAvatar
                  image={toBookingAvatarImage(employee.avatarUrl)}
                  name={employee.name}
                  size="lg"
                  shape="circle"
                />
                <span className="booking-card-title">{employee.name}</span>
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}