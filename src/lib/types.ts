export type Role = "farmer" | "agronomist" | "company" | "researcher" | "admin";

export type Severity = "Mild" | "Moderate" | "Severe";

export type ObservationStatus = "pending" | "confirmed" | "corrected";

export interface DiseaseClass {
  id: string;
  name: string;
  severityCapable: boolean;
}

export interface Farmer {
  id: string;
  name: string;
  region: string;
  orgId: string;
}

export interface Farm {
  id: string;
  name: string;
  farmerId: string;
  region: string;
}

export interface Field {
  id: string;
  name: string;
  farmId: string;
  region: string;
  crop: string;
  variety: string;
  plantingDate: string;
  areaHa: number;
  lat: number;
  lng: number;
}

export interface Review {
  reviewer: string;
  status: "confirmed" | "corrected" | "uncertain";
  finalDiseaseId: string | null;
  finalSeverity: Severity | null;
  notes: string;
  reviewedAt: string;
}

export interface Observation {
  id: string;
  fieldId: string;
  farmId: string;
  farmerId: string;
  region: string;
  crop: string;
  diseaseId: string;
  diseaseName: string;
  confidence: number;
  severity: Severity | null;
  modelVersion: string;
  createdAt: string;
  status: ObservationStatus;
  review: Review | null;
  lat: number;
  lng: number;
  imagePreview?: string;
}

export interface DiseaseKnowledgeEntry {
  name: string;
  scientificName: string;
  description: string;
  symptoms: string;
  conditions: string;
  prevention: string;
  management: string;
  reference: string;
  reviewed: string;
}

export interface DemoUser {
  name: string;
  email: string;
  org: string;
}

export interface OutbreakThresholdConfig {
  minFields: number;
  minObservations: number;
  windowDays: number;
}
