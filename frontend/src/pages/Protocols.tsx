import { useState, useEffect } from "react";
import { Table, Card, Button, Space, Tag, Typography, Modal, Form, Select, Input,
  message, Switch, Popconfirm, InputNumber, Badge,
} from "antd";
import {
  PlusOutlined, ReloadOutlined, EditOutlined, DeleteOutlined,
  FileTextOutlined, OrderedListOutlined,
} from "@ant-design/icons";
import DashboardLayout from "../components/DashboardLayout";
import { protocolsApi, panelsApi } from "../api";
import type { TestPanel } from "../api/types";

const { Text } = Typography;
const { TextArea } = Input;

interface Protocol {
  id: string;
  panel: string;
  panel_code: string;
  panel_name: string;
  name: string;
  version: string;
  description: string;
  estimated_hours: number | null;
  is_active: boolean;
  steps_definition: StepDef[];
  step_count: number;
  created_by_name: string | null;
  created_at: string;
}

interface StepDef {
  step_id: string;
  step_name: string;
  step_order: number;
  required?: boolean;
}

export default function Protocols() {
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [panels, setPanels] = useState<TestPanel[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [panelFilter, setPanelFilter] = useState<string | null>(null);

  const fetchProtocols = async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {};
      if (panelFilter) params.panel = panelFilter;
      const res = await protocolsApi.list(params);
      setProtocols((res.data.results ?? res.data) as Protocol[]);
    } catch {
      message.error("Failed to load protocols");
    } finally {
      setLoading(false);
    }
  };

  const fetchPanels = async () => {
    try {
      const res = await panelsApi.list();
      setPanels(((res.data as any).results ?? res.data) as TestPanel[]);
    } catch {
      message.error("Failed to load panels");
    }
  };

  useEffect(() => {
    fetchProtocols();
    fetchPanels();
  }, [panelFilter]);

  // Steps editor helpers
  const [steps, setSteps] = useState<StepDef[]>([
    { step_id: "", step_name: "", step_order: 1, required: true },
  ]);

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      { step_id: "", step_name: "", step_order: prev.length + 1, required: true },
    ]);
  };

  const removeStep = (index: number) => {
    setSteps((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.map((s, i) => ({ ...s, step_order: i + 1 }));
    });
  };

  const updateStep = (index: number, field: keyof StepDef, value: any) => {
    setSteps((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const openCreate = () => {
    form.resetFields();
    setSteps([
      { step_id: "dna_extraction", step_name: "DNA Extraction", step_order: 1, required: true },
      { step_id: "library_prep", step_name: "Library Preparation", step_order: 2, required: true },
      { step_id: "sequencing", step_name: "Sequencing", step_order: 3, required: true },
      { step_id: "data_analysis", step_name: "Data Analysis", step_order: 4, required: true },
      { step_id: "qc_review", step_name: "QC Review", step_order: 5, required: true },
    ]);
    setCreateOpen(true);
  };

  const openEdit = (protocol: Protocol) => {
    setSelectedProtocol(protocol);
    editForm.setFieldsValue({
      name: protocol.name,
      version: protocol.version,
      description: protocol.description,
      estimated_hours: protocol.estimated_hours,
      is_active: protocol.is_active,
    });
    setSteps(
      (protocol.steps_definition ?? []).map((s: StepDef, i: number) => ({
        step_id: s.step_id ?? s.step_id ?? "",
        step_name: s.step_name ?? s.step_name ?? "",
        step_order: s.step_order ?? i + 1,
        required: s.required ?? true,
      }))
    );
    setEditOpen(true);
  };

  const handleCreate = async (values: Record<string, unknown>) => {
    const invalid = steps.some((s) => !s.step_id.trim() || !s.step_name.trim());
    if (invalid) {
      message.error("All steps must have a Step ID and Step Name");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        panel: values.panel,
        name: values.name,
        version: values.version || "1.0",
        description: values.description || "",
        estimated_hours: values.estimated_hours || null,
        is_active: values.is_active ?? true,
        steps_definition: steps.map((s) => ({
          step_id: s.step_id,
          step_name: s.step_name,
          step_order: s.step_order,
          required: s.required,
        })),
      };
      await protocolsApi.create(payload);
      message.success("Protocol created");
      setCreateOpen(false);
      fetchProtocols();
    } catch (err: any) {
      const detail = err?.response?.data;
      if (detail && typeof detail === "object") {
        const msgs = Object.entries(detail).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`);
        message.error(msgs.join("; "));
      } else {
        message.error("Failed to create protocol");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (values: Record<string, unknown>) => {
    if (!selectedProtocol) return;
    const invalid = steps.some((s) => !s.step_id.trim() || !s.step_name.trim());
    if (invalid) {
      message.error("All steps must have a Step ID and Step Name");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: values.name,
        version: values.version,
        description: values.description || "",
        estimated_hours: values.estimated_hours || null,
        is_active: values.is_active,
        steps_definition: steps.map((s) => ({
          step_id: s.step_id,
          step_name: s.step_name,
          step_order: s.step_order,
          required: s.required,
        })),
      };
      await protocolsApi.update(selectedProtocol.id, payload);
      message.success("Protocol updated");
      setEditOpen(false);
      setSelectedProtocol(null);
      fetchProtocols();
    } catch (err: any) {
      const detail = err?.response?.data;
      if (detail && typeof detail === "object") {
        const msgs = Object.entries(detail).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`);
        message.error(msgs.join("; "));
      } else {
        message.error("Failed to update protocol");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await protocolsApi.delete(id);
      message.success("Protocol deleted");
      fetchProtocols();
    } catch {
      message.error("Failed to delete protocol");
    }
  };

  const columns = [
    {
      title: "Panel",
      key: "panel",
      render: (_: unknown, r: Protocol) => (
        <span>
          <Tag color="blue">{r.panel_code}</Tag>
          <Text type="secondary" style={{ marginLeft: 8 }}>{r.panel_name}</Text>
        </span>
      ),
    },
    { title: "Protocol Name", dataIndex: "name", key: "name" },
    { title: "Version", dataIndex: "version", key: "version", width: 100 },
    {
      title: "Steps",
      key: "steps",
      width: 80,
      render: (_: unknown, r: Protocol) => (
        <Badge count={r.step_count} style={{ backgroundColor: "#1677ff" }} />
      ),
    },
    {
      title: "Status",
      dataIndex: "is_active",
      key: "status",
      width: 100,
      render: (active: boolean) => (
        <Tag color={active ? "green" : "red"}>{active ? "Active" : "Inactive"}</Tag>
      ),
    },
    {
      title: "Created",
      dataIndex: "created_by_name",
      key: "created_by",
      width: 140,
      render: (t: string, r: Protocol) => (
        <span>{t || "—"} <br /><Text type="secondary" style={{ fontSize: 11 }}>{r.created_at?.slice(0, 10)}</Text></span>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 140,
      render: (_: unknown, r: Protocol) => (
        <Space size="small">
          <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(r)} />
          <Popconfirm
            title="Delete protocol?"
            description="This cannot be undone."
            onConfirm={() => handleDelete(r.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const StepEditor = () => (
    <div style={{ border: "1px solid #d9d9d9", borderRadius: 6, padding: 12, marginTop: 8 }}>
      <Text strong><OrderedListOutlined style={{ marginRight: 6 }} />Step Definitions</Text>
      <div style={{ marginTop: 8 }}>
        {steps.map((s, i) => (
          <Space key={i} size="small" style={{ marginBottom: 8, display: "flex", alignItems: "center" }}>
            <Text type="secondary" style={{ width: 24, textAlign: "center" }}>{i + 1}</Text>
            <Input
              placeholder="Step ID (e.g. dna_extraction)"
              value={s.step_id}
              onChange={(e) => updateStep(i, "step_id", e.target.value)}
              style={{ width: 180 }}
            />
            <Input
              placeholder="Step Name"
              value={s.step_name}
              onChange={(e) => updateStep(i, "step_name", e.target.value)}
              style={{ width: 200 }}
            />
            <Switch
              checked={s.required}
              onChange={(v) => updateStep(i, "required", v)}
              checkedChildren="Required"
              unCheckedChildren="Optional"
              style={{ width: 90 }}
            />
            <Button size="small" danger onClick={() => removeStep(i)} disabled={steps.length <= 1}>
              Remove
            </Button>
          </Space>
        ))}
      </div>
      <Button type="dashed" size="small" onClick={addStep} block style={{ marginTop: 8 }}>
        + Add Step
      </Button>
    </div>
  );

  return (
    <DashboardLayout header="Workflow Protocols">
      <Card size="small" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Space wrap>
            <Select
              placeholder="Filter by panel"
              allowClear
              style={{ width: 220 }}
              options={panels.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))}
              value={panelFilter}
              onChange={(v) => setPanelFilter(v)}
            />
            <Button icon={<ReloadOutlined />} onClick={fetchProtocols}>Refresh</Button>
          </Space>
          <Space>
            <Text type="secondary">{protocols.length} total</Text>
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Create Protocol
            </Button>
          </Space>
        </div>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={protocols}
          rowKey="id"
          loading={loading}
          pagination={{ showTotal: (t) => `Total ${t} protocols` }}
          expandable={{
            expandedRowRender: (r: Protocol) => (
              <div style={{ padding: "8px 24px" }}>
                <Text strong>Steps:</Text>
                <ol style={{ marginTop: 8, paddingLeft: 20 }}>
                  {(r.steps_definition ?? []).map((s: StepDef, i: number) => (
                    <li key={i}>
                      <Tag color={s.required ? "blue" : "default"}>{s.step_id}</Tag>
                      {s.step_name} {s.required ? "(Required)" : "(Optional)"}
                    </li>
                  ))}
                </ol>
              </div>
            ),
          }}
        />
      </Card>

      {/* Create Protocol Modal */}
      <Modal
        title={<span><FileTextOutlined style={{ marginRight: 8, color: "#1677ff" }} /> Create Protocol</span>}
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        footer={null}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} style={{ marginTop: 16 }}>
          <Form.Item name="panel" label="Test Panel" rules={[{ required: true, message: "Please select a panel" }]}>
            <Select
              placeholder="Select test panel"
              options={panels.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))}
            />
          </Form.Item>
          <Form.Item name="name" label="Protocol Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. NIPT Standard Workflow" />
          </Form.Item>
          <Form.Item name="version" label="Version" initialValue="1.0">
            <Input placeholder="e.g. 1.0" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <TextArea rows={2} placeholder="Protocol description..." />
          </Form.Item>
          <Form.Item name="estimated_hours" label="Estimated Hours">
            <InputNumber style={{ width: "100%" }} placeholder="e.g. 24" min={0} />
          </Form.Item>
          <Form.Item name="is_active" label="Active" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
          <StepEditor />
          <div style={{ textAlign: "right", marginTop: 16 }}>
            <Space>
              <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Create Protocol
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* Edit Protocol Modal */}
      <Modal
        title={<span><EditOutlined style={{ marginRight: 8, color: "#1677ff" }} /> Edit Protocol</span>}
        open={editOpen}
        onCancel={() => { setEditOpen(false); setSelectedProtocol(null); }}
        footer={null}
        width={700}
      >
        <Form form={editForm} layout="vertical" onFinish={handleEdit} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Protocol Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="version" label="Version" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <TextArea rows={2} />
          </Form.Item>
          <Form.Item name="estimated_hours" label="Estimated Hours">
            <InputNumber style={{ width: "100%" }} min={0} />
          </Form.Item>
          <Form.Item name="is_active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
          <StepEditor />
          <div style={{ textAlign: "right", marginTop: 16 }}>
            <Space>
              <Button onClick={() => { setEditOpen(false); setSelectedProtocol(null); }}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Update Protocol
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </DashboardLayout>
  );
}
