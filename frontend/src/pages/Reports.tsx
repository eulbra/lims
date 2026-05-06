import { useState, useEffect } from "react";
import { Table, Card, Space, Tag, Typography, Input, Modal, message, Popconfirm, Button, Descriptions, Divider } from "antd";
import { SearchOutlined, EyeOutlined, CheckCircleOutlined, SendOutlined, FileProtectOutlined, EditOutlined, ReloadOutlined, DownloadOutlined, DeleteOutlined } from "@ant-design/icons";
import DashboardLayout from "../components/DashboardLayout";
import { reportsApi } from "../api";
import type { Report } from "../api/types";

const { Text } = Typography;
const { Password } = Input;

const STATUS_CFG: Record<string, { color: string; label: string; actions: string[] }> = {
  DRAFT:    { color: "default", label: "Draft",    actions: ["review"] },
  REVIEWED: { color: "blue",    label: "Reviewed", actions: ["verify"] },
  VERIFIED: { color: "cyan",    label: "Verified", actions: ["sign"] },
  SIGNED:   { color: "gold",    label: "Signed",   actions: ["release"] },
  RELEASED: { color: "green",   label: "Released", actions: [] },
  AMENDED:  { color: "orange",  label: "Amended",  actions: [] },
};

export default function Reports() {
  const [passwordModal, setPasswordModal] = useState(false);
  const [esignPw, setEsignPw] = useState("");
  const [actionTarget, setActionTarget] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(true);
  const [data, setData] = useState<Report[]>([]);
  const [searchText, setSearchText] = useState("");

  // View detail modal
  const [viewModal, setViewModal] = useState(false);
  const [viewReport, setViewReport] = useState<Report | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const fetchReports = async () => {
    setTableLoading(true);
    try {
      const res = await reportsApi.list();
      setData(res.data.results ?? res.data);
    } catch {
      message.error("Failed to load reports");
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  const handleAction = async (report: Report, action: string) => {
    setLoading(true);
    try {
      if (action === "review") await reportsApi.review(report.id);
      else if (action === "verify") await reportsApi.verify(report.id);
      else if (action === "sign") await reportsApi.sign(report.id, esignPw);
      else if (action === "release") await reportsApi.release(report.id);
      const next: Record<string, string> = { review: "REVIEWED", verify: "VERIFIED", sign: "SIGNED", release: "RELEASED" };
      setData((prev) =>
        prev.map((r) =>
          r.id === report.id
            ? { ...r, status: next[action], released_at: action === "release" ? new Date().toISOString() : r.released_at }
            : r
        )
      );
      message.success(`Report ${report.report_number} → ${action}`);
    } catch (err: any) {
      message.error(err?.response?.data?.error || "Action failed");
    } finally {
      setLoading(false);
      setPasswordModal(false);
      setEsignPw("");
      setActionTarget(null);
    }
  };

  const openView = async (report: Report) => {
    setViewLoading(true);
    setViewModal(true);
    try {
      const res = await reportsApi.get(report.id);
      setViewReport(res.data);
    } catch {
      message.error("Failed to load report details");
      setViewModal(false);
    } finally {
      setViewLoading(false);
    }
  };

  const handleDownload = async (report: Report) => {
    if (report.pdf_file_path) {
      window.open(report.pdf_file_path, "_blank");
    } else if (report.content && Object.keys(report.content).length > 0) {
      try {
        const res = await reportsApi.download(report.id);
        const blob = new Blob([res.data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${report.report_number}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        message.success("Report downloaded");
      } catch {
        message.error("Download failed");
      }
    } else {
      message.info("No downloadable content available yet. Use Generate Report first.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await reportsApi.delete(id);
      message.success("Report deleted");
      fetchReports();
    } catch (err: any) {
      message.error(err?.response?.data?.error || "Delete failed");
    }
  };

  const filtered = data.filter((r) =>
    searchText
      ? r.report_number.toLowerCase().includes(searchText.toLowerCase())
        || r.sample_barcode.toLowerCase().includes(searchText.toLowerCase())
        || r.patient_name.toLowerCase().includes(searchText.toLowerCase())
      : true
  );

  const columns = [
    { title: "Report #", dataIndex: "report_number", key: "report_number", width: 190,
      render: (t: string) => <Text strong copyable={{ text: t }}>{t}</Text> },
    { title: "Sample", dataIndex: "sample_barcode", key: "sample_barcode", width: 160,
      render: (t: string) => <Text copyable={{ text: t }}>{t}</Text> },
    { title: "Patient", dataIndex: "patient_name", key: "patient_name", width: 120 },
    { title: "Status", key: "status", width: 120,
      render: (_: unknown, record: Report) => {
        const cfg = STATUS_CFG[record.status];
        return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : <Tag>{record.status}</Tag>;
      },
    },
    { title: "Ver", dataIndex: "version_number", key: "version_number", width: 50 },
    { title: "Released", dataIndex: "released_at", key: "released_at", width: 140,
      render: (d: string) => d ? new Date(d).toLocaleDateString() : <Text type="secondary">—</Text>,
    },
    { title: "Actions", key: "actions", width: 320,
      render: (_: unknown, record: Report) => {
        const cfg = STATUS_CFG[record.status];
        if (!cfg) return null;
        return (
          <Space size="small">
            <Button icon={<EyeOutlined />} size="small" type="text" title="View"
              onClick={() => openView(record)} />
            <Button icon={<DownloadOutlined />} size="small" type="text" title="Download"
              onClick={() => handleDownload(record)} />
            {cfg.actions.includes("review") && (
              <Popconfirm title="Review this report?" onConfirm={() => handleAction(record, "review")}>
                <Button icon={<CheckCircleOutlined />} size="small" type="text" style={{ color: "#1677ff" }} title="Review" />
              </Popconfirm>
            )}
            {cfg.actions.includes("verify") && (
              <Popconfirm title="Verify technical accuracy?" onConfirm={() => handleAction(record, "verify")}>
                <Button icon={<FileProtectOutlined />} size="small" type="text" style={{ color: "#52c41a" }} title="Verify" />
              </Popconfirm>
            )}
            {cfg.actions.includes("sign") && (
              <Button
                icon={<EditOutlined />}
                size="small"
                type="text"
                style={{ color: "#722ed1" }}
                title="Sign (21 CFR Part 11)"
                onClick={() => { setActionTarget(record); setPasswordModal(true); }}
              />
            )}
            {cfg.actions.includes("release") && (
              <Popconfirm title="Release to ordering physician?" onConfirm={() => handleAction(record, "release")}>
                <Button icon={<SendOutlined />} size="small" type="text" style={{ color: "#fa8c16" }} title="Release" />
              </Popconfirm>
            )}
            <Popconfirm title="Delete this report permanently?" onConfirm={() => handleDelete(record.id)}>
              <Button icon={<DeleteOutlined />} size="small" type="text" danger title="Delete" />
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  return (
    <DashboardLayout header="Reports">
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space>
          <Input placeholder="Search report #, barcode, patient..." prefix={<SearchOutlined />}
            style={{ width: 350 }} allowClear value={searchText}
            onChange={(e) => setSearchText(e.target.value)} />
          <Button icon={<ReloadOutlined />} onClick={fetchReports}>Refresh</Button>
        </Space>
      </Card>

      <Card>
        <Table<Report> columns={columns} dataSource={filtered} rowKey="id" loading={tableLoading}
          pagination={{ showTotal: (t) => `Total ${t} reports` }} />
      </Card>

      {/* Report Detail View Modal */}
      <Modal
        title={viewReport ? `Report: ${viewReport.report_number}` : "Report Detail"}
        open={viewModal}
        onCancel={() => { setViewModal(false); setViewReport(null); }}
        footer={
          <Space>
            {viewReport && (
              <Button icon={<DownloadOutlined />} onClick={() => handleDownload(viewReport)}>
                Download
              </Button>
            )}
            <Button onClick={() => { setViewModal(false); setViewReport(null); }}>Close</Button>
          </Space>
        }
        width={700}
      >
        {viewLoading ? (
          <Text type="secondary">Loading report details...</Text>
        ) : viewReport ? (
          <div>
            <Descriptions size="small" bordered column={2}>
              <Descriptions.Item label="Report #">{viewReport.report_number}</Descriptions.Item>
              <Descriptions.Item label="Version">{viewReport.version_number}</Descriptions.Item>
              <Descriptions.Item label="Sample">{viewReport.sample_barcode}</Descriptions.Item>
              <Descriptions.Item label="Patient">{viewReport.patient_name}</Descriptions.Item>
              <Descriptions.Item label="Panel">{viewReport.panel_code || "—"}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={STATUS_CFG[viewReport.status]?.color || "default"}>
                  {STATUS_CFG[viewReport.status]?.label || viewReport.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Reviewed">
                {viewReport.reviewed_by_name
                  ? `${viewReport.reviewed_by_name} (${viewReport.reviewed_at ? new Date(viewReport.reviewed_at).toLocaleDateString() : ""})`
                  : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Verified">
                {viewReport.verified_by_name
                  ? `${viewReport.verified_by_name} (${viewReport.verified_at ? new Date(viewReport.verified_at).toLocaleDateString() : ""})`
                  : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Signed">
                {viewReport.signed_by_name
                  ? `${viewReport.signed_by_name} (${viewReport.signed_at ? new Date(viewReport.signed_at).toLocaleDateString() : ""})`
                  : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Released">
                {viewReport.released_at ? new Date(viewReport.released_at).toLocaleDateString() : "—"}
              </Descriptions.Item>
            </Descriptions>

            {viewReport.content && Object.keys(viewReport.content).length > 0 ? (
              <>
                <Divider orientation="left">Report Content</Divider>
                {viewReport.content.results && Object.keys(viewReport.content.results).length > 0 ? (
                  <>
                    <Divider orientation="left" style={{ fontWeight: 700, color: "#1677ff" }}>Test Results</Divider>
                    <Descriptions size="small" bordered column={2} style={{ marginBottom: 16 }}>
                      {Object.entries(viewReport.content.results).map(([k, v]) => (
                        <Descriptions.Item
                          key={k}
                          label={String(k).replace(/_/g, " ").toUpperCase()}
                          labelStyle={{ fontWeight: 600 }}
                        >
                          <Tag color={v === "POSITIVE" || v === "HIGH_RISK" ? "red" : v === "NEGATIVE" || v === "LOW_RISK" ? "green" : "default"}>
                            {String(v)}
                          </Tag>
                        </Descriptions.Item>
                      ))}
                    </Descriptions>
                  </>
                ) : null}
                <Divider orientation="left" style={{ fontSize: 12 }}>Raw Data</Divider>
                <pre style={{ background: "#f6ffed", padding: 12, borderRadius: 6, maxHeight: 400, overflow: "auto", fontSize: 12 }}>
                  {JSON.stringify(viewReport.content, null, 2)}
                </pre>
              </>
            ) : (
              <>
                <Divider />
                <div style={{ textAlign: "center", padding: "24px 0" }}>
                  <p style={{ color: "#999" }}>Report content not generated yet.</p>
                  <Button
                    type="primary"
                    loading={viewLoading}
                    onClick={async () => {
                      if (!viewReport) return;
                      setViewLoading(true);
                      try {
                        const res = await reportsApi.generate(viewReport.id);
                        setViewReport(res.data);
                        message.success("Report generated");
                        fetchReports();
                      } catch {
                        message.error("Failed to generate report");
                      } finally {
                        setViewLoading(false);
                      }
                    }}
                  >
                    Generate Report Content
                  </Button>
                </div>
              </>
            )}

            {viewReport.pdf_file_path && (
              <>
                <Divider />
                <Button type="primary" icon={<DownloadOutlined />} block
                  onClick={() => window.open(viewReport.pdf_file_path!, "_blank")}>
                  Open PDF
                </Button>
              </>
            )}
          </div>
        ) : (
          <Text type="secondary">No report selected</Text>
        )}
      </Modal>

      {/* 21 CFR Part 11 E-Signature Modal */}
      <Modal
        title={<span><FileProtectOutlined style={{ marginRight: 8, color: "#722ed1" }} />Electronic Signature</span>}
        open={passwordModal}
        onCancel={() => { setPasswordModal(false); setEsignPw(""); setActionTarget(null); }}
        footer={null}
        width={450}
      >
        <div style={{ padding: "16px 0" }}>
          <p style={{ marginBottom: 4 }}><strong>Report:</strong> {actionTarget?.report_number}</p>
          <p style={{ marginBottom: 16, fontSize: 12, color: "#999" }}>
            Sign and approve this report. This action is logged in the audit trail per 21 CFR Part 11.
            <br />
            <strong>Password is your current login password.</strong>
          </p>
          <label style={{ fontSize: 13, fontWeight: 500 }}>Re-authenticate with your password:</label>
          <Password
            value={esignPw}
            onChange={(e) => setEsignPw(e.target.value)}
            placeholder="Enter your password"
            style={{ marginTop: 6, marginBottom: 16 }}
            onPressEnter={() => actionTarget && handleAction(actionTarget, "sign")}
          />
          <Button
            type="primary" block disabled={!esignPw} loading={loading}
            onClick={() => actionTarget && handleAction(actionTarget, "sign")}
          >
            Sign Report
          </Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
