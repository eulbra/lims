import { useState, useEffect, useCallback, useRef } from "react";
import {
  Table, Card, Button, Space, Tag, Typography, Input,
  Modal, Form, Select, message, Tabs, Popconfirm, Tooltip,
} from "antd";
import {
  PlusOutlined, ReloadOutlined, SearchOutlined,
  DeleteOutlined, EnvironmentOutlined, InboxOutlined,
} from "@ant-design/icons";
import { storageApi } from "../api";
import type { StorageLocation, Box, BoxPosition, Pageable } from "../api/types";
import type { ColumnsType } from "antd/es/table";
import DashboardLayout from "../components/DashboardLayout";

const { Text } = Typography;
const { Option } = Select;

// ── Location Type colors ──────────────────────────────────
const LOCATION_TYPE_COLORS: Record<string, string> = {
  FREEZER: "blue",
  REFRIGERATOR: "cyan",
  ROOM_TEMP: "green",
  LN2: "purple",
};

// ── Storage Locations Tab ─────────────────────────────────
function StorageLocationsTab() {
  const [items, setItems] = useState<StorageLocation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [parentOptions, setParentOptions] = useState<StorageLocation[]>([]);
  const [form] = Form.useForm();
  const searchRef = useRef(search);
  const pageRef = useRef(page);

  useEffect(() => { searchRef.current = search; }, [search]);
  useEffect(() => { pageRef.current = page; }, [page]);

  const fetch = useCallback(async (p?: number, s?: string) => {
    const currentPage = p ?? pageRef.current;
    const currentSearch = s ?? searchRef.current;
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page: currentPage, size: 50 };
      if (currentSearch) params.search = currentSearch;
      const res = await storageApi.listLocations(params);
      const data = res.data as Pageable<StorageLocation>;
      setItems(data.results);
      setTotal(data.count);
      setPage(currentPage);
      setSearch(currentSearch);
    } catch {
      message.error("Failed to load storage locations");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchParents = useCallback(async () => {
    try {
      const res = await storageApi.listLocations({ size: 200 });
      const data = res.data as Pageable<StorageLocation>;
      setParentOptions(data.results);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleDelete = async (id: string) => {
    try {
      await storageApi.deleteLocation(id);
      message.success("Location deleted");
      fetch();
    } catch {
      message.error("Failed to delete location");
    }
  };

  const openCreate = () => {
    form.resetFields();
    fetchParents();
    setModalOpen(true);
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      await storageApi.createLocation(values);
      message.success("Location created");
      setModalOpen(false);
      form.resetFields();
      fetch(1);
    } catch {
      message.error("Failed to create location");
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<StorageLocation> = [
    {
      title: "Name", dataIndex: "name", key: "name", width: 200,
      render: (t: string) => <Text strong><EnvironmentOutlined style={{ marginRight: 8, color: "#1677ff" }} />{t}</Text>,
    },
    {
      title: "Type", dataIndex: "location_type", key: "location_type", width: 140,
      render: (t: string) => <Tag color={LOCATION_TYPE_COLORS[t] || "default"}>{t?.replace(/_/g, " ")}</Tag>,
    },
    {
      title: "Barcode", dataIndex: "barcode", key: "barcode", width: 160,
      render: (t: string) => t ? <Text copyable={{ text: t }} code>{t}</Text> : <Text type="secondary">—</Text>,
    },
    {
      title: "Parent", dataIndex: "parent_name", key: "parent_name", width: 160,
      render: (t: string) => t || <Text type="secondary">—</Text>,
    },
    {
      title: "Boxes", dataIndex: "box_count", key: "box_count", width: 80,
      render: (n: number) => <Tag color={n > 0 ? "blue" : "default"}>{n}</Tag>,
    },
    {
      title: "Active", dataIndex: "is_active", key: "is_active", width: 80,
      render: (v: boolean) => <Tag color={v ? "green" : "red"}>{v ? "Yes" : "No"}</Tag>,
    },
    {
      title: "Actions", key: "actions", width: 80,
      render: (_: unknown, record: StorageLocation) => (
        <Popconfirm
          title="Delete location?"
          description={`Delete ${record.name}?`}
          onConfirm={() => handleDelete(record.id)}
          okText="Delete"
          okButtonProps={{ danger: true }}
        >
          <Button icon={<DeleteOutlined />} size="small" type="text" danger />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Space>
          <Input.Search
            placeholder="Search locations..."
            prefix={<SearchOutlined />}
            style={{ width: 280 }}
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={() => fetch(1, search)}
          />
          <Button icon={<ReloadOutlined />} onClick={() => fetch()}>Refresh</Button>
        </Space>
        <Space>
          <Text type="secondary">{total} total</Text>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add Location</Button>
        </Space>
      </div>

      <Table<StorageLocation>
        columns={columns}
        dataSource={items}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize: 50,
          total,
          onChange: (p) => fetch(p),
          showTotal: (t) => `Total ${t} locations`,
        }}
        scroll={{ x: 900 }}
      />

      <Modal
        title="Add Storage Location"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: "Name is required" }]}>
            <Input placeholder="e.g., Freezer A - Shelf 1" />
          </Form.Item>
          <Form.Item name="location_type" label="Type" rules={[{ required: true }]}>
            <Select placeholder="Select type">
              <Option value="FREEZER">Freezer (-20°C)</Option>
              <Option value="REFRIGERATOR">Refrigerator (4°C)</Option>
              <Option value="ROOM_TEMP">Room Temperature</Option>
              <Option value="LN2">Liquid Nitrogen</Option>
            </Select>
          </Form.Item>
          <Form.Item name="barcode" label="Barcode">
            <Input placeholder="Scan or enter barcode" />
          </Form.Item>
          <Form.Item name="parent" label="Parent Location">
            <Select placeholder="Select parent (optional)" allowClear showSearch optionFilterProp="label">
              {parentOptions.map((loc) => (
                <Option key={loc.id} value={loc.id} label={loc.name}>{loc.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Optional description" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ── Box Positions Grid ────────────────────────────────────
function PositionsGrid({ positions }: { positions: BoxPosition[] }) {
  const rows = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
  const cols = Array.from({ length: 10 }, (_, i) => i + 1);

  const posMap: Record<string, BoxPosition> = {};
  positions.forEach((p) => {
    posMap[`${p.row}${p.col}`] = p;
  });

  return (
    <div style={{ padding: 8 }}>
      <Text type="secondary" style={{ marginBottom: 8, display: "block" }}>
        Positions ({positions.length} total)
      </Text>
      <div style={{ display: "inline-block" }}>
        {/* Header row */}
        <div style={{ display: "flex", marginBottom: 2 }}>
          <div style={{ width: 24, textAlign: "center", fontWeight: "bold", fontSize: 11, color: "#999" }}></div>
          {cols.map((c) => (
            <div
              key={c}
              style={{
                width: 32, height: 20, textAlign: "center",
                fontSize: 10, fontWeight: "bold", color: "#999",
              }}
            >
              {c}
            </div>
          ))}
        </div>
        {rows.map((row) => (
          <div key={row} style={{ display: "flex", marginBottom: 2 }}>
            <div style={{
              width: 24, height: 28, display: "flex", alignItems: "center",
              justifyContent: "center", fontWeight: "bold", fontSize: 12, color: "#666",
            }}>
              {row}
            </div>
            {cols.map((col) => {
              const key = `${row}${col}`;
              const pos = posMap[key];
              const occupied = pos?.sample_barcode != null;
              return (
                <Tooltip
                  key={col}
                  title={occupied ? `Sample: ${pos.sample_barcode}` : `Empty: ${key}`}
                >
                  <div style={{
                    width: 30, height: 26, margin: "0 1px",
                    borderRadius: 3, border: "1px solid #d9d9d9",
                    background: occupied ? "#e6f7ff" : "#fafafa",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "default", fontSize: 9,
                    color: occupied ? "#1677ff" : "#ccc",
                    fontWeight: occupied ? "bold" : "normal",
                  }}>
                    {occupied ? "●" : "·"}
                  </div>
                </Tooltip>
              );
            })}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 8 }}>
        <Space size="middle">
          <span><span style={{ color: "#1677ff", fontWeight: "bold" }}>●</span> Occupied</span>
          <span><span style={{ color: "#ccc" }}>·</span> Empty</span>
        </Space>
      </div>
    </div>
  );
}

// ── Boxes Tab ─────────────────────────────────────────────
function BoxesTab() {
  const [items, setItems] = useState<Box[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [locationOptions, setLocationOptions] = useState<StorageLocation[]>([]);
  const [expandedRows, setExpandedRows] = useState<Record<string, Box>>({});
  const [form] = Form.useForm();
  const searchRef = useRef(search);
  const pageRef = useRef(page);

  useEffect(() => { searchRef.current = search; }, [search]);
  useEffect(() => { pageRef.current = page; }, [page]);

  const fetch = useCallback(async (p?: number, s?: string) => {
    const currentPage = p ?? pageRef.current;
    const currentSearch = s ?? searchRef.current;
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page: currentPage, size: 50 };
      if (currentSearch) params.search = currentSearch;
      const res = await storageApi.listBoxes(params);
      const data = res.data as Pageable<Box>;
      setItems(data.results);
      setTotal(data.count);
      setPage(currentPage);
      setSearch(currentSearch);
    } catch {
      message.error("Failed to load boxes");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLocations = useCallback(async () => {
    try {
      const res = await storageApi.listLocations({ size: 200 });
      const data = res.data as Pageable<StorageLocation>;
      setLocationOptions(data.results);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleDelete = async (id: string) => {
    try {
      await storageApi.deleteBox(id);
      message.success("Box deleted");
      fetch();
    } catch {
      message.error("Failed to delete box");
    }
  };

  const openCreate = () => {
    form.resetFields();
    fetchLocations();
    setModalOpen(true);
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      await storageApi.createBox(values);
      message.success("Box created");
      setModalOpen(false);
      form.resetFields();
      fetch(1);
    } catch {
      message.error("Failed to create box");
    } finally {
      setSubmitting(false);
    }
  };

  const handleExpand = async (expanded: boolean, record: Box) => {
    if (expanded && !expandedRows[record.id]) {
      try {
        const res = await storageApi.getBox(record.id);
        const boxData = res.data as Box;
        setExpandedRows((prev) => ({ ...prev, [record.id]: boxData }));
      } catch {
        message.error("Failed to load box details");
      }
    }
  };

  const columns: ColumnsType<Box> = [
    {
      title: "Name", dataIndex: "name", key: "name", width: 200,
      render: (t: string) => <Text strong><InboxOutlined style={{ marginRight: 8, color: "#1677ff" }} />{t}</Text>,
    },
    {
      title: "Barcode", dataIndex: "barcode", key: "barcode", width: 160,
      render: (t: string) => t ? <Text copyable={{ text: t }} code>{t}</Text> : <Text type="secondary">—</Text>,
    },
    {
      title: "Size", dataIndex: "box_size", key: "box_size", width: 100,
      render: (t: string) => <Tag>{t}</Tag>,
    },
    {
      title: "Location", dataIndex: "storage_location_name", key: "storage_location_name", width: 180,
      render: (t: string) => t || <Text type="secondary">Unassigned</Text>,
    },
    {
      title: "Occupied", dataIndex: "occupied_count", key: "occupied_count", width: 100,
      render: (n: number, record: Box) => {
        const maxSlots = record.box_size === "9x9" ? 81 : 100;
        const pct = maxSlots > 0 ? Math.round((n / maxSlots) * 100) : 0;
        return (
          <Space>
            <Text>{n}/{maxSlots}</Text>
            <Tag color={pct > 80 ? "red" : pct > 50 ? "orange" : "green"}>{pct}%</Tag>
          </Space>
        );
      },
    },
    {
      title: "Actions", key: "actions", width: 80,
      render: (_: unknown, record: Box) => (
        <Popconfirm
          title="Delete box?"
          description={`Delete ${record.name}?`}
          onConfirm={() => handleDelete(record.id)}
          okText="Delete"
          okButtonProps={{ danger: true }}
        >
          <Button icon={<DeleteOutlined />} size="small" type="text" danger />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Space>
          <Input.Search
            placeholder="Search boxes..."
            prefix={<SearchOutlined />}
            style={{ width: 280 }}
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={() => fetch(1, search)}
          />
          <Button icon={<ReloadOutlined />} onClick={() => fetch()}>Refresh</Button>
        </Space>
        <Space>
          <Text type="secondary">{total} total</Text>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add Box</Button>
        </Space>
      </div>

      <Table<Box>
        columns={columns}
        dataSource={items}
        rowKey="id"
        loading={loading}
        expandable={{
          expandedRowRender: (record: Box) => {
            const detail = expandedRows[record.id];
            if (!detail) return <Text type="secondary">Loading positions...</Text>;
            return <PositionsGrid positions={detail.positions || []} />;
          },
          onExpand: handleExpand,
        }}
        pagination={{
          current: page,
          pageSize: 50,
          total,
          onChange: (p) => fetch(p),
          showTotal: (t) => `Total ${t} boxes`,
        }}
        scroll={{ x: 800 }}
      />

      <Modal
        title="Add Box"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: "Name is required" }]}>
            <Input placeholder="e.g., Box 001" />
          </Form.Item>
          <Form.Item name="barcode" label="Barcode">
            <Input placeholder="Scan or enter barcode" />
          </Form.Item>
          <Form.Item name="box_size" label="Box Size" rules={[{ required: true }]}>
            <Select placeholder="Select box size">
              <Option value="9x9">9x9 (81 positions)</Option>
              <Option value="10x10">10x10 (100 positions)</Option>
            </Select>
          </Form.Item>
          <Form.Item name="storage_location" label="Storage Location">
            <Select placeholder="Select location (optional)" allowClear showSearch optionFilterProp="label">
              {locationOptions.map((loc) => (
                <Option key={loc.id} value={loc.id} label={loc.name}>
                  {loc.name} <Tag color={LOCATION_TYPE_COLORS[loc.location_type]} style={{ marginLeft: 8, fontSize: 10 }}>{loc.location_type?.replace(/_/g, " ")}</Tag>
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="Optional description" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────
export default function Storage() {
  return (
    <DashboardLayout header="Storage">
      <Card>
        <Tabs
          defaultActiveKey="locations"
          items={[
            {
              key: "locations",
              label: <span><EnvironmentOutlined /> Storage Locations</span>,
              children: <StorageLocationsTab />,
            },
            {
              key: "boxes",
              label: <span><InboxOutlined /> Boxes</span>,
              children: <BoxesTab />,
            },
          ]}
        />
      </Card>
    </DashboardLayout>
  );
}
