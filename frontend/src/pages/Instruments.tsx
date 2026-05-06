import { Table, Card, Button, Space, Tag, Typography, Input, message, Popconfirm } from "antd";
import { SearchOutlined, PlusOutlined, ReloadOutlined, ToolOutlined, DeleteOutlined } from "@ant-design/icons";
import { instrumentsApi } from "../api";
import type { Instrument } from "../api/types";
import { usePaginated } from "../hooks/useList";
import DashboardLayout from "../components/DashboardLayout";

const { Text } = Typography;
const { Search } = Input;

export default function Instruments() {
  const { items, total, loading, fetch, search, setSearch } = usePaginated<Instrument>(
    ({ page, size, search }) =>
      instrumentsApi.list({ page, size, search }),
    { autoFetch: true }
  );

  const handleDelete = async (record: Instrument) => {
    try {
      await instrumentsApi.delete(record.id);
      message.success(`Deleted ${record.name}`);
      fetch();
    } catch {
      message.error("Failed to delete instrument");
    }
  };

  const STATUS_COLORS: Record<string, string> = {
    ACTIVE: "green", MAINTENANCE: "orange", OUT_OF_SERVICE: "red", RETIRED: "default",
  };

  const columns = [
    { title: "Name", dataIndex: "name", key: "name", width: 200,
      render: (t: string) => <Text strong><ToolOutlined style={{ marginRight: 8, color: "#1677ff" }} />{t}</Text> },
    { title: "Type", dataIndex: "instrument_type", key: "instrument_type", width: 130, render: (t: string) => <Tag color="blue">{t}</Tag> },
    { title: "Manufacturer", dataIndex: "manufacturer", key: "manufacturer", width: 150 },
    { title: "Model", dataIndex: "model", key: "model", width: 180 },
    { title: "Serial #", dataIndex: "serial_number", key: "serial_number", width: 130,
      render: (t: string) => <Text copyable={{ text: t }}>{t}</Text> },
    { title: "Location", dataIndex: "location", key: "location", width: 100 },
    { title: "Status", dataIndex: "status", key: "status", width: 140,
      render: (s: string) => <Tag color={STATUS_COLORS[s]}>{s.replace(/_/g, " ")}</Tag> },
    {
      title: "Actions", key: "actions", width: 100,
      render: (_: unknown, record: Instrument) => (
        <Popconfirm
          title="Delete instrument?"
          description={`Delete ${record.name}?`}
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
    <DashboardLayout header="Instruments">
      <Card size="small" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Space>
            <Search placeholder="Search instruments..." prefix={<SearchOutlined />} style={{ width: 280 }} allowClear
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onSearch={() => fetch()}
            />
            <Button icon={<ReloadOutlined />} onClick={() => { fetch(); message.success("Refreshed"); }}>Refresh</Button>
          </Space>
          <Space>
            <Text type="secondary">{total} total</Text>
            <Button type="primary" icon={<PlusOutlined />}>Register Instrument</Button>
          </Space>
        </div>
      </Card>
      <Card>
        <Table<Instrument>
          columns={columns}
          dataSource={items}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1100 }}
          pagination={{
            current: 1,
            pageSize: 50,
            showTotal: (t) => `Total ${t} instruments`,
          }}
        />
      </Card>
    </DashboardLayout>
  );
}
