import api from "./client";
import type {
  User, AuthTokens, Site, Sample, SampleStats,
  Run, RunStats, Report, TestPanel, Order,
  Instrument, ReagentLot, Pageable,
  QCControlMaterial, QCRun, QCChart, QCEvent,
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
  reject: (id: string, reason: string, note?: string) =>
    api.post(`/samples/${id}/reject/`, {
      rejection_reason: reason, rejection_note: note,
    }),
  accept: (id: string) =>
    api.post(`/samples/${id}/accept/`),
  stats: () => api.get<SampleStats>("/samples/stats/"),
};

// ── Runs ──────────────────────────────────────────────────────
export const runsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<Pageable<Run>>("/runs/", { params }),
  get: (id: string) => api.get<Run>(`/runs/${id}/`),
  create: (data: Record<string, unknown>) =>
    api.post<Run>("/runs/", data),
  advanceStatus: (id: string, status: string) =>
    api.post(`/runs/${id}/advance_status/`, { status }),
  stats: () => api.get<RunStats>("/runs/stats/"),
};

// ── Reports ───────────────────────────────────────────────────
export const reportsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<Pageable<Report>>("/reports/", { params }),
  review: (id: string) => api.post(`/reports/${id}/review/`),
  verify: (id: string) => api.post(`/reports/${id}/verify/`),
  sign: (id: string, password: string) =>
    api.post(`/reports/${id}/sign/`, { password }),
  release: (id: string) => api.post(`/reports/${id}/release/`),
};

// ── QC ────────────────────────────────────────────────────────
export const qcApi = {
  // Control Materials
  listMaterials: (params?: Record<string, unknown>) =>
    api.get<Pageable<QCControlMaterial>>("/qc/control-materials/", { params }),
  createMaterial: (data: Record<string, unknown>) =>
    api.post<QCControlMaterial>("/qc/control-materials/", data),

  // QC Runs
  listRuns: (params?: Record<string, unknown>) =>
    api.get<Pageable<QCRun>>("/qc/runs/", { params }),
  createRun: (data: Record<string, unknown>) =>
    api.post<QCRun>("/qc/runs/", data),

  // QC Charts (Levey-Jennings)
  listCharts: (params?: Record<string, unknown>) =>
    api.get<Pageable<QCChart>>("/qc/charts/", { params }),
  getChart: (id: string) =>
    api.get<QCChart>(`/qc/charts/${id}/`),

  // QC Events (CAPA)
  listEvents: (params?: Record<string, unknown>) =>
    api.get<Pageable<QCEvent>>("/qc/events/", { params }),
  createEvent: (data: Record<string, unknown>) =>
    api.post<QCEvent>("/qc/events/", data),
  updateEventStatus: (id: string, status: string, extra?: Record<string, unknown>) =>
    api.post(`/qc/events/${id}/update_status/`, { status, ...extra }),
};

// ── Panels, Instruments, Reagents ─────────────────────────────
export const panelsApi = {
  list: () => api.get<TestPanel[]>("/samples/panels/"),
};

export const instrumentsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<Pageable<Instrument>>("/instruments/", { params }),
};

export const reagentsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<Pageable<ReagentLot>>("/reagents/lots/", { params }),
  create: (data: Record<string, unknown>) =>
    api.post<ReagentLot>("/reagents/lots/", data),
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
};
