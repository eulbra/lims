import { useState, useEffect } from "react";
import {
  Table, Card, Button, Tag, Typography, Tabs,
  message, Statistic, Row, Col,
} from "antd";
import {
  ReloadOutlined, FileTextOutlined,
  TeamOutlined, BarChartOutlined,
  CheckCircleOutlined, ExclamationCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import api from "../api/client";
import DashboardLayout from "../components/DashboardLayout";

const { Title, Text } = Typography;

// ── Types ──────────────────────────────────────────────────
interface TrainingRecord {
  id: string;
  user: string;
  user_name?: string;
  topic: string;
  document: string | null;
  training_type: string;
  completed_at: string | null;
  trainer: string | null;
  trainer_name?: string;
  notes: string;
  due_date: string | null;
  site: string;
  created_at: string;
}

interface CompetencyAssessment {
  id: string;
  user: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  assessment_type: string;
  panel: string | null;
  panel_name?: string;
  assessor: string;
  assessor_name?: string;
  result: string;
  assessment_date: string;
  notes: string;
  site: string;
  created_at: string;
}

interface CompetencySummary {
  user__username: string;
  user__first_name: string;
  user__last_name: string;
  total: number;
  passed: number;
  failed: number;
  needs_improvement: number;
  last_assessment: string;
}

// ── Status helpers ─────────────────────────────────────────
const TRAINING_TYPE_COLORS: Record<string, string> = {
  SOP_REVIEW: "blue",
  EXTERNAL: "purple",
  INTERNAL: "green",
  ONBOARDING: "orange",
};

const RESULT_COLORS: Record<string, string> = {
  PASS: "green",
  FAIL: "red",
  NEEDS_IMPROVEMENT: "orange",
};

const TYPE_LABELS: Record<string, string> = {
  SOP_REVIEW: "SOP阅读",
  EXTERNAL: "外部培训",
  INTERNAL: "内部培训",
  ONBOARDING: "入职培训",
};

const ASSESSMENT_TYPE_LABELS: Record<string, string> = {
  DIRECT_OBSERVATION: "直接观察",
  MONITORING: "监控记录与报告",
  INTERMEDIATE_REVIEW: "中间结果审核",
  INSTRUMENT_MAINTENANCE: "仪器维护观察",
  BLIND_SAMPLE: "盲样测试",
  PROBLEM_SOLVING: "问题解决能力",
};

// ── Training Records Tab ───────────────────────────────────
function TrainingRecordsTab() {
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const fetch = async (p = page) => {
    setLoading(true);
    try {
      const res = await api.get("/training/records/", { params: { page: p, page_size: 20, ordering: "-created_at" } });
      setRecords(res.data.results || []);
      setTotal(res.data.count || 0);
      setPage(p);
    } catch {
      message.error("获取培训记录失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
        <Text type="secondary">跟踪所有培训记录，包括SOP阅读、外部培训、内部培训等</Text>
        <Button size="small" icon={<ReloadOutlined />} onClick={() => fetch(1)}>刷新</Button>
      </div>

      {/* Stats */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="记录总数" value={total} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="已完成"
              value={(records as TrainingRecord[]).filter((r) => r.completed_at !== null).length}
              valueStyle={{ color: "#52c41a" }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic
              title="逾期"
              value={(records as TrainingRecord[]).filter(
                (r) => r.due_date && !r.completed_at && dayjs(r.due_date).isBefore(dayjs())
              ).length}
              valueStyle={{ color: "#ff4d4f" }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Table<TrainingRecord>
        rowKey="id"
        dataSource={records}
        loading={loading}
        columns={[
          {
            title: "培训类型",
            dataIndex: "training_type",
            width: 130,
            render: (v: string) => <Tag color={TRAINING_TYPE_COLORS[v] || "default"}>{TYPE_LABELS[v] || v}</Tag>,
          },
          { title: "主题", dataIndex: "topic", render: (v: string) => <strong>{v}</strong> },
          { title: "学员", dataIndex: "user", render: (v: string) => <code style={{ fontSize: 11 }}>{v?.substring(0, 8)}...</code> },
          {
            title: "完成日期",
            dataIndex: "completed_at",
            width: 130,
            render: (v: string) => v ? dayjs(v).format("YYYY-MM-DD") : <Tag color="orange">未完成</Tag>,
          },
          {
            title: "截止日期",
            dataIndex: "due_date",
            width: 130,
            render: (v: string, r: TrainingRecord) => {
              if (!v) return "—";
              const days = dayjs(v).diff(dayjs(), "day");
              if (days < 0 && !r.completed_at) return <Tag color="red">已逾期 {Math.abs(days)} 天</Tag>;
              if (days <= 7 && !r.completed_at) return <Tag color="orange">剩余 {days} 天</Tag>;
              return v;
            },
          },
          { title: "备注", dataIndex: "notes", render: (v: string) => v || "—" },
          {
            title: "创建时间",
            dataIndex: "created_at",
            width: 160,
            render: (v: string) => dayjs(v).format("YYYY-MM-DD HH:mm"),
          },
        ]}
        pagination={{
          current: page, pageSize: 20, total, onChange: (p) => fetch(p),
          showSizeChanger: false, showTotal: (t) => `共 ${t} 条`,
        }}
        scroll={{ x: 1000 }}
      />
    </div>
  );
}

// ── Competency Assessments Tab ─────────────────────────────
function CompetencyTab() {
  const [assessments, setAssessments] = useState<CompetencyAssessment[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const fetch = async (p = page) => {
    setLoading(true);
    try {
      const res = await api.get("/training/competencies/", { params: { page: p, page_size: 20 } });
      setAssessments(res.data.results || []);
      setTotal(res.data.count || 0);
      setPage(p);
    } catch {
      message.error("获取能力评估失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">CAP要求的能力评估 — 六种CAP评估方法</Text>
        <Button size="small" icon={<ReloadOutlined />} onClick={() => fetch(1)} style={{ marginLeft: 8 }}>刷新</Button>
      </div>

      <Table<CompetencyAssessment>
        rowKey="id"
        dataSource={assessments}
        loading={loading}
        columns={[
          {
            title: "评估类型",
            dataIndex: "assessment_type",
            width: 200,
            render: (v: string) => ASSESSMENT_TYPE_LABELS[v] || v,
          },
          { title: "学员", dataIndex: "user", render: (v: string) => <code style={{ fontSize: 11 }}>{v?.substring(0, 8)}...</code> },
          {
            title: "结果",
            dataIndex: "result",
            width: 140,
            render: (v: string) => {
              const labels: Record<string, string> = { PASS: "✅ 通过", FAIL: "❌ 不通过", NEEDS_IMPROVEMENT: "⚠️ 需改进" };
              return <Tag color={RESULT_COLORS[v] || "default"}>{labels[v] || v}</Tag>;
            },
          },
          { title: "评估日期", dataIndex: "assessment_date", width: 130, render: (v: string) => dayjs(v).format("YYYY-MM-DD") },
          { title: "备注", dataIndex: "notes", render: (v: string) => v || "—", ellipsis: { showTitle: true } },
          { title: "创建时间", dataIndex: "created_at", width: 160, render: (v: string) => dayjs(v).format("YYYY-MM-DD HH:mm") },
        ]}
        pagination={{
          current: page, pageSize: 20, total, onChange: (p) => fetch(p),
          showSizeChanger: false, showTotal: (t) => `共 ${t} 条`,
        }}
        scroll={{ x: 1000 }}
      />
    </div>
  );
}

// ── Competency Summary Tab ─────────────────────────────────
function CompetencySummaryTab() {
  const [summary, setSummary] = useState<CompetencySummary[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await api.get("/training/competencies/competency_summary/");
      const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setSummary(data);
    } catch {
      message.error("获取能力评估汇总失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPassed = summary.reduce((a, b) => a + b.passed, 0);
  const totalFailed = summary.reduce((a, b) => a + b.failed, 0);
  const totalNI = summary.reduce((a, b) => a + b.needs_improvement, 0);

  return (
    <div>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
        <Text type="secondary">站点所有人员的能力评估综合统计</Text>
        <Button size="small" icon={<ReloadOutlined />} onClick={fetch}>刷新</Button>
      </div>

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="总通过" value={totalPassed} valueStyle={{ color: "#52c41a" }} prefix={<CheckCircleOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="总不通过" value={totalFailed} valueStyle={{ color: "#ff4d4f" }} prefix={<ExclamationCircleOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="需改进" value={totalNI} valueStyle={{ color: "#fa8c16" }} prefix={<ExclamationCircleOutlined />} />
          </Card>
        </Col>
      </Row>

      <Table<CompetencySummary>
        rowKey="user__username"
        dataSource={summary}
        loading={loading}
        columns={[
          {
            title: "姓名",
            dataIndex: "user__username",
            render: (v: string, r: CompetencySummary) => <strong>{r.user__first_name} {r.user__last_name} ({v})</strong>,
          },
          { title: "评估总数", dataIndex: "total" },
          { title: "通过", dataIndex: "passed", render: (v: number) => <Tag color="green">{v}</Tag> },
          { title: "不通过", dataIndex: "failed", render: (v: number) => <Tag color="red">{v}</Tag> },
          { title: "需改进", dataIndex: "needs_improvement", render: (v: number) => <Tag color="orange">{v}</Tag> },
          {
            title: "通过率",
            dataIndex: "total",
            render: (_: number, r: CompetencySummary) => r.total > 0 ? `${((r.passed / r.total) * 100).toFixed(1)}%` : "—",
          },
          { title: "最后一次评估", dataIndex: "last_assessment", render: (v: string) => v ? dayjs(v).format("YYYY-MM-DD") : "—" },
        ]}
        pagination={false}
        scroll={{ x: 800 }}
      />
    </div>
  );
}

// ── Overdue Training Tab ───────────────────────────────────
function OverdueTab() {
  const [overdue, setOverdue] = useState<TrainingRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await api.get("/training/records/overdue/");
      const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setOverdue(data);
    } catch {
      message.error("获取逾期培训失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Text type="secondary">已过截止日期但尚未完成的培训记录</Text>
        <Button size="small" icon={<ReloadOutlined />} onClick={fetch} style={{ marginLeft: 8 }}>刷新</Button>
      </div>
      {overdue.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#52c41a" }}>
          <CheckCircleOutlined style={{ fontSize: 48, marginBottom: 12 }} />
          <div style={{ fontSize: 16 }}>暂无逾期培训记录，所有培训按时完成 ✅</div>
        </div>
      ) : (
        <Table<TrainingRecord>
          rowKey="id"
          dataSource={overdue}
          loading={loading}
          columns={[
            { title: "主题", dataIndex: "topic", render: (v: string) => <strong>{v}</strong> },
            {
              title: "培训类型",
              dataIndex: "training_type",
              width: 130,
              render: (v: string) => <Tag color={TRAINING_TYPE_COLORS[v] || "default"}>{TYPE_LABELS[v] || v}</Tag>,
            },
            { title: "学员", dataIndex: "user", render: (v: string) => <code style={{ fontSize: 11 }}>{v?.substring(0, 8)}...</code> },
            {
              title: "截止日期",
              dataIndex: "due_date",
              width: 140,
              render: (v: string) => {
                if (!v) return "—";
                const days = dayjs(v).diff(dayjs(), "day");
                return <Tag color="red">已逾期 {Math.abs(days)} 天 ({v})</Tag>;
              },
            },
            { title: "备注", dataIndex: "notes", render: (v: string) => v || "—" },
          ]}
          pagination={false}
        />
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────
export default function Training() {
  return (
    <DashboardLayout header="培训与能力">
      <Card>
        <Title level={4}>培训管理 & 能力评估 (CAP)</Title>
        <Tabs
          defaultActiveKey="records"
          items={[
            {
              key: "records",
              label: <span><FileTextOutlined /> 培训记录</span>,
              children: <TrainingRecordsTab />,
            },
            {
              key: "competency",
              label: <span><TeamOutlined /> 能力评估</span>,
              children: <CompetencyTab />,
            },
            {
              key: "summary",
              label: <span><BarChartOutlined /> 能力汇总</span>,
              children: <CompetencySummaryTab />,
            },
            {
              key: "overdue",
              label: <span><ExclamationCircleOutlined /> 逾期培训</span>,
              children: <OverdueTab />,
            },
          ]}
        />
      </Card>
    </DashboardLayout>
  );
}
