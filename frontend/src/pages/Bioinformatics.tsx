import { useState, useEffect } from "react";
import {
  Table, Card, Button, Space, Tag, Typography, Modal,
  message, Tabs, Descriptions,
  Statistic, Row, Col, Popconfirm, Timeline,
} from "antd";
import {
  ReloadOutlined, PlayCircleOutlined,
  CheckCircleOutlined, CloseCircleOutlined, SyncOutlined,
  LineChartOutlined, BugOutlined, ClockCircleOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import api from "../api/client";
import DashboardLayout from "../components/DashboardLayout";

const { Title, Text } = Typography;

// ── Types ──────────────────────────────────────────────────
interface Pipeline {
  id: string;
  code: string;
  name: string;
  description: string;
  version: string;
  engine: string;
  reference_genome: string;
  is_active: boolean;
  validation_status: string;
  validated_at: string | null;
  site: string;
  created_at: string;
}

interface AnalysisJob {
  id: string;
  run: string;
  run_number: string;
  pipeline: string;
  pipeline_name: string;
  parameters: Record<string, unknown>;
  status: string;
  metrics: Record<string, unknown>;
  error_message: string;
  submitted_at: string;
  started_at: string | null;
  completed_at: string | null;
}

// ── Status helpers ─────────────────────────────────────────
const ENGINE_COLORS: Record<string, string> = {
  NEXTFLOW: "green",
  SNAKEMAKE: "blue",
  CWL: "purple",
};

const PIPELINE_STATUS_COLORS: Record<string, string> = {
  IN_PROGRESS: "orange",
  PASSED: "green",
  FAILED: "red",
  RETIRED: "default",
};

const JOB_STATUS_COLORS: Record<string, string> = {
  QUEUED: "default",
  RUNNING: "processing",
  COMPLETED: "success",
  FAILED: "error",
  TIMEOUT: "warning",
  CANCELLED: "default",
};

const JOB_STATUS_LABELS: Record<string, string> = {
  QUEUED: "排队中",
  RUNNING: "运行中",
  COMPLETED: "已完成",
  FAILED: "失败",
  TIMEOUT: "超时",
  CANCELLED: "已取消",
};

// ── Pipelines Tab ──────────────────────────────────────────
function PipelinesTab() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await api.get("/bioinformatics/pipelines/");
      setPipelines(res.data.results || res.data || []);
    } catch {
      message.error("获取流水线列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
        <Text type="secondary">生物信息学分析流水线管理</Text>
        <Button size="small" icon={<ReloadOutlined />} onClick={fetch}>刷新</Button>
      </div>

      <Row gutter={[16, 16]}>
        {(pipelines || []).map((p) => (
          <Col key={p.id} span={12}>
            <Card
              size="small"
              title={`${p.name} (${p.version})`}
              extra={
                <Tag color={p.is_active ? "green" : "default"}>
                  {p.is_active ? "激活" : "停用"}
                </Tag>
              }
            >
              <Descriptions size="small" column={1}>
                <Descriptions.Item label="代码">
                  <code style={{ background: "#f0f0f0", padding: "2px 6px", borderRadius: 3 }}>{p.code}</code>
                </Descriptions.Item>
                <Descriptions.Item label="引擎">
                  <Tag color={ENGINE_COLORS[p.engine] || "default"}>{p.engine}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="参考基因组">{p.reference_genome}</Descriptions.Item>
                <Descriptions.Item label="验证状态">
                  <Tag color={PIPELINE_STATUS_COLORS[p.validation_status] || "default"}>
                    {p.validation_status}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="验证日期">
                  {p.validated_at ? dayjs(p.validated_at).format("YYYY-MM-DD") : "未验证"}
                </Descriptions.Item>
                <Descriptions.Item label="描述">{p.description || "—"}</Descriptions.Item>
                <Descriptions.Item label="创建时间">
                  {dayjs(p.created_at).format("YYYY-MM-DD HH:mm")}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
        ))}
      </Row>

      {pipelines.length === 0 && !loading && (
        <div style={{ textAlign: "center", padding: 40, color: "#999" }}>
          <LineChartOutlined style={{ fontSize: 48, marginBottom: 12 }} />
          <div>暂无已注册的流水线</div>
        </div>
      )}
    </div>
  );
}

// ── Analysis Jobs Tab ──────────────────────────────────────
function JobsTab() {
  const [jobs, setJobs] = useState<AnalysisJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedJob, setSelectedJob] = useState<AnalysisJob | null>(null);

  const fetch = async (p = page) => {
    setLoading(true);
    try {
      const res = await api.get("/bioinformatics/jobs/", { params: { page: p, page_size: 20, ordering: "-submitted_at" } });
      setJobs(res.data.results || []);
      setTotal(res.data.count || 0);
      setPage(p);
    } catch {
      message.error("获取分析任务失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReview = async (id: string, approval: string) => {
    try {
      await api.post(`/bioinformatics/jobs/${id}/review/`, { approval });
      message.success(`已${approval === "approved" ? "批准" : "拒绝"}分析结果`);
      fetch();
    } catch {
      message.error("操作失败");
    }
  };

  useEffect(() => { fetch(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
        <Text type="secondary">Pipeline 分析任务列表</Text>
        <Button size="small" icon={<ReloadOutlined />} onClick={() => fetch(1)}>刷新</Button>
      </div>

      {/* Stats */}
      <Row gutter={12} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="排队中"
              value={(jobs || []).filter((j) => j.status === "QUEUED").length}
              valueStyle={{ color: "#8c8c8c" }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="运行中"
              value={(jobs || []).filter((j) => j.status === "RUNNING").length}
              valueStyle={{ color: "#1890ff" }}
              prefix={<SyncOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="已完成"
              value={(jobs || []).filter((j) => j.status === "COMPLETED").length}
              valueStyle={{ color: "#52c41a" }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small">
            <Statistic
              title="失败"
              value={(jobs || []).filter((j) => j.status === "FAILED").length}
              valueStyle={{ color: "#ff4d4f" }}
              prefix={<BugOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Table<AnalysisJob>
        rowKey="id"
        dataSource={jobs}
        loading={loading}
        columns={[
          { title: "运行编号", dataIndex: "run_number", render: (v: string) => <code>{v || "—"}</code> },
          {
            title: "流水线",
            dataIndex: "pipeline_name",
            render: (v: string) => <Tag color="blue">{v || "—"}</Tag>,
          },
          {
            title: "状态",
            dataIndex: "status",
            width: 120,
            render: (v: string) => (
              <Tag color={JOB_STATUS_COLORS[v] || "default"} icon={v === "RUNNING" ? <SyncOutlined spin /> : undefined}>
                {JOB_STATUS_LABELS[v] || v}
              </Tag>
            ),
          },
          {
            title: "提交时间",
            dataIndex: "submitted_at",
            width: 160,
            render: (v: string) => dayjs(v).format("YYYY-MM-DD HH:mm"),
          },
          {
            title: "完成时间",
            dataIndex: "completed_at",
            width: 160,
            render: (v: string) => v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "—",
          },
          {
            title: "错误",
            dataIndex: "error_message",
            render: (v: string) => v ? <Text type="danger" ellipsis style={{ maxWidth: 200 }}>{v}</Text> : "—",
          },
          {
            title: "操作",
            key: "actions",
            width: 180,
            render: (_: unknown, r: AnalysisJob) => (
              <Space wrap size="small">
                <Button size="small" onClick={() => setSelectedJob(r)}>详情</Button>
                {r.status === "COMPLETED" && (
                  <>
                    <Popconfirm title="批准此分析结果？" onConfirm={() => handleReview(r.id, "approved")}>
                      <Button size="small" type="primary" icon={<CheckCircleOutlined />}>批准</Button>
                    </Popconfirm>
                    <Popconfirm title="拒绝此分析结果？" onConfirm={() => handleReview(r.id, "rejected")}>
                      <Button size="small" danger icon={<CloseCircleOutlined />}>拒绝</Button>
                    </Popconfirm>
                  </>
                )}
              </Space>
            ),
          },
        ]}
        pagination={{
          current: page, pageSize: 20, total, onChange: (p) => fetch(p),
          showSizeChanger: false, showTotal: (t) => `共 ${t} 条`,
        }}
        scroll={{ x: 1100 }}
      />

      {/* Job detail modal */}
      <Modal
        title="分析任务详情"
        open={!!selectedJob}
        onCancel={() => setSelectedJob(null)}
        footer={null}
        width={680}
      >
        {selectedJob && (
          <>
            <Descriptions size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="任务 ID" span={2}>
                <code style={{ background: "#f0f0f0", padding: "2px 6px", borderRadius: 3 }}>{selectedJob.id}</code>
              </Descriptions.Item>
              <Descriptions.Item label="运行编号">{selectedJob.run_number || "—"}</Descriptions.Item>
              <Descriptions.Item label="流水线">{selectedJob.pipeline_name}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={JOB_STATUS_COLORS[selectedJob.status] || "default"}>
                  {JOB_STATUS_LABELS[selectedJob.status] || selectedJob.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="提交时间">
                {dayjs(selectedJob.submitted_at).format("YYYY-MM-DD HH:mm")}
              </Descriptions.Item>
              <Descriptions.Item label="开始时间">
                {selectedJob.started_at ? dayjs(selectedJob.started_at).format("YYYY-MM-DD HH:mm") : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="完成时间">
                {selectedJob.completed_at ? dayjs(selectedJob.completed_at).format("YYYY-MM-DD HH:mm") : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="参数">
                {Object.keys(selectedJob.parameters || {}).length > 0
                  ? JSON.stringify(selectedJob.parameters, null, 2)
                  : "—"}
              </Descriptions.Item>
            </Descriptions>

            {/* Status timeline */}
            <Title level={5}>时间线</Title>
            <Timeline>
              <Timeline.Item
                dot={<ClockCircleOutlined style={{ color: "#8c8c8c" }} />}
                color={selectedJob.submitted_at ? "green" : "gray"}
              >
                提交 — {dayjs(selectedJob.submitted_at).format("YYYY-MM-DD HH:mm")}
              </Timeline.Item>
              {selectedJob.started_at && (
                <Timeline.Item
                  dot={<ThunderboltOutlined style={{ color: "#1890ff" }} />}
                  color="blue"
                >
                  开始运行 — {dayjs(selectedJob.started_at).format("YYYY-MM-DD HH:mm")}
                </Timeline.Item>
              )}
              {selectedJob.completed_at && selectedJob.status === "COMPLETED" && (
                <Timeline.Item
                  dot={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
                  color="green"
                >
                  完成 — {dayjs(selectedJob.completed_at).format("YYYY-MM-DD HH:mm")}
                </Timeline.Item>
              )}
              {selectedJob.status === "FAILED" && (
                <Timeline.Item
                  dot={<CloseCircleOutlined style={{ color: "#ff4d4f" }} />}
                  color="red"
                >
                  失败 — {selectedJob.error_message || dayjs(selectedJob.completed_at).format("YYYY-MM-DD HH:mm")}
                </Timeline.Item>
              )}
            </Timeline>

            {/* Metrics */}
            {selectedJob.metrics && Object.keys(selectedJob.metrics).length > 0 && (
              <>
                <Title level={5} style={{ marginTop: 16 }}>指标</Title>
                <pre style={{ background: "#f5f5f5", padding: 12, borderRadius: 4, maxHeight: 200, overflow: "auto" }}>
                  {JSON.stringify(selectedJob.metrics, null, 2)}
                </pre>
              </>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────
export default function Bioinformatics() {
  return (
    <DashboardLayout header="生物信息学">
      <Card>
        <Title level={4}>Pipeline 管理 & 分析任务</Title>
        <Tabs
          defaultActiveKey="jobs"
          items={[
            {
              key: "jobs",
              label: <span><PlayCircleOutlined /> 分析任务</span>,
              children: <JobsTab />,
            },
            {
              key: "pipelines",
              label: <span><LineChartOutlined /> 流水线注册</span>,
              children: <PipelinesTab />,
            },
          ]}
        />
      </Card>
    </DashboardLayout>
  );
}
