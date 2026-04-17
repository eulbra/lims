import { useState, useEffect } from "react";
import {
  Table, Card, Button, Space, Tag, Typography, Modal,
  Form, Select, message, Tabs, Statistic, Row, Col,
  Input, Descriptions, Popconfirm,
} from "antd";
const { Option } = Select;
import {
  PlusOutlined, ReloadOutlined, CheckCircleOutlined,
  SendOutlined, ExclamationCircleOutlined, BarChartOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import api from "../api/client";
import DashboardLayout from "../components/DashboardLayout";

const { Title, Text } = Typography;
const { TextArea } = Input;

// ── Types ──────────────────────────────────────────────────
interface PTProgram {
  id: string;
  name: string;
  program_code: string;
  panel: string;
  frequency: string;
  is_active: boolean;
  created_at: string;
}

interface PTRound {
  id: string;
  program: string;
  program_name: string;
  program_code: string;
  round_number: string;
  sample_received_date: string;
  submission_deadline: string;
  submission_status: string;
  result: string | null;
  score: string;
  submitted_at: string | null;
}

interface InternalAudit {
  id: string;
  audit_title: string;
  audit_date: string;
  auditor: string;
  auditor_name: string | null;
  scope: string;
  status: string;
  findings: unknown[];
  created_at: string;
}

// ── Status helpers ─────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  PENDING: "default",
  SUBMITTED: "blue",
  SCORED: "green",
  OVERDUE: "red",
  SATISFACTORY: "green",
  UNSATISFACTORY: "red",
  MARGINAL: "orange",
  PLANNED: "default",
  IN_PROGRESS: "processing",
  COMPLETED: "success",
  QUARTERLY: "cyan",
  SEMI_ANNUALLY: "geekblue",
  ANNUALLY: "purple",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "待提交",
  SUBMITTED: "已提交",
  SCORED: "已评分",
  OVERDUE: "已逾期",
  SATISFACTORY: "满意",
  UNSATISFACTORY: "不满意",
  MARGINAL: "临界",
  PLANNED: "计划中",
  IN_PROGRESS: "进行中",
  COMPLETED: "已完成",
  QUARTERLY: "每季度",
  SEMI_ANNUALLY: "每半",
  ANNUALLY: "每年",
};

// ── PT Programs Tab ───────────────────────────────────────
function PTProgramsTab() {
  const [programs, setPrograms] = useState<PTProgram[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await api.get("/quality/programs/");
      setPrograms(res.data.results || res.data || []);
    } catch {
      message.error("获取 PT 项目失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      await api.post("/quality/programs/", values);
      message.success("PT 项目已创建");
      setModalOpen(false);
      form.resetFields();
      fetch();
    } catch {
      message.error("创建失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
        <Text type="secondary">能力验证 (PT/EQA) 项目管理 — CAP 合规要求</Text>
        <Space>
          <Button size="small" icon={<ReloadOutlined />} onClick={fetch}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            新建项目
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        {(programs || []).map((p) => (
          <Col key={p.id} span={12}>
            <Card
              size="small"
              title={p.name}
              extra={
                <Tag color={p.is_active ? "green" : "default"}>
                  {p.is_active ? "激活" : "停用"}
                </Tag>
              }
            >
              <Descriptions size="small" column={1}>
                <Descriptions.Item label="项目代码">
                  <code style={{ background: "#f0f0f0", padding: "2px 6px", borderRadius: 3 }}>
                    {p.program_code}
                  </code>
                </Descriptions.Item>
                <Descriptions.Item label="频率">
                  <Tag color={STATUS_COLORS[p.frequency] || "default"}>
                    {STATUS_LABELS[p.frequency] || p.frequency}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="创建时间">
                  {dayjs(p.created_at).format("YYYY-MM-DD HH:mm")}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
        ))}
      </Row>

      {programs.length === 0 && !loading && (
        <div style={{ textAlign: "center", padding: 40, color: "#999" }}>
          <BarChartOutlined style={{ fontSize: 48, marginBottom: 12 }} />
          <div>暂无 PT 项目</div>
        </div>
      )}

      <Modal
        title="新建 PT 项目"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        width={520}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="name" label="项目名称" rules={[{ required: true }]}>
            <Input placeholder="e.g., CAP CAP-PT NIPT" />
          </Form.Item>
          <Form.Item name="program_code" label="项目代码" rules={[{ required: true }]}>
            <Input placeholder="e.g., CAP-PT-NIPT-2026" />
          </Form.Item>
          <Form.Item name="panel" label="检测面板 (UUID)">
            <Input placeholder="e.g., panel UUID" />
          </Form.Item>
          <Form.Item name="frequency" label="频率" rules={[{ required: true }]}>
            <Select>
              <Option value="QUARTERLY">每季度</Option>
              <Option value="SEMI_ANNUALLY">每半年</Option>
              <Option value="ANNUALLY">每年</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ── PT Rounds Tab ──────────────────────────────────────────
function PTRoundsTab() {
  const [rounds, setRounds] = useState<PTRound[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [selectedRound, setSelectedRound] = useState<PTRound | null>(null);

  const fetch = async (p = page) => {
    setLoading(true);
    try {
      const res = await api.get("/quality/rounds/", { params: { page: p, page_size: 20, ordering: "-submission_deadline" } });
      setRounds(res.data.results || []);
      setTotal(res.data.count || 0);
      setPage(p);
    } catch {
      message.error("获取 PT 轮次失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (id: string) => {
    try {
      await api.post(`/quality/rounds/${id}/submit/`);
      message.success("已提交");
      fetch(page);
    } catch {
      message.error("提交失败");
    }
  };

  const handleRecordResult = async (values: Record<string, unknown>) => {
    if (!selectedRound) return;
    setSubmitting(true);
    try {
      await api.post(`/quality/rounds/${selectedRound.id}/record_result/`, values);
      message.success("结果已记录");
      setModalOpen(false);
      form.resetFields();
      setSelectedRound(null);
      fetch(page);
    } catch {
      message.error("记录失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">PT 轮次管理 — 记录提交和评分结果</Text>
        <Button size="small" icon={<ReloadOutlined />} onClick={() => fetch(1)} style={{ marginLeft: 8 }}>刷新</Button>
      </div>

      {/* Stats */}
      <Row gutter={12} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="待提交"
              value={(rounds || []).filter((r) => r.submission_status === "PENDING").length}
              valueStyle={{ color: "#8c8c8c" }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="已提交"
              value={(rounds || []).filter((r) => r.submission_status === "SUBMITTED").length}
              valueStyle={{ color: "#1890ff" }}
              prefix={<SendOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="满意"
              value={(rounds || []).filter((r) => r.result === "SATISFACTORY").length}
              valueStyle={{ color: "#52c41a" }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="不满意"
              value={(rounds || []).filter((r) => r.result === "UNSATISFACTORY").length}
              valueStyle={{ color: "#ff4d4f" }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Table<PTRound>
        rowKey="id"
        dataSource={rounds}
        loading={loading}
        columns={[
          { title: "项目", dataIndex: "program_name", render: (_v: string, r: PTRound) => <strong>{r.program_code} — {r.round_number}</strong> },
          {
            title: "提交状态",
            dataIndex: "submission_status",
            width: 120,
            render: (v: string) => <Tag color={STATUS_COLORS[v] || "default"}>{STATUS_LABELS[v] || v}</Tag>,
          },
          {
            title: "结果",
            dataIndex: "result",
            width: 120,
            render: (v: string) => v ? <Tag color={STATUS_COLORS[v] || "default"}>{STATUS_LABELS[v] || v}</Tag> : "—",
          },
          {
            title: "截止日期",
            dataIndex: "submission_deadline",
            width: 130,
            render: (v: string) => {
              const days = dayjs(v).diff(dayjs(), "day");
              return days < 0 ? <Tag color="red">已逾期</Tag> : days <= 14 ? <Tag color="orange">剩余 {days} 天</Tag> : v;
            },
          },
          {
            title: "操作",
            key: "actions",
            width: 200,
            render: (_: unknown, r: PTRound) => (
              <Space wrap size="small">
                {r.submission_status === "PENDING" && (
                  <Popconfirm title="提交此轮次结果？" onConfirm={() => handleSubmit(r.id)}>
                    <Button size="small" type="primary" icon={<SendOutlined />}>提交</Button>
                  </Popconfirm>
                )}
                {["SUBMITTED", "SCORED"].includes(r.submission_status) && (
                  <Button size="small" onClick={() => { setSelectedRound(r); setModalOpen(true); }}>
                    记录结果
                  </Button>
                )}
              </Space>
            ),
          },
        ]}
        pagination={{
          current: page, pageSize: 20, total, onChange: (p) => fetch(p),
          showSizeChanger: false, showTotal: (t) => `共 ${t} 条`,
        }}
        scroll={{ x: 800 }}
      />

      <Modal
        title="记录 PT 评分结果"
        open={modalOpen}
        onCancel={() => { setModalOpen(false); setSelectedRound(null); }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        width={480}
      >
        <Form form={form} layout="vertical" onFinish={handleRecordResult}>
          <Form.Item name="result" label="结果" rules={[{ required: true }]}>
            <Select>
              <Option value="SATISFACTORY">满意</Option>
              <Option value="UNSATISFACTORY">不满意</Option>
              <Option value="MARGINAL">临界</Option>
            </Select>
          </Form.Item>
          <Form.Item name="score" label="分数/备注">
            <Input placeholder="e.g., 95/100" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ── Internal Audits Tab ────────────────────────────────────
function InternalAuditsTab() {
  const [audits, setAudits] = useState<InternalAudit[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const fetch = async (p = page) => {
    setLoading(true);
    try {
      const res = await api.get("/quality/audits/", { params: { page: p, page_size: 20, ordering: "-audit_date" } });
      setAudits(res.data.results || []);
      setTotal(res.data.count || 0);
      setPage(p);
    } catch {
      message.error("获取内部审计失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      await api.post("/quality/audits/", {
        ...values,
        audit_date: values.audit_date
          ? dayjs(values.audit_date as string).format("YYYY-MM-DD")
          : null,
      });
      message.success("审计计划已创建");
      setModalOpen(false);
      form.resetFields();
      fetch();
    } catch {
      message.error("创建失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await api.post(`/quality/audits/${id}/complete/`);
      message.success("审计已完成");
      fetch(page);
    } catch {
      message.error("操作失败");
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
        <Text type="secondary">内部审计管理 — 计划、执行、完成记录</Text>
        <Space>
          <Button size="small" icon={<ReloadOutlined />} onClick={() => fetch(1)}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            新建审计
          </Button>
        </Space>
      </div>

      <Table<InternalAudit>
        rowKey="id"
        dataSource={audits}
        loading={loading}
        columns={[
          { title: "审计标题", dataIndex: "audit_title", render: (v: string) => <strong>{v}</strong> },
          {
            title: "状态",
            dataIndex: "status",
            width: 120,
            render: (v: string) => <Tag color={STATUS_COLORS[v] || "default"}>{STATUS_LABELS[v] || v}</Tag>,
          },
          {
            title: "审计日期",
            dataIndex: "audit_date",
            width: 130,
            render: (v: string) => dayjs(v).format("YYYY-MM-DD"),
          },
          {
            title: "范围",
            dataIndex: "scope",
            ellipsis: { showTitle: true },
          },
          {
            title: "操作",
            key: "actions",
            width: 120,
            render: (_: unknown, r: InternalAudit) => (
              r.status === "IN_PROGRESS" ? (
                <Popconfirm title="标记为已完成？" onConfirm={() => handleComplete(r.id)}>
                  <Button size="small" type="primary" icon={<CheckCircleOutlined />}>完成</Button>
                </Popconfirm>
              ) : "—"
            ),
          },
        ]}
        pagination={{
          current: page, pageSize: 20, total, onChange: (p) => fetch(p),
          showSizeChanger: false, showTotal: (t) => `共 ${t} 条`,
        }}
        scroll={{ x: 900 }}
      />

      <Modal
        title="新建内部审计"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        width={520}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="audit_title" label="审计标题" rules={[{ required: true }]}>
            <Input placeholder="e.g., 2026 Q1 样本管理审计" />
          </Form.Item>
          <Form.Item name="audit_date" label="审计日期" rules={[{ required: true }]}>
            <Input type="date" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="auditor" label="审计员 (UUID)">
            <Input placeholder="e.g., user UUID" />
          </Form.Item>
          <Form.Item name="scope" label="审计范围" rules={[{ required: true }]}>
            <TextArea rows={3} placeholder="e.g., 标本接收、存储、处理流程合规性检查" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────
export default function Quality() {
  return (
    <DashboardLayout header="质量管理">
      <Card>
        <Title level={4}>质量管理 — PT/EQA & 内部审计</Title>
        <Tabs
          defaultActiveKey="rounds"
          items={[
            {
              key: "rounds",
              label: <span><SendOutlined /> PT 轮次</span>,
              children: <PTRoundsTab />,
            },
            {
              key: "programs",
              label: <span><BarChartOutlined /> PT 项目</span>,
              children: <PTProgramsTab />,
            },
            {
              key: "audits",
              label: <span><FileTextOutlined /> 内部审计</span>,
              children: <InternalAuditsTab />,
            },
          ]}
        />
      </Card>
    </DashboardLayout>
  );
}
