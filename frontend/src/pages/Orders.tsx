import { useState, useEffect } from "react";
import { Table, Card, Button, Space, Tag, Typography, Modal, Form, Select, Input, message, Tooltip, Popconfirm } from "antd";
import { PlusOutlined, SearchOutlined, ReloadOutlined, FileAddOutlined, CheckOutlined, CloseOutlined, PlayCircleOutlined, DeleteOutlined } from "@ant-design/icons";
import DashboardLayout from "../components/DashboardLayout";
import { ordersApi, panelsApi, samplesApi } from "../api";
import type { Order, TestPanel, Sample } from "../api/types";
import { usePaginated } from "../hooks/useList";

const { Text } = Typography;
const { TextArea } = Input;
const { Search } = Input;

const STATUS_COLORS: Record<string, string> = {
  CREATED: "default", SAMPLED: "blue", IN_PROGRESS: "gold",
  COMPLETED: "cyan", REPORTED: "green", CANCELLED: "red",
};

const STATUS_OPTIONS = [
  { value: "CREATED", label: "Created" },
  { value: "SAMPLED", label: "Sampled" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "REPORTED", label: "Reported" },
  { value: "CANCELLED", label: "Cancelled" },
];

const URGENCY_COLORS: Record<string, string> = {
  ROUTINE: "blue", STAT: "red", RESEARCH: "purple",
};

export default function Orders() {
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [panels, setPanels] = useState<TestPanel[]>([]);
  const [samples, setSamples] = useState<Sample[]>([]);

  // ── Filters ──────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [panelFilter, setPanelFilter] = useState<string | null>(null);

  const filters: Record<string, unknown> = {};
  if (statusFilter) filters.status = statusFilter;
  if (panelFilter) filters.panel = panelFilter;

  const { items, total, page, loading, fetch, setPage, setSearch, search } =
    usePaginated(
      ordersApi.list,
      { autoFetch: true, ordering: "-created_at", filters }
    );

  useEffect(() => {
    panelsApi.list().then(res => {
      const data = (res.data as any).results || res.data || [];
      setPanels(Array.isArray(data) ? data : []);
    }).catch(() => setPanels([]));
  }, []);

  const searchSamples = async (q?: string) => {
    try {
      const params: Record<string, unknown> = { size: 50 };
      if (q && q.length >= 2) params.search = q;
      const res = await samplesApi.list(params);
      const data = (res.data as any).results || res.data || [];
      setSamples(Array.isArray(data) ? data : []);
    } catch {
      setSamples([]);
    }
  };

  const handleSampleSelect = (sampleId: string) => {
    const s = samples.find(x => x.id === sampleId);
    if (!s) return;
    form.setFieldsValue({
      patient_id: s.patient_id || undefined,
      patient_name: s.patient_name || undefined,
      ordering_physician: s.ordering_physician || undefined,
      ordering_facility: s.ordering_facility || undefined,
    });
  };

  const handleDelete = async (record: Order) => {
    try {
      await ordersApi.delete(record.id);
      message.success(`Deleted ${record.order_number}`);
      fetch();
    } catch {
      message.error("Failed to delete order");
    }
  };

  const columns = [
    { title: "Order #", dataIndex: "order_number", key: "order_number", width: 160,
      render: (t: string) => <Text strong copyable={{ text: t }}>{t}</Text> },
    { title: "Patient ID", dataIndex: "patient_id", key: "patient_id", width: 130,
      render: (t: string) => t || "-" },
    { title: "Patient", dataIndex: "patient_name", key: "patient_name", width: 150 },
    { title: "Panel", dataIndex: "panel_code", key: "panel_code", width: 100,
      render: (t: string) => <Tag>{t}</Tag> },
    { title: "Status", dataIndex: "status", key: "status", width: 130,
      render: (s: string) => <Tag color={STATUS_COLORS[s]}>{s.replace(/_/g, " ")}</Tag> },
    { title: "Urgency", dataIndex: "urgency", key: "urgency", width: 100,
      render: (s: string) => <Tag color={URGENCY_COLORS[s]}>{s}</Tag> },
    { title: "Created", dataIndex: "created_at", key: "created_at", width: 150,
      render: (d: string) => d ? new Date(d).toLocaleDateString() : "-" },
    {
      title: "Actions", key: "actions", width: 200,
      render: (_: unknown, record: Order) => (
        <Space size="small">
          {record.status === "CREATED" && (
            <Tooltip title="Start Processing">
              <Button icon={<PlayCircleOutlined />} size="small" type="text"
                style={{ color: "#1677ff" }}
                onClick={async () => {
                  try {
                    await ordersApi.submit(record.id);
                    message.success("Order started");
                    fetch();
                  } catch { message.error("Failed to start order"); }
                }} />
            </Tooltip>
          )}
          {record.status === "IN_PROGRESS" && (
            <Tooltip title="Complete">
              <Button icon={<CheckOutlined />} size="small" type="text"
                style={{ color: "#52c41a" }}
                onClick={async () => {
                  try {
                    await ordersApi.complete(record.id);
                    message.success("Order completed");
                    fetch();
                  } catch { message.error("Failed to complete order"); }
                }} />
            </Tooltip>
          )}
          {record.status !== "COMPLETED" && record.status !== "REPORTED" && record.status !== "CANCELLED" && (
            <Tooltip title="Cancel">
              <Button icon={<CloseOutlined />} size="small" type="text" danger
                onClick={async () => {
                  try {
                    await ordersApi.cancel(record.id);
                    message.warning("Order cancelled");
                    fetch();
                  } catch { message.error("Failed to cancel order"); }
                }} />
            </Tooltip>
          )}
          <Popconfirm
            title="Delete order?"
            description={`Delete ${record.order_number}?`}
            onConfirm={() => handleDelete(record)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete">
              <Button icon={<DeleteOutlined />} size="small" type="text" danger />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      await ordersApi.create(values);
      message.success("Order created successfully");
      setModalOpen(false);
      form.resetFields();
      setSamples([]);
      fetch();
    } catch (err: any) {
      const detail = err?.response?.data;
      if (detail && typeof detail === "object") {
        const msgs = Object.entries(detail).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`);
        message.error(msgs.join("; "));
      } else {
        message.error("Failed to create order");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout header="Orders">
      <Card size="small" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <Space wrap>
            <Search placeholder="Search order #, patient..." prefix={<SearchOutlined />} style={{ width: 280 }} allowClear
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onSearch={() => fetch()}
            />
            <Select
              placeholder="Status"
              allowClear
              style={{ width: 140 }}
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
            <Button icon={<ReloadOutlined />} onClick={() => fetch()}>Refresh</Button>
          </Space>
          <Space>
            <Text type="secondary">{total} total</Text>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
              New Order
            </Button>
          </Space>
        </div>
      </Card>

      <Card>
        <Table columns={columns} dataSource={items} rowKey="id" loading={loading}
          pagination={{ current: page, pageSize: 50, total, showSizeChanger: false, onChange: setPage, showTotal: (t) => `Total ${t} orders` }}
          locale={{ emptyText: "No orders yet. Click \"New Order\" to get started." }}
        />
      </Card>

      <Modal
        title={<span><FileAddOutlined style={{ marginRight: 8, color: "#1677ff" }} />New Test Order</span>}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); setSamples([]); }}
        afterOpenChange={(open) => { if (open) searchSamples(); }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
          <Form.Item name="sample_id" label="Link to Existing Sample (optional)">
            <Select
              showSearch
              placeholder="Search by barcode or patient name..."
              filterOption={false}
              onSearch={(q) => { searchSamples(q); }}
              onChange={handleSampleSelect}
              options={samples.map(s => ({
                value: s.id,
                label: `${s.sample_id} — ${s.patient_name || "N/A"} (${s.sample_type_code})`,
              }))}
              allowClear
            />
          </Form.Item>

          <Form.Item name="panel" label="Test Panel" rules={[{ required: true }]}>
            <Select placeholder="Select test panel" options={panels.map(p => ({
              value: p.id, label: `${p.code} — ${p.name}`,
            }))} />
          </Form.Item>
          <Form.Item name="patient_id" label="Patient ID">
            <Input placeholder="Auto-generated if empty" />
          </Form.Item>
          <Form.Item name="patient_name" label="Patient Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="urgency" label="Urgency" initialValue="ROUTINE">
            <Select options={[
              { value: "ROUTINE", label: "Routine" },
              { value: "STAT", label: "STAT — Urgent" },
            ]} />
          </Form.Item>
          <Form.Item name="ordering_physician" label="Ordering Physician" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="ordering_facility" label="Ordering Facility" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="clinical_notes" label="Clinical Notes">
            <TextArea rows={3} placeholder="Clinical indications, gestational age, etc." />
          </Form.Item>
          <div style={{ textAlign: "right" }}>
            <Space>
              <Button onClick={() => { setModalOpen(false); form.resetFields(); setSamples([]); }}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>Create Order</Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </DashboardLayout>
  );
}
