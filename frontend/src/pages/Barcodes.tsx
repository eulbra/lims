import { useState, useEffect, useCallback, useRef } from "react";
import {
  Table, Card, Button, Space, Tag, Typography, Input,
  Modal, Form, Select, InputNumber, message, Tabs, Popconfirm,
} from "antd";
import {
  PlusOutlined, ReloadOutlined, SearchOutlined,
  DeleteOutlined, PrinterOutlined, BarcodeOutlined,
  ExperimentOutlined,
} from "@ant-design/icons";
import { barcodesApi } from "../api";
import type { BarcodePrinter, BarcodeLabel, Pageable } from "../api/types";
import type { ColumnsType } from "antd/es/table";
import DashboardLayout from "../components/DashboardLayout";
import dayjs from "dayjs";

const { Text } = Typography;
const { Option } = Select;

// ── Printers Tab ──────────────────────────────────────────
function PrintersTab() {
  const [items, setItems] = useState<BarcodePrinter[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
      const res = await barcodesApi.listPrinters(params);
      const data = res.data as Pageable<BarcodePrinter>;
      setItems(data.results);
      setTotal(data.count);
      setPage(currentPage);
      setSearch(currentSearch);
    } catch {
      message.error("Failed to load printers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleDelete = async (id: string) => {
    try {
      await barcodesApi.deletePrinter(id);
      message.success("Printer deleted");
      fetch();
    } catch {
      message.error("Failed to delete printer");
    }
  };

  const handleTestPrint = async (record: BarcodePrinter) => {
    try {
      await barcodesApi.testPrint(record.id);
      message.success(`Test print sent to ${record.name}`);
    } catch {
      message.error("Test print failed");
    }
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      await barcodesApi.createPrinter(values);
      message.success("Printer created");
      setModalOpen(false);
      form.resetFields();
      fetch(1);
    } catch {
      message.error("Failed to create printer");
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<BarcodePrinter> = [
    {
      title: "Name", dataIndex: "name", key: "name", width: 200,
      render: (t: string) => <Text strong><PrinterOutlined style={{ marginRight: 8, color: "#1677ff" }} />{t}</Text>,
    },
    {
      title: "Type", dataIndex: "printer_type", key: "printer_type", width: 130,
      render: (t: string) => <Tag color="blue">{t}</Tag>,
    },
    {
      title: "IP Address", dataIndex: "ip_address", key: "ip_address", width: 150,
      render: (t: string) => t ? <Text code>{t}</Text> : <Text type="secondary">—</Text>,
    },
    {
      title: "Port", dataIndex: "port", key: "port", width: 80,
    },
    {
      title: "Active", dataIndex: "is_active", key: "is_active", width: 80,
      render: (v: boolean) => <Tag color={v ? "green" : "red"}>{v ? "Yes" : "No"}</Tag>,
    },
    {
      title: "Actions", key: "actions", width: 200,
      render: (_: unknown, record: BarcodePrinter) => (
        <Space size="small">
          <Button
            size="small"
            icon={<ExperimentOutlined />}
            onClick={() => handleTestPrint(record)}
          >
            Test Print
          </Button>
          <Popconfirm
            title="Delete printer?"
            description={`Delete ${record.name}?`}
            onConfirm={() => handleDelete(record.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Button icon={<DeleteOutlined />} size="small" type="text" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Space>
          <Input.Search
            placeholder="Search printers..."
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
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setModalOpen(true); }}>
            Add Printer
          </Button>
        </Space>
      </div>

      <Table<BarcodePrinter>
        columns={columns}
        dataSource={items}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize: 50,
          total,
          onChange: (p) => fetch(p),
          showTotal: (t) => `Total ${t} printers`,
        }}
        scroll={{ x: 900 }}
      />

      <Modal
        title="Add Printer"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        width={520}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: "Name is required" }]}>
            <Input placeholder="e.g., Zebra Lab Printer 1" />
          </Form.Item>
          <Form.Item name="printer_type" label="Printer Type" rules={[{ required: true }]}>
            <Select placeholder="Select printer type">
              <Option value="ZEBRA">Zebra</Option>
              <Option value="DYMO">DYMO</Option>
              <Option value="BROTHER">Brother</Option>
              <Option value="GENERIC">Generic</Option>
            </Select>
          </Form.Item>
          <Form.Item name="ip_address" label="IP Address">
            <Input placeholder="192.168.1.100" />
          </Form.Item>
          <Form.Item name="port" label="Port">
            <InputNumber placeholder="9100" style={{ width: "100%" }} min={1} max={65535} />
          </Form.Item>
          <Form.Item name="label_width_mm" label="Label Width (mm)">
            <InputNumber placeholder="50" style={{ width: "100%" }} min={1} max={300} />
          </Form.Item>
          <Form.Item name="label_height_mm" label="Label Height (mm)">
            <InputNumber placeholder="25" style={{ width: "100%" }} min={1} max={300} />
          </Form.Item>
          <Form.Item name="dpi" label="DPI">
            <InputNumber placeholder="203" style={{ width: "100%" }} min={72} max={600} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ── Labels Tab ─────────────────────────────────────────────
function LabelsTab() {
  const [items, setItems] = useState<BarcodeLabel[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [printerOptions, setPrinterOptions] = useState<BarcodePrinter[]>([]);
  const [createForm] = Form.useForm();
  const [batchForm] = Form.useForm();
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
      const res = await barcodesApi.listLabels(params);
      const data = res.data as Pageable<BarcodeLabel>;
      setItems(data.results);
      setTotal(data.count);
      setPage(currentPage);
      setSearch(currentSearch);
    } catch {
      message.error("Failed to load labels");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPrinters = useCallback(async () => {
    try {
      const res = await barcodesApi.listPrinters({ size: 200 });
      const data = res.data as Pageable<BarcodePrinter>;
      setPrinterOptions(data.results);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleDelete = async (id: string) => {
    try {
      await barcodesApi.deleteLabel(id);
      message.success("Label deleted");
      fetch();
    } catch {
      message.error("Failed to delete label");
    }
  };

  const handleCreateLabel = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      await barcodesApi.createLabel(values);
      message.success("Label created");
      setCreateModalOpen(false);
      createForm.resetFields();
      fetch(1);
    } catch {
      message.error("Failed to create label");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBatchPrint = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      await barcodesApi.batchPrint(values);
      message.success(`Batch print of ${values.count} labels initiated`);
      setBatchModalOpen(false);
      batchForm.resetFields();
      fetch(1);
    } catch {
      message.error("Batch print failed");
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateLabel = () => {
    createForm.resetFields();
    fetchPrinters();
    setCreateModalOpen(true);
  };

  const openBatchPrint = () => {
    batchForm.resetFields();
    fetchPrinters();
    setBatchModalOpen(true);
  };

  const columns: ColumnsType<BarcodeLabel> = [
    {
      title: "Barcode", dataIndex: "barcode", key: "barcode", width: 220,
      render: (t: string) => (
        <Space>
          <BarcodeOutlined style={{ color: "#1677ff" }} />
          <Text copyable={{ text: t }} code>{t}</Text>
        </Space>
      ),
    },
    {
      title: "Type", dataIndex: "label_type", key: "label_type", width: 120,
      render: (t: string) => <Tag color="purple">{t}</Tag>,
    },
    {
      title: "Printed By", dataIndex: "printed_by_name", key: "printed_by_name", width: 140,
      render: (t: string) => t || <Text type="secondary">Not printed</Text>,
    },
    {
      title: "Printed At", dataIndex: "printed_at", key: "printed_at", width: 170,
      render: (t: string) => t ? dayjs(t).format("YYYY-MM-DD HH:mm:ss") : <Text type="secondary">—</Text>,
    },
    {
      title: "Copies", dataIndex: "copies", key: "copies", width: 80,
      render: (n: number) => <Tag>{n}</Tag>,
    },
    {
      title: "Actions", key: "actions", width: 80,
      render: (_: unknown, record: BarcodeLabel) => (
        <Popconfirm
          title="Delete label?"
          description={`Delete barcode ${record.barcode}?`}
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
            placeholder="Search labels..."
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
          <Button icon={<ExperimentOutlined />} onClick={openBatchPrint}>Batch Print</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateLabel}>Create Label</Button>
        </Space>
      </div>

      <Table<BarcodeLabel>
        columns={columns}
        dataSource={items}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize: 50,
          total,
          onChange: (p) => fetch(p),
          showTotal: (t) => `Total ${t} labels`,
        }}
        scroll={{ x: 800 }}
      />

      {/* Create Label Modal */}
      <Modal
        title="Create Label"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onOk={() => createForm.submit()}
        confirmLoading={submitting}
        width={400}
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreateLabel}>
          <Form.Item name="label_type" label="Label Type" rules={[{ required: true }]}>
            <Select placeholder="Select label type">
              <Option value="SAMPLE">Sample</Option>
              <Option value="BOX">Box</Option>
              <Option value="LOCATION">Location</Option>
              <Option value="REAGENT">Reagent</Option>
              <Option value="GENERIC">Generic</Option>
            </Select>
          </Form.Item>
          <Form.Item name="printer" label="Printer">
            <Select placeholder="Select printer (optional)" allowClear>
              {printerOptions.map((printer) => (
                <Option key={printer.id} value={printer.id}>{printer.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="copies" label="Copies" initialValue={1}>
            <InputNumber min={1} max={100} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Batch Print Modal */}
      <Modal
        title="Batch Print Labels"
        open={batchModalOpen}
        onCancel={() => setBatchModalOpen(false)}
        onOk={() => batchForm.submit()}
        confirmLoading={submitting}
        width={400}
      >
        <Form form={batchForm} layout="vertical" onFinish={handleBatchPrint}>
          <Form.Item name="count" label="Number of Labels" rules={[{ required: true, message: "Count is required" }]}>
            <InputNumber min={1} max={1000} style={{ width: "100%" }} placeholder="e.g., 50" />
          </Form.Item>
          <Form.Item name="label_type" label="Label Type" rules={[{ required: true }]}>
            <Select placeholder="Select label type">
              <Option value="SAMPLE">Sample</Option>
              <Option value="BOX">Box</Option>
              <Option value="LOCATION">Location</Option>
              <Option value="REAGENT">Reagent</Option>
              <Option value="GENERIC">Generic</Option>
            </Select>
          </Form.Item>
          <Form.Item name="printer" label="Printer">
            <Select placeholder="Select printer (optional)" allowClear>
              {printerOptions.map((printer) => (
                <Option key={printer.id} value={printer.id}>{printer.name}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────
export default function Barcodes() {
  return (
    <DashboardLayout header="Barcodes & Labels">
      <Card>
        <Tabs
          defaultActiveKey="printers"
          items={[
            {
              key: "printers",
              label: <span><PrinterOutlined /> Printers</span>,
              children: <PrintersTab />,
            },
            {
              key: "labels",
              label: <span><BarcodeOutlined /> Labels</span>,
              children: <LabelsTab />,
            },
          ]}
        />
      </Card>
    </DashboardLayout>
  );
}
