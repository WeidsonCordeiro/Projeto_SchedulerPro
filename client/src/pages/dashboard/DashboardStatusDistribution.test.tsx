import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DashboardStatusDistribution, {
  DASHBOARD_STATUS_DISTRIBUTION_ORDER,
  statusDistributionBarWidthPercent,
} from "./DashboardStatusDistribution";
import type { AppointmentStatus } from "../../types/appointment";

function emptyByStatus(): Record<AppointmentStatus, number> {
  return {
    scheduled: 0,
    confirmed: 0,
    completed: 0,
    cancelled: 0,
    "no-show": 0,
  };
}

describe("statusDistributionBarWidthPercent", () => {
  it("returns the proportional width when total is positive", () => {
    expect(statusDistributionBarWidthPercent(3, 10)).toBe(30);
    expect(statusDistributionBarWidthPercent(1, 4)).toBe(25);
  });

  it("returns zero when count or total is zero", () => {
    expect(statusDistributionBarWidthPercent(0, 5)).toBe(0);
    expect(statusDistributionBarWidthPercent(1, 0)).toBe(0);
    expect(statusDistributionBarWidthPercent(0, 0)).toBe(0);
  });

  it("clamps between 0 and 100", () => {
    expect(statusDistributionBarWidthPercent(15, 10)).toBe(100);
    expect(statusDistributionBarWidthPercent(-1, 10)).toBe(0);
  });
});

describe("DASHBOARD_STATUS_DISTRIBUTION_ORDER", () => {
  it("lists the five official statuses in the required order", () => {
    expect(DASHBOARD_STATUS_DISTRIBUTION_ORDER).toEqual([
      "scheduled",
      "confirmed",
      "completed",
      "cancelled",
      "no-show",
    ]);
  });
});

describe("DashboardStatusDistribution", () => {
  it("shows EmptyState when total is zero", () => {
    render(
      <DashboardStatusDistribution
        period={{ total: 0, byStatus: emptyByStatus() }}
      />,
    );

    expect(
      screen.getByTestId("dashboard-status-distribution-empty"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /sem agendamentos no período/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("dashboard-status-row-scheduled"),
    ).not.toBeInTheDocument();
  });

  it("uses aria-valuemax matching total when total is positive", () => {
    render(
      <DashboardStatusDistribution
        period={{
          total: 5,
          byStatus: { ...emptyByStatus(), scheduled: 1 },
        }}
      />,
    );

    expect(screen.getByTestId("dashboard-status-bar-scheduled")).toHaveAttribute(
      "aria-valuemax",
      "5",
    );
    expect(screen.getByTestId("dashboard-status-bar-scheduled")).toHaveAttribute(
      "aria-valuenow",
      "1",
    );
  });

  it("shows proportional bar widths", () => {
    render(
      <DashboardStatusDistribution
        period={{
          total: 10,
          byStatus: {
            ...emptyByStatus(),
            scheduled: 3,
            completed: 2,
          },
        }}
      />,
    );

    expect(screen.getByTestId("dashboard-status-bar-scheduled")).toHaveStyle({
      width: "30%",
    });
    expect(screen.getByTestId("dashboard-status-bar-completed")).toHaveStyle({
      width: "20%",
    });
    expect(screen.getByTestId("dashboard-status-bar-confirmed")).toHaveStyle({
      width: "0%",
    });
  });
});
