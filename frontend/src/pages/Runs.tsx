import { useState, useEffect } from "react";
import { Table, Card, Button, Space, Tag, Typography, Modal, Form, Select, Input, message, Transfer, DatePicker } from "antd";
import type { TransferItem } from "antd/es/transfer";
import { PlusOutlined, ReloadOutlined, EyeOutlined, ArrowRightOutlined, StepForwardOutlined, CheckCircleOutlined } from "@ant-design/icons";
import DashboardLayout from "../components/DashboardLayout";
import { runsApi, samplesApi, panelsApi, instrumentsApi } from "../api";
import type { Run, Sample, TestPanel, Instrument } from "../api/types";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";

const { Text } = Typography;
const { TextArea } = Input;

const STATUS_COLORS: Record<string, string> = {
  PLANNED: "default", LIBRARY_PREP: "blue", SEQUENCING: "purple",
  ANALYZING: "orange", QC_REVIEW: "gold", COMPLETED: "green", FAILED: "red",
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

  // ── Run detail steps ──────────────────────────────────────────
  const [runDetail, setRunDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchRunDetail = async (runId: string) => {
    setDetailLoading(true);
    try {
      const res = await runsApi.get(runId);
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
    fetchRunDetail(run.id);
  };

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
        return (
          <Space size="small">
            <Button icon={<EyeOutlined />} size="small" type="text"
              onClick={() => openSteps(record)} />
            {canAdvance && nextStatus && (
              <Button icon={<StepForwardOutlined />} size="small"
                onClick={async () => {
                  try {
                    await runsApi.advanceStatus(record.id, nextStatus);
                    message.success(`Advanced to ${nextStatus.replace(/_/g, " ")}`);
                    fetchRuns();
                  } catch { message.error("Failed to advance status"); }
                }}>
                {nextStatus.replace(/_/g, " ")}
              </Button>
            )}
            {record.status === "QC_REVIEW" && (
              <Button icon={<CheckCircleOutlined />} size="small" type="primary"
                onClick={async () => {
                  try {
                    await runsApi.advanceStatus(record.id, "COMPLETED");
                    message.success("Run completed");
                    fetchRuns();
                  } catch { message.error("Failed to complete run"); }
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

      {/* Run Detail / Steps Modal */}
      <Modal
        title={`Run: ${selectedRun?.run_number}`}
        open={stepsVisible}
        onCancel={() => setStepsVisible(false)}
        footer={<Button onClick={() => setStepsVisible(false)}>Close</Button>}
        width={700}
      >
        {selectedRun && (
          <div style={{ marginBottom: 16 }}>
            <p><strong>Panel:</strong> {selectedRun.panel_name}</p>
            <p><strong>Sequencer:</strong> {selectedRun.sequencer_name || "Not assigned"}</p>
            <p><strong>Samples:</strong> {selectedRun.sample_count}</p>
            <p><strong>Status:</strong> <Tag color={STATUS_COLORS[selectedRun.status]}>{selectedRun.status.replace(/_/g, " ")}</Tag></p>
          </div>
        )}
        <Text strong>Workflow Steps:</Text>
        <div style={{ marginTop: 8 }}>
          {detailLoading ? (
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
                { title: "Status", dataIndex: "status", key: "status", width: 120, render: (s: string) => (
                  <Tag color={s === "COMPLETED" ? "green" : s === "IN_PROGRESS" ? "blue" : "default"}>{s.replace(/_/g, " ")}</Tag>
                )},
                { title: "Performed By", dataIndex: "performed_by", key: "performed_by", width: 140, render: (_t: string, r: any) => (
                  r.performed_by_name || "-"
                )},
                {
                  title: "Action", key: "action", width: 100, render: (_: unknown, r: any) => (
                    r.status === "PENDING" ? (
                      <Button size="small" onClick={async () => {
                        message.info("Step completion will be available in next update");
                      }}>Start</Button>
                    ) : r.status === "IN_PROGRESS" ? (
                      <Button size="small" type="primary" onClick={async () => {
                        message.info("Step completion will be available in next update");
                      }}>Complete</Button>
                    ) : null
                  ),
                },
              ]}
              locale={{ emptyText: "No workflow steps found" }}
            />
          )}
        </div>
      </Modal>
    </DashboardLayout>
  );
}
