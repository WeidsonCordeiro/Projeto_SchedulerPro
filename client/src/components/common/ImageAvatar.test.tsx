import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ImageAvatar, { getInitials } from "./ImageAvatar";

const image = { url: "https://cdn.example.com/avatar.jpg", publicId: "avatar" };

describe("getInitials", () => {
  it("uses the first letters of the first two words", () => {
    expect(getInitials("Ana Silva")).toBe("AS");
    expect(getInitials("Ana Maria Silva")).toBe("AM");
    expect(getInitials("Ana")).toBe("A");
    expect(getInitials("  ana   silva  ")).toBe("AS");
  });

  it("returns an empty string for an empty name", () => {
    expect(getInitials("   ")).toBe("");
  });
});

describe("ImageAvatar", () => {
  it("renders the image when a url is available", () => {
    const { container } = render(
      <ImageAvatar image={image} name="Ana Silva" alt="Ana Silva" />,
    );

    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute("src", image.url);
    expect(img).toHaveAttribute("alt", "Ana Silva");
    expect(container.querySelector(".entity-avatar")).toHaveClass(
      "entity-avatar-md",
      "entity-avatar-circle",
    );
  });

  it("falls back to the person initials when there is no image", () => {
    render(<ImageAvatar name="Ana Silva" />);

    const placeholder = screen.getByRole("img", { name: "Ana Silva" });
    expect(placeholder).toHaveTextContent("AS");
  });

  it("uses the first letter of the name for company logos", () => {
    render(<ImageAvatar name="Salão do Centro" kind="company" />);

    expect(screen.getByText("S")).toBeInTheDocument();
  });

  it("applies the requested size and shape", () => {
    render(
      <ImageAvatar name="Ana" size="sm" shape="rounded" className="custom" />,
    );

    expect(screen.getByText("A")).toHaveClass(
      "entity-avatar-sm",
      "entity-avatar-rounded",
      "custom",
    );
  });

  it("renders the fallback icon when there is no name", () => {
    render(<ImageAvatar fallbackIcon={<span data-testid="icon" />} />);

    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it("switches permanently to the placeholder when the image fails", () => {
    const { container } = render(
      <ImageAvatar image={image} name="Ana Silva" alt="" />,
    );

    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    fireEvent.error(img as HTMLImageElement);

    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("AS")).toBeInTheDocument();
  });

  it("treats an empty alt as decorative", () => {
    const { container } = render(
      <ImageAvatar image={image} name="Ana Silva" alt="" />,
    );

    expect(container.querySelector("img")).toHaveAttribute("alt", "");
  });
});
