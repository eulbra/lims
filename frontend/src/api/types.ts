// ── User / Auth ────────────────────────────────

export interface User {
  id: string;
  employee_id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  locale: string;
  timezone: string;
  mfa_enabled: boolean;
  site_id: string | null;
  roles: { name: string; expires_at: string | null }[];
  last_login: string | null;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

// ── Paginated response ──────────────────────────

export interface Meta {
  count: number;
  next: string | null;
  previous: string | null;
}

export interface Pageable<T> extends Meta {
  results: T[];
}

// ── Site ─────────────────────────────────────────

export interface Site {
  id: string;
  code: string;
  name_en: string;
  name_local: string;
  country: string;
  timezone: string;
  locale: string;
  sample_count: number;
  user_count: number;
  is_active: boolean;
}

// ── Sample ───────────────────────────────────────

export interface Sample {
  id: string;
  barcode: string;
  patient_id: string;
  patient_name: string;
  status: string;
  sample_type_code: string;
  receipt_date: string;
  receipt_temp?: string;
  collection_date: string;
  ordering_physician?: string;
  ordering_facility?: string;
  panel_info: string | null;
  created_at: string;
}

export interface SampleStats {
  total_received_today: number;
  total_in_process: number;
  total_completed: number;
  total_reported: number;
  total_rejected_today: number;
}

export interface SampleRejection {
  reason: string;
  note: string;
}

// ── Run ──────────────────────────────────────────

export interface Run {
  id: string;
  run_number: string;
  panel: string;
  panel_code: string;
  panel_name: string;
  sequencer_name: string | null;
  status: string;
  planned_date: string | null;
  sample_count: number;
  operator_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface RunStats {
  total: number;
  by_status: { status: string; count: number }[];
}

// ── Report ───────────────────────────────────────

export interface Report {
  id: string;
  report_number: string;
  sample_barcode: string;
  patient_name: string;
  status: string;
  version_number: number;
  released_at: string | null;
  created_at: string;
}


// ── QC ───────────────────────────────────────────

export interface QCControlMaterial {
  id: string;
  name: string;
  material_type: string;
  manufacturer: string;
  catalog_number: string;
  lot_number: string;
  expiry_date: string | null;
  target_values: Record<string, { mean: number; sd: number }>;
  site: string;
  created_at: string;
}

export interface QCRun {
  id: string;
  run: string;
  run_number: string;
  control_material: string;
  control_material_name: string;
  measured_values: Record<string, number>;
  pass_fail: string;
  westgard_violations: string[];
  reviewed_by: string | null;
  reviewed_at: string | null;
  notes: string;
  created_at: string;
}

export interface QCChart {
  id: string;
  metric_name: string;
  panel: string;
  control_material: string;
  control_material_name: string;
  target_mean: number;
  target_sd: number;
  warning_sd: number;
  action_sd: number;
  westgard_rules: string[];
  is_active: boolean;
  data_points?: { date: string; value: number; run_number: string; pass_fail: string }[];
}

// ── QC Event ─────────────────────────────────────

export interface QCEvent {
  id: string;
  event_type: string;
  severity: string;
  summary: string;
  status: string;
  target_date: string | null;
  created_at: string;
}





// ── Test Panel ───────────────────────────────────

export interface TestPanel {
  id: string;
  code: string;
  name: string;
  description: string;
  turnaround_days: number;
  report_template_code: string;
  is_active: boolean;
}

export interface Order {
  id: string;
  order_number: string;
  panel_code: string;
  panel_name: string;
  patient_id: string;
  patient_name: string;
  status: string;
  urgency: string;
  created_at: string;
}
// ── Instrument ───────────────────────────────────

export interface Instrument {
  id: string;
  name: string;
  instrument_type: string;
  manufacturer: string;
  model: string;
  status: string;
  serial_number: string;
  location: string;
  asset_tag: string;
  site: string;
  iq_date: string | null;
  oq_date: string | null;
  pq_date: string | null;
  maintenance_count?: number;
  created_at: string;
  updated_at: string;
}

// ── Reagent Lot ──────────────────────────────────

export interface ReagentLot {
  id: string;
  lot_number: string;
  expiry_date: string | null;
  quality_status: string;
  reagent_name: string;
  remaining: number;
  unit: string;
}
