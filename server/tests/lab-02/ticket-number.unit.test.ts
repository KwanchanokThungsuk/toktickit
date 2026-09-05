import { describe, it, expect, vi } from "vitest";
import { generateTicketNumber } from "../../src/utils/ticketNumber.js";

describe("Ticket Number Generator", () => {
  it("UNIT-02: should generate 000001 for the first ticket of the year", async () => {
    const mockPrisma = {
      ticket: { findFirst: vi.fn().mockResolvedValue(null) },
    };
    const year = new Date().getFullYear();
    const result = await generateTicketNumber(mockPrisma as any);
    
    expect(result).toBe(`TKT-${year}-000001`);
  });

  it("UNIT-01: should increment the sequence correctly and match format", async () => {
    const year = new Date().getFullYear();
    const mockPrisma = {
      ticket: { findFirst: vi.fn().mockResolvedValue({ ticketNumber: `TKT-${year}-000142` }) },
    };
    const result = await generateTicketNumber(mockPrisma as any);
    
    expect(result).toBe(`TKT-${year}-000143`);
    expect(result).toMatch(new RegExp(`^TKT-${year}-\\d{6}$`));
  });
});