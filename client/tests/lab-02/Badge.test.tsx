import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Badge from "../../src/components/Badge";

describe("Badge", () => {
  it("renders the label text with the default neutral styling", () => {
    render(<Badge>New</Badge>);

    const badge = screen.getByText("New");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("zg-badge");
    expect(badge).toHaveAttribute("data-variant", "neutral");
  });

  it("supports a success variant for positive states", () => {
    render(<Badge variant="success">Resolved</Badge>);

    expect(screen.getByText("Resolved")).toHaveAttribute("data-variant", "success");
  });
});
