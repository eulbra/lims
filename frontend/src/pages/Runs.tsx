import { useState, useEffect, useMemo } from "react";
import { Table, Card, Button, Space, Tag, Typography, Modal, Form, Select, Input, message, Transfer, DatePicker, Tabs, Badge, Tooltip } from "antd";
import type { TransferItem } from "antd/es/transfer";
import { PlusOutlined, ReloadOutlined, EyeOutlined, ArrowRightOutlined, StepForwardOutlined, CheckCircleOutlined, PlayCircleOutlined, FileTextOutlined, MinusCircleOutlined } from "@ant-design/icons";
import DashboardLayout from "../components/DashboardLayout";
import { runsApi, samplesApi, panelsApi, instrumentsApi, stepsApi } from "../api";
import type { Run, Sample, TestPanel, Instrument } from "../api/types";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";

const { Text } = Typography;
const { TextArea } = Input;

const STATUS_COLORS: Record<string, string> = {
  PLANNED: "default", LIBRARY_PREP: "blue", SEQUENCING: "purple",
  ANALYZING: "orange", QC_REVIEW: "gold", COMPLETED: "green", FAILED: "red",
};

const STEP_STATUS_COLORS: Record<string, string> = {
  PENDING: "default", IN_PROGRESS: "blue", COMPLETED: "green", SKIPPED: "orange", FAILED: "red",
};

const STATUS_OPTIONS = [
  { value: "PLANNED", label: "Planned" },
  { value: "LIBRARY_PREP", label: "Library Prep" },
  { value: "SEQUENCING", label: "Sequencing" },
  { value: "ANALYZING", label: "Analyzing" },
  { value: "QC_REVIEW", label: "QC Review" },
  { value: "COMPLETED", label: "Completed" },
  { value: "FAILED", label: "Failed" },
];

const STATUS_FLOW = ["PLANNED", "LIBRARY_PREP", "SEQUENCING", "ANALYZING", "QC_REVIEW", "COMPLETED"];

export default function Runs() {
  const [form] = Form.useForm();
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRun, setSelectedRun] = useState<Run | null>(null);
  const [stepsVisible, setStepsVisible] = useState(false);
  const [tableLoading, setTableLoading] = useState(true);
  const [runs, setRuns] = useState<Run[]>([]);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [panelFilter, setPanelFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<string | null>(null);

  const fetchRuns = async () => {
    setTableLoading(true);
    try {
      const params: Record<string, unknown> = {};
      if (statusFilter) params.status = statusFilter;
      if (panelFilter) params.panel = panelFilter;
      if (dateFilter) params.planned_date = dateFilter;
      const res = await runsApi.list(params);
      setRuns(res.data.results ?? res.data);
    } catch {
      message.error("Failed to load runs");
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => { fetchRuns(); }, [statusFilter, panelFilter, dateFilter]);

  // ── Samples Transfer ───────────────────────────────────────
  const [availableSamples, setAvailableSamples] = useState<TransferItem[]>([]);
  const [selectedSamples, setSelectedSamples] = useState<string[]>([]);
  const [samplesLoading, setSamplesLoading] = useState(false);

  // ── Panels & Instruments ───────────────────────────────────────
  const [panels, setPanels] = useState<TestPanel[]>([]);
  const [instruments, setInstruments] = useState<Instrument[]>([]);

  const fetchCreateData = async () => {
    setSamplesLoading(true);
    try {
      const [samplesRes, panelsRes, instRes] = await Promise.all([
        samplesApi.list({ status: "ACCEPTED", limit: 200 }),
        panelsApi.list(),
        instrumentsApi.list(),
      ]);

      const samples: Sample[] = (samplesRes.data.results ?? samplesRes.data) as Sample[];
      setAvailableSamples(samples.map((s) => ({
        key: s.id,
        title: `${s.barcode} — ${s.patient_name || "N/A"}`,
        description: `Type: ${s.sample_type_code} | Received: ${s.receipt_date}`,
      })));

      const panelData: TestPanel[] = ((panelsRes.data as any).results ?? panelsRes.data) as TestPanel[];
      setPanels(panelData.filter((p) => p.is_active));

      const instData: Instrument[] = (instRes.data.results ?? instRes.data) as Instrument[];
      setInstruments(instData.filter((i) => i.status === "ACTIVE" && i.instrument_type === "SEQUENCER"));
    } catch {
      message.error("Failed to load create data");
    } finally {
      setSamplesLoading(false);
    }
  };

  useEffect(() => {
    if (createOpen) {
      fetchCreateData();
      setSelectedSamples([]);
    }
  }, [createOpen]);

  // ── Run detail ──────────────────────────────────────────
  const [runDetail, setRunDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [stepRecordModal, setStepRecordModal] = useState(false);
  const [selectedStep, setSelectedStep] = useState<any>(null);
  const [stepForm] = Form.useForm();
  const [stepSubmitting, setStepSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("matrix");

  const fetchRunDetail = async (runId: string) => {
    setDetailLoading(true);
    try {
      const res = await runsApi.detail(runId);
      setRunDetail(res.data);
    } catch {
      message.error("Failed to load run details");
    } finally {
      setDetailLoading(false);
    }
  };

  const openSteps = (run: Run) => {
    setSelectedRun(run);
    setStepsVisible(true);
    setActiveTab("matrix");
    fetchRunDetail(run.id);
  };

  // ── Matrix helpers ────────────────────────────────────────
  const matrixSteps = useMemo(() => {
    const allSteps: any[] = runDetail?.steps || [];
    const map = new Map<string, any>();
    allSteps.forEach((s: any) => {
      const key = s.step_id ?? s.step_name;
      if (!map.has(key) || (s.step_order ?? 0) < (map.get(key)?.step_order ?? Infinity)) {
        map.set(key, s);
      }
    });
    return Array.from(map.values()).sort(
      (a, b) => (a.step_order ?? 0) - (b.step_order ?? 0)
    );
  }, [runDetail?.steps]);

  const samplesInRun = useMemo(() => {
    return (runDetail?.run_samples || []) as any[];
  }, [runDetail?.run_samples]);

  const getStepForSample = (sampleId: string, stepId: string) => {
    const allSteps: any[] = runDetail?.steps || [];
    return allSteps.find(
      (s: any) => s.sample === sampleId && (s.step_id ?? s.step_name) === stepId
    );
  };

  const handleStepStart = async (step: any) => {
    try {
      await stepsApi.start(step.id);
      message.success(`Step "${step.step_name}" started`);
      if (selectedRun) fetchRunDetail(selectedRun.id);
    } catch (err: any) {
      message.error(err?.response?.data?.detail || "Failed to start step");
    }
  };

  const handleStepComplete = async (values: any) => {
    if (!selectedStep) return;
    setStepSubmitting(true);
    try {
      const data: any = {};
      if (values.observations) data.observations = values.observations;
      if (values.reagent_lot_ids) data.reagent_lot_ids = values.reagent_lot_ids;
      if (values.instrument_id) data.instrument_id = values.instrument_id;
      if (values.deviation_flag) data.deviation_flag = true;
      if (values.deviation_note) data.deviation_note = values.deviation_note;

      await stepsApi.complete(selectedStep.id, data);
      message.success(`Step "${selectedStep.step_name}" completed`);
      setStepRecordModal(false);
      stepForm.resetFields();
      setSelectedStep(null);
      if (selectedRun) fetchRunDetail(selectedRun.id);
    } catch (err: any) {
      message.error(err?.response?.data?.detail || "Failed to complete step");
    } finally {
      setStepSubmitting(false);
    }
  };

  const handleStepSkip = async (step: any) => {
    try {
      await stepsApi.skip(step.id);
      message.success(`Step "${step.step_name}" skipped`);
      if (selectedRun) fetchRunDetail(selectedRun.id);
    } catch (err: any) {
      message.error(err?.response?.data?.detail || "Failed to skip step");
    }
  };

  const matrixColumns = useMemo(() => {
    const baseCols: any[] = [
      {
        title: "Sample",
        key: "sample",
        fixed: "left",
        width: 220,
        render: (_: unknown, record: any) => (
          <div>
            <Text strong copyable={{ text: record.sample_barcode }}>
              {record.sample_barcode}
            </Text>
            <br />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.sample_patient_id || "—"}
            </Text>
          </div>
        ),
      },
    ];
    const stepCols = matrixSteps.map((step: any) => {
      const sid = step.step_id ?? step.step_name;
      return {
        title: (
          <Tooltip title={`Step ${step.step_order}: ${step.step_name}`}>
            <span style={{ writingMode: "vertical-rl", textOrientation: "mixed", fontSize: 12 }}>
              {step.step_name}
            </span>
          </Tooltip>
        ),
        key: sid,
        width: 80,
        align: "center" as const,
        render: (_: unknown, record: any) => {
          const s = getStepForSample(record.id, sid);
          const status = s?.status || "PENDING";
          const color = STEP_STATUS_COLORS[status] || "default";
          return (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <Tag color={color} style={{ fontSize: 10, padding: "0 4px" }}>
                {status === "COMPLETED" ? "✓" : status === "SKIPPED" ? "⊘" : status === "IN_PROGRESS" ? "▶" : "○"}
              </Tag>
              {status === "PENDING" && (
                <Button.Group size="small">
                  <Tooltip title="Start">
                    <Button icon={<PlayCircleOutlined />} onClick={() => handleStepStart(s)} />
                  </Tooltip>
                  <Tooltip title="Skip">
                    <Button icon={<MinusCircleOutlined />} onClick={() => handleStepSkip(s)} />
                  </Tooltip>
                </Button.Group>
              )}
              {status === "IN_PROGRESS" && (
                <Button size="small" type="primary" style={{ fontSize: 10 }}
                  onClick={() => { setSelectedStep(s); setStepRecordModal(true); }}
                >
                  Done
                </Button>
              )}
            </div>
          );
        },
      };
    });
    return [...baseCols, ...stepCols];
  }, [matrixSteps, runDetail]);

  const columns = [
    { title: "Run #", dataIndex: "run_number", key: "run_number", width: 200,
      render: (t: string) => <Text strong>{t}</Text> },
    { title: "Panel", dataIndex: "panel_code", key: "panel_code", width: 120,
      render: (t: string) => <Tag color="blue">{t}</Tag> },
    { title: "Sequencer", dataIndex: "sequencer_name", key: "sequencer_name", width: 150,
      render: (t: string) => t || <Text type="secondary">Not assigned</Text> },
    { title: "Samples", dataIndex: "sample_count", key: "sample_count", width: 100 },
    {
      title: "Status", dataIndex: "status", key: "status", width: 160,
      render: (s: string) => (
        <Tag color={STATUS_COLORS[s]} style={{ borderRadius: 6 }}>
          <ArrowRightOutlined style={{ marginRight: 4, fontSize: 10 }} />
          {s.replace(/_/g, " ")}
        </Tag>
      ),
    },
    {
      title: "Planned", dataIndex: "planned_date", key: "planned_date", width: 130,
      render: (d: string) => d || "-",
    },
    {
      title: "Actions", key: "actions", width: 240,
      render: (_: unknown, record: Run) => {
        const canAdvance = record.status !== "COMPLETED" && record.status !== "FAILED";
        const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(record.status) + 1];
        const isLast = record.status === "QC_REVIEW";
        return (
          <Space size="small">
            <Button icon={<EyeOutlined />} size="small" type="text"
              onClick={() => openSteps(record)} />
            {canAdvance && nextStatus && !isLast && (
              <Button icon={<StepForwardOutlined />} size="small"
                onClick={async () => {
                  try {
                    await runsApi.advanceStatus(record.id, nextStatus);
                    message.success(`Advanced to ${nextStatus.replace(/_/g, " ")}`);
                    fetchRuns();
                  } catch (err: any) {
                    const msg = err?.response?.data?.error || err?.response?.data?.detail || "Failed to advance status";
                    message.error(msg);
                  }
                }}>
                {nextStatus.replace(/_/g, " ")}
              </Button>
            )}
            {isLast && (
              <Button icon={<CheckCircleOutlined />} size="small" type="primary"
                onClick={async () => {
                  try {
                    await runsApi.advanceStatus(record.id, "COMPLETED");
                    message.success("Run completed");
                    fetchRuns();
                  } catch (err: any) {
                    const msg = err?.response?.data?.error || err?.response?.data?.detail || "Failed to complete run";
                    message.error(msg);
                  }
                }}>
                Complete
              </Button>
            )}
          </Space>
        );
      },
    },
  ];

  const handleCreate = async (values: Record<string, unknown>) => {
    if (selectedSamples.length === 0) {
      message.error("Please assign at least one sample to the run");
      return;
    }
    setSubmitting(true);
    try {
      const plannedDate = values.planned_date
        ? (values.planned_date as Dayjs).format("YYYY-MM-DD")
        : undefined;

      const payload: Record<string, unknown> = {
        panel: values.panel,
        samples: selectedSamples,
        planned_date: plannedDate,
        notes: values.notes || "",
      };
      if (values.sequencer) {
        payload.sequencer = values.sequencer;
      }
      await runsApi.create(payload);
      message.success("Run created successfully");
      setCreateOpen(false);
      form.resetFields();
      setSelectedSamples([]);
      fetchRuns();
    } catch (err: any) {
      const detail = err?.response?.data;
      if (detail && typeof detail === "object") {
        const msgs = Object.entries(detail).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`);
        message.error(msgs.join("; "));
      } else {
        message.error("Failed to create run");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout header="Sequencing Runs">
      <Card size="small" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Space wrap>
            <Input.Search placeholder="Search run number..." style={{ width: 250 }} allowClear />
            <Select
              placeholder="Filter by status"
              allowClear
              style={{ width: 160 }}
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={(v) => setStatusFilter(v)}
            />
            <Select
              placeholder="Panel"
              allowClear
              style={{ width: 180 }}
              options={panels.map(p => ({ value: p.id, label: `${p.code} — ${p.name}` }))}
              value={panelFilter}
              onChange={(v) => setPanelFilter(v)}
            />
            <DatePicker
              placeholder="Planned date"
              style={{ width: 140 }}
              format="YYYY-MM-DD"
              value={dateFilter ? dayjs(dateFilter) : null}
              onChange={(d) => setDateFilter(d ? d.format("YYYY-MM-DD") : null)}
              allowClear
            />
            <Button icon={<ReloadOutlined />} onClick={fetchRuns}>Refresh</Button>
          </Space>
          <Space>
            <Text type="secondary">{runs.length} total</Text>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
              Create Run
            </Button>
          </Space>
        </div>
      </Card>

      <Card>
        <Table<Run>
          columns={columns}
          dataSource={runs}
          rowKey="id"
          loading={tableLoading}
          pagination={{ showTotal: (t) => `Total ${t} runs` }}
        />
      </Card>

      {/* Create Run Modal */}
      <Modal
        title={<span><PlusOutlined style={{ marginRight: 8, color: "#1677ff" }} /> Create New Run</span>}
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        footer={null}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} style={{ marginTop: 16 }}>
          <Form.Item name="panel" label="Test Panel" rules={[{ required: true, message: "Please select a test panel" }]}>
            <Select
              placeholder="Select test panel"
              options={panels.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))}
            />
          </Form.Item>

          <Form.Item name="sequencer" label="Sequencer">
            <Select
              placeholder="Select sequencer (optional)"
              allowClear
              options={instruments.map((i) => ({ value: i.id, label: `${i.name} (${i.model})` }))}
            />
          </Form.Item>

          <Form.Item name="planned_date" label="Planned Date">
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item label="Assign Samples" required>
            {samplesLoading ? <Text type="secondary">Loading samples...</Text> : (
              <Transfer
                dataSource={availableSamples}
                targetKeys={selectedSamples}
                onChange={(keys) => setSelectedSamples(keys as string[])}
                titles={["Available Samples", "In This Run"]}
                listStyle={{ width: 260, height: 300 }}
                render={(item) => item.title ?? ""}
              />
            )}
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <TextArea rows={2} placeholder="Run notes..." />
          </Form.Item>

          <div style={{ textAlign: "right" }}>
            <Space>
              <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Create Run
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Run Detail Modal */}
      <Modal
        title={`Run: ${selectedRun?.run_number}`}
        open={stepsVisible}
        onCancel={() => setStepsVisible(false)}
        footer={<Button onClick={() => setStepsVisible(false)}>Close</Button>}
        width={900}
      >
        {selectedRun && (
          <div style={{ marginBottom: 16 }}>
            <Space wrap size="large">
              <span><strong>Panel:</strong> {selectedRun.panel_name}</span>
              <span><strong>Sequencer:</strong> {selectedRun.sequencer_name || "Not assigned"}</span>
              <span><strong>Samples:</strong> {selectedRun.sample_count}</span>
              <span><strong>Status:</strong> <Tag color={STATUS_COLORS[selectedRun.status]}>{selectedRun.status.replace(/_/g, " ")}</Tag></span>
            </Space>
          </div>
        )}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: "matrix",
              label: (
                <span>
                  <FileTextOutlined style={{ marginRight: 4 }} />
                  Matrix
                </span>
              ),
              children: detailLoading ? (
                <Text type="secondary">Loading matrix...</Text>
              ) : (
                <Table
                  size="small"
                  scroll={{ x: matrixSteps.length * 90 + 220 }}
                  dataSource={samplesInRun}
                  rowKey="id"
                  pagination={false}
                  columns={matrixColumns}
                  locale={{ emptyText: "No samples in this run" }}
                />
              ),
            },
            {
              key: "samples",
              label: (
                <span>
                  Samples
                  <Badge
                    count={samplesInRun.length}
                    style={{ marginLeft: 8, backgroundColor: "#1677ff" }}
                  />
                </span>
              ),
              children: detailLoading ? (
                <Text type="secondary">Loading samples...</Text>
              ) : (
                <Table
                  size="small"
                  dataSource={samplesInRun}
                  rowKey="id"
                  pagination={false}
                  columns={[
                    { title: "Barcode", dataIndex: "sample_barcode", key: "barcode", render: (t: string) => <Text strong copyable={{ text: t }}>{t}</Text> },
                    { title: "Patient ID", dataIndex: "sample_patient_id", key: "patient_id", render: (t: string) => t || "—" },
                    { title: "Well", dataIndex: "well_position", key: "well", width: 80, render: (t: string) => t || "—" },
                    { title: "Index", dataIndex: "index_sequence", key: "index", width: 120, render: (t: string) => t || "—" },
                    { title: "Pool", dataIndex: "pool_group", key: "pool", width: 100, render: (t: string) => t || "—" },
                    { title: "Status", dataIndex: "status", key: "status", width: 120, render: (s: string) => (
                      <Tag color={s === "PASSED_QC" ? "green" : s === "FAILED_QC" ? "red" : s === "SEQUENCED" ? "blue" : s === "ANALYZED" ? "cyan" : "default"}>
                        {s.replace(/_/g, " ")}
                      </Tag>
                    )},
                  ]}
                  locale={{ emptyText: "No samples in this run" }}
                />
              ),
            },
            {
              key: "steps",
              label: "Workflow Steps",
              children: detailLoading ? (
                <Text type="secondary">Loading steps...</Text>
              ) : (
                <Table
                  size="small"
                  dataSource={runDetail?.steps || []}
                  rowKey="id"
                  pagination={false}
                  columns={[
                    { title: "Step", dataIndex: "step_name", key: "name", render: (t: string, r: any) => (
                      <span>{r.step_order}. {t}</span>
                    )},
                    { title: "Sample", dataIndex: "sample_barcode", key: "sample", width: 140, render: (t: string) => (
                      <Text strong copyable={{ text: t }}>{t}</Text>
                    )},
                    { title: "Status", dataIndex: "status", key: "status", width: 100, render: (s: string) => (
                      <Tag color={STEP_STATUS_COLORS[s] || "default"}>{s.replace(/_/g, " ")}</Tag>
                    )},
                    { title: "Performed By", dataIndex: "performed_by_name", key: "performer", width: 120, render: (t: string) => t || "-" },
                    { title: "Instrument", dataIndex: "instrument_name", key: "instrument", width: 120, render: (t: string) => t || "-" },
                    { title: "Observations", dataIndex: "observations", key: "obs", render: (t: string) => (
                      <Text type="secondary" style={{ fontSize: 12 }}>{t || "-"}</Text>
                    )},
                  ]}
                  locale={{ emptyText: "No workflow steps found" }}
                />
              ),
            },
          ]}
        />
      </Modal>

      {/* Step Record Modal */}
      <Modal
        title={`Record: ${selectedStep?.step_name || ""} — ${selectedStep?.sample_barcode || ""}`}
        open={stepRecordModal}
        onCancel={() => { setStepRecordModal(false); stepForm.resetFields(); setSelectedStep(null); }}
        footer={null}
        width={500}
      >
        <Form form={stepForm} layout="vertical" onFinish={handleStepComplete} style={{ marginTop: 16 }}>
          <Form.Item name="observations" label="Observations / Notes">
            <TextArea rows={3} placeholder="e.g. DNA concentration 45 ng/μL, OD260/280 1.85" />
          </Form.Item>
          <Form.Item name="reagent_lot_ids" label="Reagent Lot IDs">
            <Input placeholder="e.g. KIT-202406-A, ENZ-202405-B" />
          </Form.Item>
          <Form.Item name="instrument_id" label="Instrument Used">
            <Select
              placeholder="Select instrument"
              allowClear
              options={instruments.map((i) => ({ value: i.id, label: `${i.name} (${i.model})` }))}
            />
          </Form.Item>
          <Form.Item name="deviation_flag" valuePropName="checked">
            <Space>
              <input type="checkbox" id="deviation" />
              <label htmlFor="deviation">Deviation / Exception occurred</label>
            </Space>
          </Form.Item>
          <Form.Item name="deviation_note" label="Deviation Note">
            <TextArea rows={2} placeholder="Describe any deviation from SOP..." />
          </Form.Item>
          <div style={{ textAlign: "right" }}>
            <Space>
              <Button onClick={() => { setStepRecordModal(false); stepForm.resetFields(); setSelectedStep(null); }}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={stepSubmitting}>
                Complete Step
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </DashboardLayout>
  );
}
