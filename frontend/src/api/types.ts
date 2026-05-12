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
  sample_id: string;
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
  sample: string;
  sample_barcode: string;
  patient_name: string;
  panel_code: string;
  status: string;
  version_number: number;
  pdf_file_path?: string;
  content?: Record<string, unknown>;
  reviewed_by_name?: string;
  reviewed_at?: string;
  verified_by_name?: string;
  verified_at?: string;
  signed_by_name?: string;
  signed_at?: string;
  released_at: string | null;
  created_at: string;
  updated_at?: string;
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

// ── Storage ─────────────────────────────────────────
export interface StorageLocation {
  id: string;
  name: string;
  location_type: string;
  barcode: string;
  parent: string | null;
  parent_name: string | null;
  site: string;
  description: string;
  is_active: boolean;
  box_count: number;
  created_at: string;
  updated_at: string;
}
export interface Box {
  id: string;
  name: string;
  barcode: string;
  box_size: string;
  storage_location: string | null;
  storage_location_name: string | null;
  site: string;
  description: string;
  positions: BoxPosition[];
  occupied_count: number;
  created_at: string;
  updated_at: string;
}
export interface BoxPosition {
  id: string;
  box: string;
  row: string;
  col: number;
  position_label: string;
  sample: string | null;
  sample_barcode: string | null;
  occupied_at: string | null;
}

// ── Barcode ─────────────────────────────────────────
export interface BarcodePrinter {
  id: string; name: string; printer_type: string; ip_address: string;
  port: number; label_width_mm: number; label_height_mm: number; dpi: number;
  site: string; is_active: boolean; created_at: string;
}
export interface BarcodeLabel {
  id: string; barcode: string; label_type: string; content_type: string;
  object_id: string; printer: string | null; printed_by: string | null;
  printed_by_name: string | null; printed_at: string | null; copies: number;
  site: string; created_at: string;
}

// ── Library ─────────────────────────────────────────
export interface IndexFamily {
  id: string; name: string; platform: string; index_type: string;
  site: string; is_active: boolean; indices: Index[]; index_count: number; created_at: string;
}
export interface Index {
  id: string; family: string; name: string; sequence: string;
  index_position: string; is_active: boolean; created_at: string;
}
export interface LibraryDesign {
  id: string; name: string; design_code: string; index_family: string | null;
  index_family_name: string | null; selection_type: string; strategy_type: string;
  description: string; site: string; is_active: boolean; created_at: string;
}

// ── Attachment / Note ──────────────────────────────
export interface Attachment {
  id: string; file: string; filename: string; file_size: number;
  content_type_str: string; content_type: number; object_id: string;
  category: string; description: string; uploaded_by: string | null;
  uploaded_by_name: string | null; site: string; created_at: string;
}
export interface Note {
  id: string; content_type: number; object_id: string; text: string;
  author: string | null; author_name: string | null; site: string;
  is_internal: boolean; created_at: string; updated_at: string;
}
