import { fireEvent, render, screen } from "@testing-library/react";
import PasswordInput from "../../src/components/PasswordInput";

describe("PasswordInput", () => {
  it("starts masked and toggles visibility without changing the value", () => {
    render(<PasswordInput aria-label="Password" value="Secret123!" readOnly />);

    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");
    expect(input).toHaveValue("Secret123!");

    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveValue("Secret123!");

    fireEvent.click(screen.getByRole("button", { name: "Hide password" }));
    expect(input).toHaveAttribute("type", "password");
    expect(input).toHaveValue("Secret123!");
  });
});
