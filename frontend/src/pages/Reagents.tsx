import { useState, useEffect } from "react";
import { Table, Card, Space, Tag, Typography, Input, Alert, Button, message, Popconfirm } from "antd";
import { SearchOutlined, ReloadOutlined, WarningOutlined, PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import DashboardLayout from "../components/DashboardLayout";
import { reagentsApi } from "../api";
import type { ReagentLot } from "../api/types";
import dayjs from "dayjs";

const { Text } = Typography;

const STATUS_COLORS: Record<string, string> = {
  IN_USE: "green", QC_PASSED: "cyan", PENDING_QC: "orange", QC_FAILED: "red", EXPIRED: "default", DEPLETED: "default",
};

export default function Reagents() {
  const [loading, setLoading] = useState(true);
  const [lots, setLots] = useState<ReagentLot[]>([]);

  const fetchLots = async () => {
    setLoading(true);
    try {
      const res = await reagentsApi.list();
      setLots(Array.isArray(res.data) ? res.data : res.data.results ?? []);
    } catch {
      message.error("Failed to load reagent lots");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (record: ReagentLot) => {
    try {
      await reagentsApi.delete(record.id);
      message.success(`Deleted ${record.reagent_name} — ${record.lot_number}`);
      fetchLots();
    } catch {
      message.error("Failed to delete reagent lot");
    }
  };

  useEffect(() => { fetchLots(); }, []);

  const nearExpiry = lots.filter(l =>
    l.expiry_date && dayjs(l.expiry_date).isBefore(dayjs().add(30, "day"))
      && !["EXPIRED", "DEPLETED"].includes(l.quality_status)
  );

  const columns = [
    { title: "Reagent", dataIndex: "reagent_name", key: "reagent_name", width: 220, render: (t: string) => <Text strong>{t}</Text> },
    { title: "Lot #", dataIndex: "lot_number", key: "lot_number", width: 140, render: (t: string) => <Text copyable={{ text: t }}>{t}</Text> },
    { title: "Status", dataIndex: "quality_status", key: "quality_status", width: 120, render: (s: string) => <Tag color={STATUS_COLORS[s]}>{s.replace(/_/g, " ")}</Tag> },
    { title: "Quantity", key: "quantity", width: 150, render: (_: unknown, r: ReagentLot) => <span>{r.remaining} {r.unit}</span> },
    {
      title: "Expiry", dataIndex: "expiry_date", key: "expiry_date", width: 160,
      render: (d: string, _record: ReagentLot) => {
        if (!d) return <Text type="secondary">—</Text>;
        const exp = dayjs(d);
        const daysLeft = exp.diff(dayjs(), "day");
        const color = daysLeft <= 0 ? "red" : daysLeft <= 30 ? "orange" : "inherit";
        return <span style={{ color }}>{d} ({daysLeft > 0 ? daysLeft + "d" : "EXPIRED"})</span>;
      },
    },
    {
      title: "Actions", key: "actions", width: 100,
      render: (_: unknown, record: ReagentLot) => (
        <Popconfirm
          title="Delete lot?"
          description={`Delete ${record.reagent_name} — ${record.lot_number}?`}
          onConfirm={() => handleDelete(record)}
          okText="Delete"
          okButtonProps={{ danger: true }}
        >
          <Button icon={<DeleteOutlined />} size="small" type="text" danger />
        </Popconfirm>
      ),
    },
  ];

  return (
    <DashboardLayout header="Reagents &amp; Inventory">
      {nearExpiry.length > 0 && (
        <Alert
          type="warning"
          message={<span><WarningOutlined style={{ marginRight: 6 }} />{nearExpiry.length} lot(s) expiring within 30 days</span>}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      <Card size="small" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Space>
            <Input.Search placeholder="Search reagents or lot numbers..." prefix={<SearchOutlined />} style={{ width: 320 }} allowClear />
            <Button icon={<ReloadOutlined />} onClick={fetchLots}>Refresh</Button>
          </Space>
          <Space>
            <Text type="secondary">{lots.length} lots</Text>
            <Button type="primary" icon={<PlusOutlined />}>Register New Lot</Button>
          </Space>
        </div>
      </Card>
      <Card>
        <Table<ReagentLot> columns={columns} dataSource={lots} rowKey="id" loading={loading}
          pagination={{ showTotal: (t) => `Total ${t} lots` }} />
      </Card>
    </DashboardLayout>
  );
}
