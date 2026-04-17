import { useState, useEffect } from "react";
import {
  Table, Card, Button, Space, Tag, Typography, Input,
  Modal, Form, Select, message, Popconfirm,
} from "antd";
import {
  PlusOutlined, SendOutlined, CheckCircleOutlined,
  SwapOutlined, ReadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import api from "../api/client";
import DashboardLayout from "../components/DashboardLayout";

const { Title } = Typography;
const { Option } = Select;

// ── Types ──────────────────────────────────────────────────
interface Document {
  id: string;
  doc_type: string;
  title: string;
  document_number: string;
  version: number;
  status: string;
  file_path: string;
  effective_date: string | null;
  review_date: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
  site: string;
  created_at: string;
  updated_at: string;
}

// ── Status helpers ─────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  DRAFT: "default",
  IN_REVIEW: "blue",
  APPROVED: "green",
  PUBLISHED: "cyan",
  SUPERSEDED: "red",
};

const DOC_TYPE_COLORS: Record<string, string> = {
  SOP: "blue",
  FORM: "purple",
  POLICY: "orange",
  TEMPLATE: "green",
  TRAINING: "magenta",
};

// ── Main Page ──────────────────────────────────────────────
export default function Documents() {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [ackModalOpen, setAckModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [ackList, setAckList] = useState<{ user_name: string; acknowledged_at: string }[]>([]);
  const [ackLoading, setAckLoading] = useState(false);

  const fetchDocs = async (p = page, q = search) => {
    setLoading(true);
    try {
      void setSearch;
      const res = await api.get("/documents/documents/", { params: { page: p, page_size: 20, search: q || undefined, ordering: "-created_at" } });
      setDocs(res.data.results || []);
      setTotal(res.data.count || 0);
      setPage(p);
    } catch {
      message.error("获取文档列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      await api.post("/documents/documents/", {
        ...values,
        effective_date: values.effective_date
          ? dayjs(values.effective_date as string).format("YYYY-MM-DD")
          : null,
        review_date: values.review_date
          ? dayjs(values.review_date as string).format("YYYY-MM-DD")
          : null,
      });
      message.success("文档已创建");
      setModalOpen(false);
      form.resetFields();
      fetchDocs();
    } catch {
      message.error("创建失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (id: string, action: string) => {
    try {
      await api.post(`/documents/documents/${id}/${action}/`);
      message.success("操作成功");
      fetchDocs();
    } catch {
      message.error("操作失败");
    }
  };

  const handleSupersede = async (id: string) => {
    try {
      await api.post(`/documents/documents/${id}/supersede/`);
      message.success("文档已作废，新版本已创建");
      fetchDocs();
    } catch {
      message.error("操作失败");
    }
  };

  const fetchAcks = async (doc: Document) => {
    setSelectedDoc(doc);
    setAckModalOpen(true);
    setAckLoading(true);
    try {
      const res = await api.get("/documents/acknowledgments/", { params: { document: doc.id } });
      setAckList(res.data.results || []);
    } catch {
      message.error("获取确认记录失败");
    } finally {
      setAckLoading(false);
    }
  };

  // ── Columns ──────────────────────────────────────────────
  const columns = [
    {
      title: "类型",
      dataIndex: "doc_type",
      width: 100,
      render: (v: string) => <Tag color={DOC_TYPE_COLORS[v] || "default"}>{v}</Tag>,
    },
    {
      title: "文号",
      dataIndex: "document_number",
      width: 140,
      render: (v: string) => <strong style={{ fontFamily: "monospace" }}>{v}</strong>,
    },
    {
      title: "标题",
      dataIndex: "title",
      render: (v: string, r: Document) => (
        <>
          <strong>{v}</strong>
          <br />
          <span style={{ fontSize: 12, color: "#999" }}>
            v{r.version}{r.file_path ? ` · ${r.file_path}` : ""}
          </span>
        </>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 120,
      render: (v: string) => {
        const labels: Record<string, string> = {
          DRAFT: "草稿", IN_REVIEW: "审核中", APPROVED: "已批准",
          PUBLISHED: "已发布", SUPERSEDED: "已作废",
        };
        return <Tag color={STATUS_COLORS[v] || "default"}>{labels[v] || v}</Tag>;
      },
    },
    {
      title: "生效日期",
      dataIndex: "effective_date",
      width: 110,
      render: (v: string) => v ? dayjs(v).format("YYYY-MM-DD") : "—",
    },
    {
      title: "审核日期",
      dataIndex: "review_date",
      width: 110,
      render: (v: string) => v ? dayjs(v).format("YYYY-MM-DD") : "—",
    },
    {
      title: "批准人",
      dataIndex: "approved_by_name",
      width: 100,
      render: (v: string) => v || "—",
    },
    {
      title: "创建时间",
      dataIndex: "created_at",
      width: 160,
      render: (v: string) => dayjs(v).format("YYYY-MM-DD HH:mm"),
    },
    {
      title: "操作",
      key: "actions",
      width: 260,
      render: (_: unknown, r: Document) => (
        <Space wrap size="small">
          {r.status === "DRAFT" && (
            <Popconfirm title="提交审核？" onConfirm={() => handleAction(r.id, "submit_review")}>
              <Button size="small" icon={<SendOutlined />}>提交审核</Button>
            </Popconfirm>
          )}
          {r.status === "IN_REVIEW" && (
            <Popconfirm title="批准本文档？" onConfirm={() => handleAction(r.id, "approve")}>
              <Button size="small" type="primary" icon={<CheckCircleOutlined />}>批准</Button>
            </Popconfirm>
          )}
          {r.status === "APPROVED" && (
            <Popconfirm title="发布本文档？" onConfirm={() => handleAction(r.id, "publish")}>
              <Button size="small" type="primary" icon={<CheckCircleOutlined />}>发布</Button>
            </Popconfirm>
          )}
          {(
            <Popconfirm title="作废此文档并创建新版本？" onConfirm={() => handleSupersede(r.id)}>
              <Button size="small" icon={<SwapOutlined />}>替换版本</Button>
            </Popconfirm>
          )}
          <Button size="small" icon={<ReadOutlined />} onClick={() => fetchAcks(r)}>确认记录</Button>
        </Space>
      ),
    },
  ];

  return (
    <DashboardLayout header="文档管理">
      <Card>
        <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
          <Title level={4}>SOP / 文件管理</Title>
          <Space>
            <Input.Search
              placeholder="搜索文档..."
              style={{ width: 250 }}
              onSearch={(v) => fetchDocs(1, v)}
              allowClear
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
              新建文档
            </Button>
          </Space>
        </div>

        <Table<Document>
          rowKey="id"
          dataSource={docs}
          loading={loading}
          columns={columns}
          pagination={{
            current: page,
            pageSize: 20,
            total,
            showSizeChanger: false,
            onChange: (p) => fetchDocs(p),
            showTotal: (t) => `共 ${t} 条`,
          }}
          scroll={{ x: 1200 }}
        />
      </Card>

      {/* Create modal */}
      <Modal
        title="新建文档"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="doc_type" label="类型" rules={[{ required: true }]}>
            <Select placeholder="选择文档类型">
              <Option value="SOP">SOP</Option>
              <Option value="FORM">表格 / Form</Option>
              <Option value="POLICY">政策 / Policy</Option>
              <Option value="TEMPLATE">模板 / Template</Option>
              <Option value="TRAINING">培训材料</Option>
            </Select>
          </Form.Item>
          <Form.Item name="title" label="标题" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="document_number" label="文档编号" rules={[{ required: true }]}>
            <Input placeholder="e.g., SOP-GEN-001" />
          </Form.Item>
          <Form.Item name="file_path" label="文件路径">
            <Input placeholder="e.g., s3://docs/sop-gen-001-v1.pdf (optional)" />
          </Form.Item>
          <Form.Item name="review_date" label="计划审核日期">
            <Input type="date" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="effective_date" label="生效日期">
            <Input type="date" style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Acknowledgments modal */}
      <Modal
        title={`文档确认记录 — ${selectedDoc?.document_number}`}
        open={ackModalOpen}
        onCancel={() => setAckModalOpen(false)}
        footer={null}
        width={520}
      >
        {ackLoading ? (
          <div style={{ textAlign: "center", padding: 20 }}>加载中...</div>
        ) : ackList.length === 0 ? (
          <div style={{ textAlign: "center", padding: 20, color: "#999" }}>暂无确认记录</div>
        ) : (
          <Table
            rowKey="id"
            dataSource={ackList}
            size="small"
            pagination={false}
          >
            <Table.Column title="人员" dataIndex="user_name" />
            <Table.Column
              title="确认时间"
              dataIndex="acknowledged_at"
              render={(v: string) => dayjs(v).format("YYYY-MM-DD HH:mm")}
            />
          </Table>
        )}
      </Modal>
    </DashboardLayout>
  );
}
