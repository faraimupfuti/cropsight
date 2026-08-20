import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SeverityTag, StatusTag } from "./Tag";

describe("SeverityTag", () => {
  it("renders the severity label", () => {
    render(<SeverityTag severity="Severe" />);
    expect(screen.getByText("Severe")).toBeInTheDocument();
  });

  it("renders nothing for null severity", () => {
    const { container } = render(<SeverityTag severity={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("StatusTag", () => {
  it("shows a human-readable label for each status", () => {
    render(<StatusTag status="pending" />);
    expect(screen.getByText("Pending review")).toBeInTheDocument();
  });
});
