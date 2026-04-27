import { useEffect, useState } from "react";
import { Card, Row, Col, Statistic, Spin, Alert, Tag, Table } from "antd";
import {
  InboxOutlined, LoadingOutlined, CheckCircleOutlined,
  FileTextOutlined, WarningOutlined,
} from "@ant-design/icons";
import { samplesApi, runsApi, qcApi } from "../api";
import DashboardLayout from "../components/DashboardLayout";

export default function Dashboard() {
  const [stats, setStats] = useState({
    received: 0, inProcess: 0, completed: 0, reported: 0, rejected: 0,
  });
  const [runStats, setRunStats] = useState<{ total: number; byStatus: { status: string; count: number }[] }>({ total: 0, byStatus: [] });
  const [qcEvents, setQcEvents] = useState<Array<{ id: string; summary: string; event_type: string; severity: string; status: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      samplesApi.stats().then(r => r.data).catch(() => null),
      runsApi.stats().then(r => r.data).catch(() => null),
      qcApi.listEvents({ status: 'OPEN', ordering: '-created_at' }).then(r => r.data.results).catch(() => []),
    ]).then(([s, r, e]) => {
      if (s) setStats({
        received: s.total_received_today,
        inProcess: s.total_in_process,
        completed: s.total_completed,
        reported: s.total_reported,
        rejected: s.total_rejected_today,
      });
      if (r) {
        const byStatus = r.by_status
          ? r.by_status
          : Object.entries(r)
              .filter(([k]) => k !== "total")
              .map(([status, count]) => ({ status, count: count as number }));
        setRunStats({
          total: r.total ?? 0,
          byStatus,
        });
      }
      setQcEvents(e);
      setLoading(false);
    }).catch((err) => {
      setError(err.message);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <DashboardLayout header="Dashboard">
        <div style={{ textAlign: "center", padding: 80 }}>
          <Spin size="large" tip="Loading dashboard..." />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout header="Dashboard">
        <Alert type="error" message={error} showIcon closable />
      </DashboardLayout>
    );
  }

  const statusColor: Record<string, string> = {
    RECEIVED: "blue", ACCEPTED: "green", REJECTED: "red",
    IN_PROCESS: "gold", COMPLETED: "cyan", REPORTED: "purple",
    PLANNED: "default", LIBRARY_PREP: "blue", SEQUENCING: "purple",
    ANALYZING: "orange", QC_REVIEW: "gold", FAILED: "red",
  };

  return (
    <DashboardLayout header="Dashboard">
      {/* ── KPI cards ─────────────────────────────────────── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Received Today"
              value={stats.received}
              prefix={<InboxOutlined />}
              valueStyle={{ color: "#1677ff" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="In Progress"
              value={stats.inProcess}
              prefix={<LoadingOutlined />}
              valueStyle={{ color: "#faad14" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Completed"
              value={stats.completed}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Reports Released"
              value={stats.reported}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: "#722ed1" }}
            />
          </Card>
        </Col>
      </Row>

      {/* Rejection alert */}
      {stats.rejected > 0 && (
        <Alert
          type="warning"
          message={`${stats.rejected} sample(s) rejected today`}
          description="Please review rejected samples and notify the ordering facility."
          showIcon
          closable
          style={{ marginBottom: 16 }}
        />
      )}

      {/* ── Run status + QC events ─────────────────────────── */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card title="Run Status" size="small">
            <Row gutter={[8, 8]}>
              {runStats.byStatus.map(({ status, count }) => (
                <Col key={status} xs={8} sm={6}>
                  <Tag
                    color={statusColor[status] || "default"}
                    style={{
                      width: "100%", textAlign: "center", padding: "8px 4px",
                      fontSize: 14, display: "block", borderRadius: 8,
                    }}
                  >
                    <div style={{ fontSize: 24, fontWeight: 600 }}>{count}</div>
                    <div style={{ fontSize: 11, opacity: 0.8 }}>
                      {status.replace(/_/g, " ")}
                    </div>
                  </Tag>
                </Col>
              ))}
              {runStats.byStatus.length === 0 && (
                <Col span={24} style={{ textAlign: "center", padding: 24, color: "#999" }}>
                  No runs found
                </Col>
              )}
            </Row>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card
            title={
              <span>
                <WarningOutlined style={{ color: "#faad14", marginRight: 6 }} />
                Open QC Events
              </span>
            }
            size="small"
          >
            <Table
              dataSource={qcEvents}
              rowKey="id"
              size="small"
              pagination={false}
              scroll={{ y: 200 }}
              columns={[
                {
                  title: "Event", dataIndex: "summary", key: "summary",
                  ellipsis: true,
                },
                {
                  title: "Type", dataIndex: "event_type", key: "type", width: 80,
                  render: (t: string) => t ? <Tag color={t === "QC_FAILURE" ? "red" : "orange"}>{t.replace(/_/g, " ")}</Tag> : "",
                },
                {
                  title: "Severity", dataIndex: "severity", key: "sev", width: 70,
                  render: (s: string) => <Tag color={s === "CRITICAL" ? "red" : s === "HIGH" ? "orange" : "blue"}>{s}</Tag>,
                },
              ]}
              locale={{ emptyText: "No open QC events" }}
            />
          </Card>
        </Col>
      </Row>
    </DashboardLayout>
  );
}
