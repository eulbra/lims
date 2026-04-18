import { useState } from "react";
import {
  Table, Card, Button, Space, Tag, Typography, Input,
  Modal, Form, Select, message, Tooltip, DatePicker,
} from "antd";
import {
  PlusOutlined, SearchOutlined, BarcodeOutlined,
  ReloadOutlined, CheckOutlined, CloseOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { samplesApi } from "../api";
import type { Sample } from "../api/types";
import { usePaginated } from "../hooks/useList";
import DashboardLayout from "../components/DashboardLayout";

const { Text } = Typography;
const { Search } = Input;

// ── Status colors ─────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  RECEIVED: "blue",
  ACCEPTED: "green",
  REJECTED: "red",
  IN_PROCESS: "processing",
  COMPLETED: "cyan",
  REPORTED: "purple",
  ARCHIVED: "default",
  DISPOSED: "default",
};

export default function Samples() {
  const [form] = Form.useForm();
  const [rejectForm] = Form.useForm();
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectSample, setRejectSample] = useState<Sample | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { items, total, page, loading, fetch, setPage, setSearch, search } =
    usePaginated(
      ({ page, size, search }) =>
        samplesApi.list({ page, size, search, ordering: "-receipt_date" }),
      { autoFetch: true }
    );

  const columns = [
    {
      title: "Barcode",
      dataIndex: "barcode",
      key: "barcode",
      width: 180,
      fixed: "left" as const,
      render: (t: string) => (
        <Space size={4}>
          <BarcodeOutlined style={{ color: "#1677ff" }} />
          <Text copyable={{ text: t }} style={{ fontWeight: 500 }}>{t}</Text>
        </Space>
      ),
    },
    { title: "Patient ID", dataIndex: "patient_id", key: "patient_id", width: 130,
      render: (t: string) => t || "-"
    },
    { title: "Sample Type", dataIndex: "sample_type_code", key: "sample_type_code", width: 140 },
    { title: "Panel", dataIndex: "panel_info", key: "panel_info", width: 100,
      render: (t: string) => t ? <Tag>{t}</Tag> : "-"
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (s: string) => (
        <Tag color={STATUS_COLOR[s] || "default"}>
          {s.replace(/_/g, " ")}
        </Tag>
      ),
    },
    {
      title: "Received",
      dataIndex: "receipt_date",
      key: "receipt_date",
      width: 120,
      render: (d: string) => dayjs(d).format("YYYY-MM-DD"),
    },
    {
      title: "Actions",
      key: "actions",
      width: 140,
      fixed: "right" as const,
      render: (_: unknown, record: Sample) => (
        <Space size="small">
          {record.status === "RECEIVED" && (
            <>
              <Tooltip title="Accept">
                <Button
                  icon={<CheckOutlined />} size="small" type="text"
                  style={{ color: "#52c41a" }}
                  onClick={async () => {
                    try {
                      await samplesApi.accept(record.id);
                      message.success(`Accepted ${record.barcode}`);
                      fetch();
                    } catch {
                      message.error("Failed to accept sample");
                    }
                  }}
                />
              </Tooltip>
              <Tooltip title="Reject">
                <Button
                  icon={<CloseOutlined />} size="small" type="text" danger
                  onClick={() => {
                    setRejectSample(record);
                    rejectForm.resetFields();
                    setRejectOpen(true);
                  }}
                />
              </Tooltip>
            </>
          )}
        </Space>
      ),
    },
  ];

  const handleRejectSubmit = async () => {
    if (!rejectSample) return;
    try {
      const values = await rejectForm.validateFields();
      const reason = values.reason || "OTHER";
      const note = values.note || "";
      await samplesApi.reject(rejectSample.id, reason, note);
      message.warning(`Rejected ${rejectSample.barcode}`);
      setRejectOpen(false);
      rejectForm.resetFields();
      setRejectSample(null);
      fetch();
    } catch (e) {
      // validation error is already handled by antd, only show for API errors
      if (e instanceof Error && !(e as any).errorFields) {
        message.error("Failed to reject sample");
      }
    }
  };

  const handleReceive = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      // Map sample type code to UUID
      const typeMap: Record<string, string> = {
        "plasma-cfdna": "d64f2a8f-19ce-47f4-8a92-9bbc3019e52c",
        "cervical-swab": "326ae28b-6a71-4ec6-b816-c1cb2d93a484",
        "lbc": "4c30b9d5-9d17-45f0-bc7c-7bee88d1f5c6",
      };
      const sampleTypeId = typeMap[values.sample_type_id as string];
      if (!sampleTypeId) {
        message.error("请选择有效的样本类型");
        setSubmitting(false);
        return;
      }

      const now = new Date();
      // Serialize DatePicker (Dayjs) to ISO date string
      const collectionDate = values.collection_date
        ? (values.collection_date as dayjs.Dayjs).format("YYYY-MM-DD")
        : null;

      await samplesApi.create({
        patient_id: values.patient_id || "",
        patient_name: (values.patient_name as string) || "",
        ordering_physician: (values.ordering_physician as string) || "",
        ordering_facility: (values.ordering_facility as string) || "",
        collection_date: collectionDate,
        receipt_temp: (values.receipt_temp as string) || "",
        sample_type_id: sampleTypeId,
        receipt_date: now.toISOString().split("T")[0],
        receipt_time: now.toTimeString().split(" ")[0],
      });
      message.success("样本接收成功");
      setReceiveOpen(false);
      form.resetFields();
      fetch();
    } catch (err) {
      message.error("样本接收失败");
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout header="Samples">
      {/* ── Toolbar ────────────────────────────────────────── */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Space>
            <Search
              placeholder="Search barcode or patient ID..."
              prefix={<SearchOutlined />}
              style={{ width: 300 }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onSearch={() => fetch()}
              allowClear
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={() => { fetch(); message.success("Refreshed"); }}
            >
              Refresh
            </Button>
          </Space>
          <Space>
            <Text type="secondary">{total} total</Text>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setReceiveOpen(true)}>
              Receive Sample
            </Button>
          </Space>
        </div>
      </Card>

      {/* ── Table ──────────────────────────────────────────── */}
      <Card>
        <Table<Sample>
          columns={columns}
          dataSource={items}
          rowKey="id"
          loading={loading}
          size="middle"
          scroll={{ x: 1000 }}
          pagination={{
            current: page,
            pageSize: 50,
            total,
            showSizeChanger: false,
            showTotal: (t) => `Total ${t} samples`,
            onChange: setPage,
          }}
        />
      </Card>

      {/* ── Receive Sample Modal ───────────────────────────── */}
      <Modal
        title={
          <Space>
            <BarcodeOutlined style={{ color: "#1677ff" }} />
            Receive New Sample
          </Space>
        }
        open={receiveOpen}
        onCancel={() => setReceiveOpen(false)}
        footer={null}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleReceive} style={{ marginTop: 16 }}>
          <Form.Item name="sample_type_id" label="样本类型" rules={[{ required: true, message: "请选择样本类型" }]}>
            <Select placeholder="请选择..." options={[
              { label: "母体血浆 (cfDNA) — Streck BCT", value: "plasma-cfdna" },
              { label: "宫颈拭子 — PreservCyt", value: "cervical-swab" },
              { label: "液基细胞学 — SurePath", value: "lbc" },
            ]} />
          </Form.Item>

          <Form.Item name="patient_id" label="Patient ID">
            <Input placeholder="Leave blank to auto-generate" />
          </Form.Item>

          <Form.Item name="patient_name" label="Patient Name">
            <Input />
          </Form.Item>

          <Form.Item name="collection_date" label="Collection Date" rules={[{ required: true }]}>
            <DatePicker style={{ width: "100%" }} format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item name="ordering_physician" label="Ordering Physician">
            <Input />
          </Form.Item>

          <Form.Item name="ordering_facility" label="Ordering Facility">
            <Input />
          </Form.Item>

          <Form.Item name="receipt_temp" label="Transport Temperature">
            <Input placeholder="e.g. 4C, ambient" />
          </Form.Item>

          <div style={{ textAlign: "right", marginTop: 8 }}>
            <Space>
              <Button onClick={() => setReceiveOpen(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                Receive
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      {/* ── Reject Sample Modal ────────────────────────────── */}
      <Modal
        title={`Reject sample ${rejectSample?.barcode || ""}`}
        open={rejectOpen}
        onCancel={() => {
          setRejectOpen(false);
          rejectForm.resetFields();
          setRejectSample(null);
        }}
        onOk={handleRejectSubmit}
        okText="Reject"
        okButtonProps={{ danger: true }}
        destroyOnClose
      >
        <Form form={rejectForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="reason" label="Reason" rules={[{ required: true }]}>
            <Select placeholder="Select a reason" options={[
              { value: "HEMOLYZED", label: "Hemolyzed" },
              { value: "INSUFFICIENT_VOLUME", label: "Insufficient volume" },
              { value: "WRONG_CONTAINER", label: "Wrong container" },
              { value: "LABELING_ERROR", label: "Labeling error" },
              { value: "TEMPERATURE_EXCURSION", label: "Temperature excursion" },
              { value: "EXPIRED_TRANSPORT", label: "Expired transport time" },
            ]} />
          </Form.Item>
          <Form.Item name="note" label="Additional notes (optional)">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </DashboardLayout>
  );
}
