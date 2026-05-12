import api from "./client";
import type {
  User, AuthTokens, Site, Sample, SampleStats,
  Run, RunStats, Report, TestPanel, Order,
  Instrument, ReagentLot, Pageable,
  QCControlMaterial, QCRun, QCChart, QCEvent,
  StorageLocation, Box, BarcodePrinter, BarcodeLabel,
  IndexFamily, Index, LibraryDesign, Attachment, Note,
} from "./types";

// ── Auth ─────────────────────────────────────────────────────
export const authApi = {
  login: (username: string, password: string) =>
    api.post<AuthTokens>("/login/", { username, password }),
  logout: (refresh: string) =>
    api.post("/logout/", { refresh }),
  refresh: (refresh: string) =>
    api.post<AuthTokens>("/refresh/", { refresh }),
  mfaSetup: () => api.post<{ secret: string; qr_code_url: string }>("/mfa/setup/"),
  verifyMfa: (code: string) => api.post<AuthTokens>("/mfa/verify/", { code }),
  changePassword: (current: string, password: string, confirm: string) =>
    api.post("/change-password/", {
      current_password: current, new_password: password, confirm_password: confirm,
    }),
  me: () => api.get<User>("/me/"),
};

// ── Sites ─────────────────────────────────────────────────────
export const sitesApi = {
  list: () => api.get<Site[]>("/sites/sites/"),
};

// ── Samples ───────────────────────────────────────────────────
export const samplesApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<Pageable<Sample>>("/samples/", { params }),
  get: (id: string) => api.get<Sample>(`/samples/${id}/`),
  create: (data: Record<string, unknown>) =>
    api.post<Sample>("/samples/", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch<Sample>(`/samples/${id}/`, data),
  reject: (id: string, reason: string, note?: string) =>
    api.post(`/samples/${id}/reject/`, {
      rejection_reason: reason, rejection_note: note,
    }),
  accept: (id: string) =>
    api.post(`/samples/${id}/accept/`),
  delete: (id: string) => api.delete(`/samples/${id}/`),
  stats: () => api.get<SampleStats>("/samples/stats/"),
};

// ── Runs ──────────────────────────────────────────────────────
export const runsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<Pageable<Run>>("/runs/", { params }),
  get: (id: string) => api.get<Run>(`/runs/${id}/`),
  detail: (id: string) => api.get<Run>(`/runs/${id}/run_detail/`),
  create: (data: Record<string, unknown>) =>
    api.post<Run>("/runs/", data),
  advanceStatus: (id: string, status: string) =>
    api.post(`/runs/${id}/advance_status/`, { status }),
  addSamples: (id: string, sample_ids: string[]) =>
    api.post(`/runs/${id}/add_samples/`, { sample_ids }),
  updateResults: (id: string, results: Record<string, Record<string, unknown>>) =>
    api.post(`/runs/${id}/update_results/`, { results }),
  delete: (id: string) => api.delete(`/runs/${id}/`),
  stats: () => api.get<RunStats>("/runs/stats/"),
};

// ── Protocols ──────────────────────────────────────────────────────
export const protocolsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<Pageable<any>>("/runs/protocols/", { params }),
  get: (id: string) => api.get<any>(`/runs/protocols/${id}/`),
  create: (data: Record<string, unknown>) => api.post<any>("/runs/protocols/", data),
  update: (id: string, data: Record<string, unknown>) => api.patch<any>(`/runs/protocols/${id}/`, data),
  delete: (id: string) => api.delete(`/runs/protocols/${id}/`),
};
export const stepsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<Pageable<any>>("/runs/steps/", { params }),
  start: (id: string) => api.post(`/runs/steps/${id}/start/`),
  complete: (id: string, data?: Record<string, unknown>) =>
    api.post(`/runs/steps/${id}/complete/`, data),
  skip: (id: string) => api.post(`/runs/steps/${id}/skip/`),
};

// ── Reports ───────────────────────────────────────────────────
export const reportsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<Pageable<Report>>("/reports/", { params }),
  get: (id: string) => api.get<Report>(`/reports/${id}/`),
  review: (id: string) => api.post(`/reports/${id}/review/`),
  verify: (id: string) => api.post(`/reports/${id}/verify/`),
  sign: (id: string, password: string) =>
    api.post(`/reports/${id}/sign/`, { password }),
  release: (id: string) => api.post(`/reports/${id}/release/`),
  generate: (id: string) => api.post<Report>(`/reports/${id}/generate/`),
  download: (id: string) =>
    api.get(`/reports/${id}/download/`, { responseType: "blob" }),
  delete: (id: string) => api.delete(`/reports/${id}/`),
};

// ── QC ────────────────────────────────────────────────────────
export const qcApi = {
  // Control Materials
  listMaterials: (params?: Record<string, unknown>) =>
    api.get<Pageable<QCControlMaterial>>("/qc/control-materials/", { params }),
  createMaterial: (data: Record<string, unknown>) =>
    api.post<QCControlMaterial>("/qc/control-materials/", data),
  deleteMaterial: (id: string) => api.delete(`/qc/control-materials/${id}/`),

  // QC Runs
  listRuns: (params?: Record<string, unknown>) =>
    api.get<Pageable<QCRun>>("/qc/runs/", { params }),
  createRun: (data: Record<string, unknown>) =>
    api.post<QCRun>("/qc/runs/", data),
  deleteRun: (id: string) => api.delete(`/qc/runs/${id}/`),

  // QC Charts (Levey-Jennings)
  listCharts: (params?: Record<string, unknown>) =>
    api.get<Pageable<QCChart>>("/qc/charts/", { params }),
  getChart: (id: string) =>
    api.get<QCChart>(`/qc/charts/${id}/`),
  deleteChart: (id: string) => api.delete(`/qc/charts/${id}/`),

  // QC Events (CAPA)
  listEvents: (params?: Record<string, unknown>) =>
    api.get<Pageable<QCEvent>>("/qc/events/", { params }),
  createEvent: (data: Record<string, unknown>) =>
    api.post<QCEvent>("/qc/events/", data),
  updateEventStatus: (id: string, status: string, extra?: Record<string, unknown>) =>
    api.post(`/qc/events/${id}/update_status/`, { status, ...extra }),
  deleteEvent: (id: string) => api.delete(`/qc/events/${id}/`),
};

// ── Panels, Instruments, Reagents ─────────────────────────────
export const panelsApi = {
  list: () => api.get<TestPanel[]>("/samples/panels/"),
};

export const instrumentsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<Pageable<Instrument>>("/instruments/", { params }),
  create: (data: Record<string, unknown>) =>
    api.post<Instrument>("/instruments/", data),
  delete: (id: string) => api.delete(`/instruments/${id}/`),
};

export const reagentsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<Pageable<ReagentLot>>("/reagents/lots/", { params }),
  create: (data: Record<string, unknown>) =>
    api.post<ReagentLot>("/reagents/lots/", data),
  delete: (id: string) => api.delete(`/reagents/lots/${id}/`),
  expiring: (days = 30) =>
    api.get<ReagentLot[]>(`/reagents/lots/expiring/?days=${days}`),
};

// ── Orders ────────────────────────────────────────────────────
export const ordersApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<Pageable<Order>>("/orders/", { params }),
  get: (id: string) => api.get<Order>(`/orders/${id}/`),
  create: (data: Record<string, unknown>) =>
    api.post<Order>("/orders/", data),
  submit: (id: string) => api.post(`/orders/${id}/submit/`),
  complete: (id: string) => api.post(`/orders/${id}/complete/`),
  cancel: (id: string) => api.post(`/orders/${id}/cancel/`),
  delete: (id: string) => api.delete(`/orders/${id}/`),
};

// ── Storage ──────────────────────────────────────────────────
export const storageApi = {
  listLocations: (params?: Record<string, unknown>) =>
    api.get<Pageable<StorageLocation>>("/storage/locations/", { params }),
  createLocation: (data: Record<string, unknown>) =>
    api.post<StorageLocation>("/storage/locations/", data),
  deleteLocation: (id: string) => api.delete(`/storage/locations/${id}/`),
  listBoxes: (params?: Record<string, unknown>) =>
    api.get<Pageable<Box>>("/storage/boxes/", { params }),
  createBox: (data: Record<string, unknown>) =>
    api.post<Box>("/storage/boxes/", data),
  getBox: (id: string) => api.get<Box>(`/storage/boxes/${id}/`),
  placeSample: (boxId: string, positionId: string, sampleId?: string) =>
    api.post(`/storage/boxes/${boxId}/place-sample/`, { position_id: positionId, sample_id: sampleId || null }),
  deleteBox: (id: string) => api.delete(`/storage/boxes/${id}/`),
};

// ── Barcodes ─────────────────────────────────────────────────
export const barcodesApi = {
  listPrinters: (params?: Record<string, unknown>) =>
    api.get<Pageable<BarcodePrinter>>("/barcodes/printers/", { params }),
  createPrinter: (data: Record<string, unknown>) =>
    api.post<BarcodePrinter>("/barcodes/printers/", data),
  testPrint: (id: string) => api.post(`/barcodes/printers/${id}/test-print/`),
  deletePrinter: (id: string) => api.delete(`/barcodes/printers/${id}/`),
  listLabels: (params?: Record<string, unknown>) =>
    api.get<Pageable<BarcodeLabel>>("/barcodes/labels/", { params }),
  createLabel: (data: Record<string, unknown>) =>
    api.post<BarcodeLabel>("/barcodes/labels/", data),
  batchPrint: (data: Record<string, unknown>) =>
    api.post("/barcodes/labels/batch-print/", data),
  deleteLabel: (id: string) => api.delete(`/barcodes/labels/${id}/`),
};

// ── Library ──────────────────────────────────────────────────
export const libraryApi = {
  listIndexFamilies: (params?: Record<string, unknown>) =>
    api.get<Pageable<IndexFamily>>("/library/index-families/", { params }),
  createIndexFamily: (data: Record<string, unknown>) =>
    api.post<IndexFamily>("/library/index-families/", data),
  addIndex: (familyId: string, data: Record<string, unknown>) =>
    api.post<Index>(`/library/index-families/${familyId}/add-index/`, data),
  deleteIndexFamily: (id: string) => api.delete(`/library/index-families/${id}/`),
  listIndices: (params?: Record<string, unknown>) =>
    api.get<Pageable<Index>>("/library/indices/", { params }),
  deleteIndex: (id: string) => api.delete(`/library/indices/${id}/`),
  listDesigns: (params?: Record<string, unknown>) =>
    api.get<Pageable<LibraryDesign>>("/library/designs/", { params }),
  createDesign: (data: Record<string, unknown>) =>
    api.post<LibraryDesign>("/library/designs/", data),
  deleteDesign: (id: string) => api.delete(`/library/designs/${id}/`),
};

// ── Common (Attachments / Notes) ─────────────────────────────
export const attachmentsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<Pageable<Attachment>>("/common/attachments/", { params }),
  create: (data: FormData) =>
    api.post<Attachment>("/common/attachments/", data, { headers: { "Content-Type": "multipart/form-data" } }),
  delete: (id: string) => api.delete(`/common/attachments/${id}/`),
};
export const notesApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<Pageable<Note>>("/common/notes/", { params }),
  create: (data: Record<string, unknown>) =>
    api.post<Note>("/common/notes/", data),
  delete: (id: string) => api.delete(`/common/notes/${id}/`),
};
