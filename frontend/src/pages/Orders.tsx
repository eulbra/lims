import { useState, useEffect } from "react";
import { Table, Card, Button, Space, Tag, Typography, Modal, Form, Select, Input, message } from "antd";
import { PlusOutlined, SearchOutlined, ReloadOutlined, FileAddOutlined } from "@ant-design/icons";
import DashboardLayout from "../components/DashboardLayout";
import { ordersApi, panelsApi } from "../api";
import type { Order, TestPanel } from "../api/types";

const { Text } = Typography;
const { TextArea } = Input;
const { Search } = Input;

export default function Orders() {
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [panels, setPanels] = useState<TestPanel[]>([]);

  // Fetch orders on mount
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await ordersApi.list({ page, size: 50, ordering: "-created_at" });
      setOrders(res.data.results || []);
      setTotal(res.data.count || 0);
    } catch {
      setOrders([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, [page]);

  // Fetch panels for dropdown
  useEffect(() => {
    panelsApi.list().then(res => {
      // Handle DRF pageable response: { count, results: [...] }
      const data = (res.data as any).results || res.data || [];
      setPanels(Array.isArray(data) ? data : []);
    }).catch(() => setPanels([]));
  }, []);

  const STATUS_COLORS: Record<string, string> = {
    CREATED: "default", SAMPLED: "blue", IN_PROGRESS: "gold",
    COMPLETED: "cyan", REPORTED: "green", CANCELLED: "red",
  };
  const URGENCY_COLORS: Record<string, string> = {
    ROUTINE: "blue", STAT: "red", RESEARCH: "purple",
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
  ];

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      await ordersApi.create(values);
      message.success("Order created successfully");
      setModalOpen(false);
      form.resetFields();
      fetchOrders();
    } catch {
      message.error("Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout header="Orders">
      <Card size="small" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Space>
            <Search placeholder="Search order #, patient..." prefix={<SearchOutlined />} style={{ width: 300 }} allowClear />
            <Button icon={<ReloadOutlined />} onClick={fetchOrders}>Refresh</Button>
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
        <Table columns={columns} dataSource={orders} rowKey="id" loading={loading}
          pagination={{ current: page, pageSize: 50, total, showSizeChanger: false, onChange: setPage, showTotal: (t) => `Total ${t} orders` }}
          locale={{ emptyText: "No orders yet. Click \"New Order\" to get started." }}
        />
      </Card>

      <Modal
        title={<span><FileAddOutlined style={{ marginRight: 8, color: "#1677ff" }} />New Test Order</span>}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} style={{ marginTop: 16 }}>
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
          <Form.Item name="ordering_facility" label="Ordering Facility">
            <Input />
          </Form.Item>
          <Form.Item name="clinical_notes" label="Clinical Notes">
            <TextArea rows={3} placeholder="Clinical indications, gestational age, etc." />
          </Form.Item>
          <div style={{ textAlign: "right" }}>
            <Space>
              <Button onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>Create Order</Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </DashboardLayout>
  );
}
