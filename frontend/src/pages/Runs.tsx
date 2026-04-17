import { useState, useEffect } from "react";
import { Table, Card, Button, Space, Tag, Typography, Modal, Form, Select, Input, message, Transfer, DatePicker } from "antd";
import type { TransferItem } from "antd/es/transfer";
import { PlusOutlined, ReloadOutlined, EyeOutlined, ArrowRightOutlined } from "@ant-design/icons";
import DashboardLayout from "../components/DashboardLayout";
import { runsApi, samplesApi } from "../api";
import type { Run, Sample } from "../api/types";

const { Text } = Typography;
const { TextArea } = Input;

const STATUS_COLORS: Record<string, string> = {
  PLANNED: "default", LIBRARY_PREP: "blue", SEQUENCING: "purple",
  ANALYZING: "orange", QC_REVIEW: "gold", COMPLETED: "green", FAILED: "red",
};

// Status advance actions — reserved for future backend endpoint (see workflows views.py for status transitions)

export default function Runs() {
  const [form] = Form.useForm();
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRun, setSelectedRun] = useState<Run | null>(null);
  const [stepsVisible, setStepsVisible] = useState(false);
  const [tableLoading, setTableLoading] = useState(true);
  const [runs, setRuns] = useState<Run[]>([]);

  const fetchRuns = async () => {
    setTableLoading(true);
    try {
      const res = await runsApi.list();
      setRuns(res.data.results ?? res.data);
    } catch {
      message.error("Failed to load runs");
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => { fetchRuns(); }, []);

  const [availableSamples, setAvailableSamples] = useState<TransferItem[]>([]);
  const [samplesLoading, setSamplesLoading] = useState(false);

  const fetchSamples = async () => {
    setSamplesLoading(true);
    try {
      const res = await samplesApi.list({ status: "RECEIVED", page_size: 100 });
      const items: TransferItem[] = ((res.data.results ?? res.data) as Sample[]).map((s) => ({
        key: s.id,
        title: `${s.barcode} — ${s.patient_name}`,
        description: `Type: ${s.sample_type_code} | Received: ${s.receipt_date}`,
      }));
      setAvailableSamples(items);
    } catch {
      message.error("Failed to load samples");
    } finally {
      setSamplesLoading(false);
    }
  };

  useEffect(() => {
    if (createOpen) fetchSamples();
  }, [createOpen]);

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
      title: "Actions", key: "actions", width: 200,
      render: (_: unknown, record: Run) => {
        // Backend doesn't have status advance endpoint — show view only
        return (
          <Space size="small">
            <Button icon={<EyeOutlined />} size="small" type="text"
              onClick={() => { setSelectedRun(record); setStepsVisible(true); }} />
          </Space>
        );
      },
    },
  ];

  const handleCreate = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        panel: values.panel_code,
        planned_date: values.planned_date ? String(values.planned_date) : null,
        notes: values.notes || "",
      };
      await runsApi.create(payload);
      message.success("Run created successfully");
      setCreateOpen(false);
      form.resetFields();
      fetchRuns();
    } catch {
      message.error("Failed to create run");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout header="Sequencing Runs">
      <Card size="small" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Space>
            <Input.Search placeholder="Search run number..." style={{ width: 250 }} allowClear />
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
          <Form.Item name="panel_code" label="Test Panel" rules={[{ required: true }]}>
            <Select options={[
              { value: "NIPT", label: "NIPT" },
              { value: "NIPT_PLUS", label: "NIPT+ Extended" },
              { value: "HPV", label: "HPV Genotyping" },
            ]} />
          </Form.Item>

          <Form.Item name="planned_date" label="Planned Date">
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item label="Assign Samples">
            {samplesLoading ? <Text type="secondary">Loading samples...</Text> : (
              <Transfer
                dataSource={availableSamples}
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
        width={600}
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
        <div style={{ marginTop: 8, paddingLeft: 16 }}>
          {["Reception", "Centrifugation", "cfDNA Extraction", "Quantification", "Library Prep", "Sequencing", "Analysis", "QC Review", "Report"].map((step, i) => {
            const done = selectedRun?.status === "COMPLETED" ||
              (["Reception", "Centrifugation", "cfDNA Extraction", "Quantification", "Library Prep", "Sequencing", "Analysis"].indexOf(step) <
                ["PLANNED", "LIBRARY_PREP", "SEQUENCING", "ANALYZING", "QC_REVIEW", "COMPLETED"].indexOf(selectedRun?.status || ""));
            return (
              <div key={step} style={{ padding: "4px 0", color: done ? "#52c41a" : "#999" }}>
                {done ? "✅" : "○"} {i + 1}. {step}
              </div>
            );
          })}
        </div>
      </Modal>
    </DashboardLayout>
  );
}
