import { describe, it, expect, vi, beforeEach } from "vitest";

// A minimal chainable query-builder mock, table-aware, just enough to
// exercise submitReviewLive's actual call shape without a real Supabase
// project. This targets a specific regression: confirming a review
// previously left the final disease/severity as null instead of carrying
// over the AI's own prediction.
let insertedReviewPayload: any = null;
let updatedObservationPayload: any = null;

const mockClient = {
  auth: {
    getUser: vi.fn(async () => ({ data: { user: { id: "agronomist-1" } } })),
  },
  from: vi.fn((table: string) => {
    if (table === "predictions") {
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: async () => ({
                  data: { crop_disease_id: "disease-nclb-uuid", severity: "moderate" },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };
    }
    if (table === "crop_diseases") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { id: "disease-rust-uuid" }, error: null }),
          }),
        }),
      };
    }
    if (table === "agronomist_reviews") {
      return {
        insert: async (payload: any) => {
          insertedReviewPayload = payload;
          return { error: null };
        },
      };
    }
    if (table === "observations") {
      return {
        update: (payload: any) => {
          updatedObservationPayload = payload;
          return { eq: async () => ({ error: null }) };
        },
      };
    }
    throw new Error(`Unexpected table in test: ${table}`);
  }),
};

vi.mock("../supabaseClient", () => ({
  requireSupabase: () => mockClient,
  supabase: mockClient,
  isSupabaseConfigured: true,
}));

const { submitReviewLive } = await import("./liveData");

beforeEach(() => {
  insertedReviewPayload = null;
  updatedObservationPayload = null;
});

describe("submitReviewLive — confirm", () => {
  it("carries over the AI-predicted disease and severity instead of leaving them null", async () => {
    await submitReviewLive("obs-1", "confirmed");

    expect(insertedReviewPayload.corrected_disease_id).toBe("disease-nclb-uuid");
    expect(insertedReviewPayload.corrected_severity).toBe("moderate");
    expect(insertedReviewPayload.status).toBe("confirmed");

    expect(updatedObservationPayload.crop_disease_id).toBe("disease-nclb-uuid");
    expect(updatedObservationPayload.severity).toBe("moderate");
    expect(updatedObservationPayload.review_status).toBe("confirmed");
  });
});

describe("submitReviewLive — corrected", () => {
  it("uses the agronomist's chosen disease/severity, not the AI's", async () => {
    await submitReviewLive("obs-2", "corrected", { diseaseCode: "rust", severity: "Severe", notes: "Actually rust." });

    expect(insertedReviewPayload.corrected_disease_id).toBe("disease-rust-uuid");
    expect(insertedReviewPayload.corrected_severity).toBe("severe");

    expect(updatedObservationPayload.crop_disease_id).toBe("disease-rust-uuid");
    expect(updatedObservationPayload.severity).toBe("severe");
  });
});

describe("submitReviewLive — uncertain", () => {
  it("does not overwrite the observation's disease/severity", async () => {
    await submitReviewLive("obs-3", "uncertain");

    expect(insertedReviewPayload.corrected_disease_id).toBeNull();
    expect(updatedObservationPayload.crop_disease_id).toBeUndefined();
    expect(updatedObservationPayload.severity).toBeUndefined();
    expect(updatedObservationPayload.review_status).toBe("pending");
  });
});
