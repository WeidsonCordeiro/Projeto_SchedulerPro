import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DateTime } from "luxon";
import appointmentsApi from "../api/endpoints/appointments.api";
import clientsApi from "../api/endpoints/clients.api";
import servicesApi from "../api/endpoints/services.api";
import employeesApi from "../api/endpoints/employees.api";
import { getApiError, getFriendlyErrorMessage } from "../api/errors";
import type { CalendarViewType } from "../config/appointmentCalendar";
import {
  getDayRange,
  getMonthGridRange,
  getWeekRange,
} from "../config/appointmentCalendar";
import type { Appointment } from "../types/appointment";
import type { Client } from "../types/client";
import type { Employee } from "../types/employee";
import type { Service } from "../types/service";

function canLoadNames(role: string | undefined | null): boolean {
  return Boolean(role) && role !== "CLIENT";
}

export function computeAppointmentsRange(
  viewType: CalendarViewType,
  currentDateKey: string,
  timezone: string,
): { startAt: string; endAt: string } {
  switch (viewType) {
    case "month": {
      const dt = DateTime.fromISO(currentDateKey, { zone: timezone });
      return getMonthGridRange(dt.year, dt.month, timezone);
    }
    case "week":
      return getWeekRange(currentDateKey, timezone);
    case "day":
      return getDayRange(currentDateKey, timezone);
    case "list":
      return { startAt: "", endAt: "" };
    default:
      return { startAt: "", endAt: "" };
  }
}

export interface UseAppointmentsScheduleOptions {
  canList: boolean;
  viewType: CalendarViewType;
  currentDateKey: string;
  timezone: string;
  actorRole: string | null;
  canListEmployees: boolean;
}

export function useAppointmentsSchedule({
  canList,
  viewType,
  currentDateKey,
  timezone,
  actorRole,
  canListEmployees,
}: UseAppointmentsScheduleOptions) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [relatedError, setRelatedError] = useState<string | null>(null);

  const range = useMemo(
    () => computeAppointmentsRange(viewType, currentDateKey, timezone),
    [viewType, currentDateKey, timezone],
  );

  const requestIdRef = useRef(0);

  const loadAppointments = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setLoadError(null);
    try {
      const params =
        range.startAt && range.endAt
          ? { startAt: range.startAt, endAt: range.endAt }
          : undefined;
      const response = await appointmentsApi.getAppointments(params);
      if (requestId === requestIdRef.current) {
        setAppointments(response.data ?? []);
      }
    } catch (error) {
      if (requestId === requestIdRef.current) {
        const failure = getApiError(error);
        setLoadError(getFriendlyErrorMessage(failure));
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [range.startAt, range.endAt]);

  const loadRelated = useCallback(async () => {
    const failures: string[] = [];
    if (canLoadNames(actorRole)) {
      try {
        const response = await clientsApi.getClients();
        setClients(response.data ?? []);
      } catch (error) {
        failures.push(getFriendlyErrorMessage(getApiError(error)));
      }
    }
    if (canLoadNames(actorRole)) {
      try {
        const response = await servicesApi.getServices();
        setServices(response.data ?? []);
      } catch (error) {
        failures.push(getFriendlyErrorMessage(getApiError(error)));
      }
    }
    if (canListEmployees) {
      try {
        const response = await employeesApi.getEmployees();
        setEmployees(
          (response.data ?? []).filter(
            (employee) => employee.role !== "CLIENT",
          ),
        );
      } catch (error) {
        failures.push(getFriendlyErrorMessage(getApiError(error)));
      }
    }
    setRelatedError(
      failures.length > 0
        ? `Não foi possível carregar alguns nomes. ${failures.join(" ")}`
        : null,
    );
  }, [actorRole, canListEmployees]);

  useEffect(() => {
    if (!canList) return;
    void loadAppointments();
    void loadRelated();
  }, [canList, loadAppointments, loadRelated]);

  const clientNames = useMemo(
    () => new Map(clients.map((client) => [client.id, client.name])),
    [clients],
  );
  const serviceNames = useMemo(
    () => new Map(services.map((service) => [service.id, service.name])),
    [services],
  );
  const employeeNames = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee.name])),
    [employees],
  );

  return {
    appointments,
    clients,
    services,
    employees,
    clientNames,
    serviceNames,
    employeeNames,
    isLoading,
    loadError,
    relatedError,
    loadAppointments,
  };
}
