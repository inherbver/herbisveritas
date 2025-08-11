import { render, screen } from "@testing-library/react";
import { MobileTouchArea, MobileTouchButton } from "../mobile-touch-area";

describe("MobileTouchArea", () => {
  it("renders children correctly", () => {
    render(
      <MobileTouchArea aria-label="Test touch area" onClick={() => {}}>
        <span>Touch me</span>
      </MobileTouchArea>
    );

    expect(screen.getByText("Touch me")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("applies mobile-first touch styles", () => {
    render(
      <MobileTouchArea aria-label="Test" onClick={() => {}}>
        <span>Test</span>
      </MobileTouchArea>
    );

    const touchArea = screen.getByRole("button");
    expect(touchArea).toHaveClass("min-h-[44px]", "min-w-[44px]", "touch-manipulation");
  });

  it("handles disabled state", () => {
    render(
      <MobileTouchArea disabled aria-label="Disabled" onClick={() => {}}>
        <span>Disabled</span>
      </MobileTouchArea>
    );

    const touchArea = screen.getByRole("button");
    expect(touchArea).toBeDisabled();
    expect(touchArea).toHaveClass("opacity-50", "pointer-events-none");
  });

  it("applies different intensity levels", () => {
    const { rerender } = render(
      <MobileTouchArea intensity="light" aria-label="Light" onClick={() => {}}>
        <span>Light</span>
      </MobileTouchArea>
    );

    expect(screen.getByRole("button")).toHaveClass("active:scale-[0.98]");

    rerender(
      <MobileTouchArea intensity="strong" aria-label="Strong" onClick={() => {}}>
        <span>Strong</span>
      </MobileTouchArea>
    );

    expect(screen.getByRole("button")).toHaveClass("active:scale-90");
  });
});

describe("MobileTouchButton", () => {
  it("renders as button with variant styles", () => {
    render(<MobileTouchButton variant="default">Click me</MobileTouchButton>);

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("bg-primary", "text-primary-foreground");
  });

  it("applies outline variant correctly", () => {
    render(<MobileTouchButton variant="outline">Outline</MobileTouchButton>);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("border", "bg-background");
  });
});
