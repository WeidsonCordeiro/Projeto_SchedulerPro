import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CompanyInactiveNotice from "./CompanyInactiveNotice";

describe("CompanyInactiveNotice", () => {
  it("explains suspension and reactivation for OWNER", () => {
    render(<CompanyInactiveNotice role="OWNER" />);

    const notice = screen.getByTestId("company-inactive-notice");
    expect(notice).toHaveAttribute("data-notice-role", "OWNER");
    expect(screen.getByText("Empresa suspensa")).toBeInTheDocument();
    expect(screen.getByText(/agendamento público está bloqueado/i)).toBeInTheDocument();
    expect(
      screen.getByText(/utilizadores que não sejam OWNER foram suspensos/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Apenas o OWNER pode reativar/i)).toBeInTheDocument();
  });

  it("directs ADMIN to contact the OWNER", () => {
    render(<CompanyInactiveNotice role="ADMIN" />);

    const notice = screen.getByTestId("company-inactive-notice");
    expect(notice).toHaveAttribute("data-notice-role", "ADMIN");
    expect(
      screen.getByText(/contacte o OWNER da empresa/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Apenas o OWNER pode reativar/i),
    ).not.toBeInTheDocument();
  });

  it("renders nothing for other roles", () => {
    render(<CompanyInactiveNotice role="MANAGER" />);
    expect(screen.queryByTestId("company-inactive-notice")).not.toBeInTheDocument();
  });
});
