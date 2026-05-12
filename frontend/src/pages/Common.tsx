import { useState, useEffect, useCallback } from "react";
import {
  Table, Button, Space, Tag, Typography, Input,
  Modal, Form, Select, message, Tabs, Popconfirm, Upload, Switch,
} from "antd";
import {
  PlusOutlined, ReloadOutlined, SearchOutlined,
  DeleteOutlined, PaperClipOutlined, EditOutlined,
  InboxOutlined,
} from "@ant-design/icons";
import { attachmentsApi, notesApi } from "../api";
import type { Attachment, Note } from "../api/types";
import type { ColumnsType } from "antd/es/table";
import DashboardLayout from "../components/DashboardLayout";
import dayjs from "dayjs";

const { Text } = Typography;
const { Option } = Select;
const { Dragger } = Upload;
const { TextArea } = Input;

function formatBytes(bytes: number): string {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

// ── Notes Tab ────────────────────────────────────────────
function NotesTab() {
  const [items, setItems] = useState<Note[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchData = useCallback(async (p: number, s: string) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page: p };
      if (s) params.search = s;
      const res = await notesApi.list(params);
      setItems(res.data.results || []);
      setTotal(res.data.count || 0);
    } catch { message.error("Failed to load notes"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(page, search); }, [page, search, fetchData]);

  const handleDelete = async (id: string) => {
    try { await notesApi.delete(id); message.success("Deleted"); fetchData(page, search); }
    catch { message.error("Delete failed"); }
  };

  const handleCreate = async () => {
    try {
      const vals = await form.validateFields();
      setSubmitting(true);
      await notesApi.create(vals);
      message.success("Note created");
      setModalOpen(false);
      form.resetFields();
      fetchData(page, search);
    } catch {
      message.error("Create failed");
    } finally { setSubmitting(false); }
  };

  const columns: ColumnsType<Note> = [
    { title: "Author", dataIndex: "author_name", width: 120 },
    {
      title: "Note", dataIndex: "text", ellipsis: true,
      render: (t: string) => (
        <Text ellipsis style={{ maxWidth: 400 }}>{t}</Text>
      ),
    },
    {
      title: "Internal", dataIndex: "is_internal", width: 80,
      render: (v: boolean) => <Tag color={v ? "orange" : "green"}>{v ? "Yes" : "No"}</Tag>,
    },
    {
      title: "Created", dataIndex: "created_at", width: 160,
      render: (v: string) => dayjs(v).format("YYYY-MM-DD HH:mm"),
    },
    {
      title: "", key: "actions", width: 60, fixed: "right",
      render: (_: unknown, r: Note) => (
        <Popconfirm title="Delete?" onConfirm={() => handleDelete(r.id)}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16, width: "100%", justifyContent: "space-between" }}>
        <Space>
          <Input
            placeholder="Search notes..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ width: 250 }}
            allowClear
          />
          <Button icon={<ReloadOutlined />} onClick={() => fetchData(page, search)}>Refresh</Button>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>Add Note</Button>
      </Space>
      <Table
        rowKey="id" columns={columns} dataSource={items}
        loading={loading} size="middle"
        pagination={{ current: page, total, pageSize: 50, onChange: setPage }}
      />
      <Modal
        title="Add Note" open={modalOpen} onOk={handleCreate} onCancel={() => setModalOpen(false)}
        confirmLoading={submitting} width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="content_type_str" label="Content Type" rules={[{ required: true }]}>
            <Input placeholder="e.g. samples.Sample" />
          </Form.Item>
          <Form.Item name="object_id" label="Object ID" rules={[{ required: true }]}>
            <Input placeholder="UUID of the object" />
          </Form.Item>
          <Form.Item name="text" label="Note" rules={[{ required: true, min: 3 }]}>
            <TextArea rows={4} />
          </Form.Item>
          <Form.Item name="is_internal" label="Internal Note" valuePropName="checked" initialValue={false}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ── Attachments Tab ──────────────────────────────────────
function AttachmentsTab() {
  const [items, setItems] = useState<Attachment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchData = useCallback(async (p: number, s: string) => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page: p };
      if (s) params.search = s;
      const res = await attachmentsApi.list(params);
      setItems(res.data.results || []);
      setTotal(res.data.count || 0);
    } catch { message.error("Failed to load attachments"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(page, search); }, [page, search, fetchData]);

  const handleDelete = async (id: string) => {
    try { await attachmentsApi.delete(id); message.success("Deleted"); fetchData(page, search); }
    catch { message.error("Delete failed"); }
  };

  const handleUpload = async () => {
    try {
      const vals = await form.validateFields();
      const fileList = vals.file?.fileList || [];
      if (!fileList.length) { message.warning("Select a file"); return; }
      setSubmitting(true);
      const fd = new FormData();
      fd.append("file", fileList[0].originFileObj);
      fd.append("content_type_str", vals.content_type_str || "");
      fd.append("object_id", vals.object_id || "00000000-0000-0000-0000-000000000000");
      fd.append("category", vals.category || "OTHER");
      fd.append("description", vals.description || "");
      await attachmentsApi.create(fd);
      message.success("Uploaded");
      setModalOpen(false);
      form.resetFields();
      fetchData(page, search);
    } catch {
      message.error("Upload failed");
    } finally { setSubmitting(false); }
  };

  const columns: ColumnsType<Attachment> = [
    { title: "File", dataIndex: "filename", ellipsis: true, width: 200 },
    {
      title: "Category", dataIndex: "category", width: 120,
      render: (v: string) => {
        const colors: Record<string, string> = { SOP: "blue", CERTIFICATE: "gold", QC_REPORT: "red", IMAGE: "purple", OTHER: "default" };
        return <Tag color={colors[v] || "default"}>{v}</Tag>;
      },
    },
    {
      title: "Size", dataIndex: "file_size", width: 80,
      render: (v: number) => formatBytes(v),
    },
    { title: "Content Type", dataIndex: "content_type_str", width: 160 },
    { title: "Uploaded By", dataIndex: "uploaded_by_name", width: 120 },
    {
      title: "Created", dataIndex: "created_at", width: 160,
      render: (v: string) => dayjs(v).format("YYYY-MM-DD HH:mm"),
    },
    {
      title: "", key: "actions", width: 60, fixed: "right",
      render: (_: unknown, r: Attachment) => (
        <Popconfirm title="Delete?" onConfirm={() => handleDelete(r.id)}>
          <Button size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16, width: "100%", justifyContent: "space-between" }}>
        <Space>
          <Input
            placeholder="Search..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{ width: 250 }}
            allowClear
          />
          <Button icon={<ReloadOutlined />} onClick={() => fetchData(page, search)}>Refresh</Button>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>Upload</Button>
      </Space>
      <Table
        rowKey="id" columns={columns} dataSource={items}
        loading={loading} size="middle"
        pagination={{ current: page, total, pageSize: 50, onChange: setPage }}
      />
      <Modal
        title="Upload Attachment" open={modalOpen} onOk={handleUpload} onCancel={() => { setModalOpen(false); form.resetFields(); }}
        confirmLoading={submitting}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="file" label="File" rules={[{ required: true }]} valuePropName="file">
            <Dragger beforeUpload={() => false} maxCount={1} accept="*">
              <p className="ant-upload-drag-icon"><InboxOutlined /></p>
              <p className="ant-upload-text">Click or drag file to this area</p>
            </Dragger>
          </Form.Item>
          <Form.Item name="content_type_str" label="Content Type" rules={[{ required: true }]}>
            <Input placeholder="e.g. samples.Sample" />
          </Form.Item>
          <Form.Item name="object_id" label="Object ID" rules={[{ required: true }]}>
            <Input placeholder="UUID of the object" />
          </Form.Item>
          <Form.Item name="category" label="Category" initialValue="OTHER">
            <Select>
              <Option value="SOP">SOP</Option>
              <Option value="CERTIFICATE">Certificate</Option>
              <Option value="QC_REPORT">QC Report</Option>
              <Option value="IMAGE">Image</Option>
              <Option value="OTHER">Other</Option>
            </Select>
          </Form.Item>
          <Form.Item name="description" label="Description">
            <TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────
export default function CommonPage() {
  const tabItems = [
    {
      key: "notes",
      label: <span><EditOutlined /> Notes</span>,
      children: <NotesTab />,
    },
    {
      key: "attachments",
      label: <span><PaperClipOutlined /> Attachments</span>,
      children: <AttachmentsTab />,
    },
  ];

  return (
    <DashboardLayout header="Notes & Attachments">
      <Tabs defaultActiveKey="notes" items={tabItems} />
    </DashboardLayout>
  );
}
