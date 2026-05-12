import { useState, useEffect, useCallback, useRef } from "react";
import {
  Table, Card, Button, Space, Tag, Typography, Input,
  Modal, Form, Select, message, Tabs, Popconfirm,
} from "antd";
import {
  PlusOutlined, ReloadOutlined, SearchOutlined,
  DeleteOutlined, BookOutlined,
  ExperimentOutlined,
} from "@ant-design/icons";
import { libraryApi } from "../api";
import type { IndexFamily, Index, LibraryDesign, Pageable } from "../api/types";
import type { ColumnsType } from "antd/es/table";
import DashboardLayout from "../components/DashboardLayout";

const { Text } = Typography;
const { Option } = Select;

// ── Index Families Tab ────────────────────────────────────
function IndexFamiliesTab() {
  const [items, setItems] = useState<IndexFamily[]>([]);
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
      const res = await libraryApi.listIndexFamilies(params);
      const data = res.data as Pageable<IndexFamily>;
      setItems(data.results);
      setTotal(data.count);
      setPage(currentPage);
      setSearch(currentSearch);
    } catch {
      message.error("Failed to load index families");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleDelete = async (id: string) => {
    try {
      await libraryApi.deleteIndexFamily(id);
      message.success("Index family deleted");
      fetch();
    } catch {
      message.error("Failed to delete index family");
    }
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      await libraryApi.createIndexFamily(values);
      message.success("Index family created");
      setModalOpen(false);
      form.resetFields();
      fetch(1);
    } catch {
      message.error("Failed to create index family");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Expanded row: indices table + Add Index ──────────
  const [expandedFamilyId, setExpandedFamilyId] = useState<string | null>(null);
  const [indexModalOpen, setIndexModalOpen] = useState(false);
  const [indexForm] = Form.useForm();
  const [indexSubmitting, setIndexSubmitting] = useState(false);

  const handleExpand = (expanded: boolean, record: IndexFamily) => {
    setExpandedFamilyId(expanded ? record.id : null);
  };

  const handleAddIndex = async (values: Record<string, unknown>) => {
    if (!expandedFamilyId) return;
    setIndexSubmitting(true);
    try {
      await libraryApi.addIndex(expandedFamilyId, {
        ...values,
        sequence: values.sequence || values.name,
      });
      message.success("Index added");
      setIndexModalOpen(false);
      indexForm.resetFields();
      fetch(page);
    } catch {
      message.error("Failed to add index");
    } finally {
      setIndexSubmitting(false);
    }
  };

  const handleDeleteIndex = async (indexId: string) => {
    try {
      await libraryApi.deleteIndex(indexId);
      message.success("Index deleted");
      fetch(page);
    } catch {
      message.error("Failed to delete index");
    }
  };

  const expandedRowRender = (record: IndexFamily) => {
    const indices: Index[] = record.indices || [];
    if (indices.length === 0) {
      return (
        <div style={{ padding: 16, textAlign: "center" }}>
          <Text type="secondary">No indices defined for this family.</Text>
          <br />
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            style={{ marginTop: 8 }}
            onClick={() => {
              setExpandedFamilyId(record.id);
              indexForm.resetFields();
              setIndexModalOpen(true);
            }}
          >
            Add Index
          </Button>
        </div>
      );
    }

    return (
      <div style={{ padding: 8 }}>
        <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Text strong style={{ fontSize: 13 }}>Indices ({indices.length})</Text>
          <Button
            size="small"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setExpandedFamilyId(record.id);
              indexForm.resetFields();
              setIndexModalOpen(true);
            }}
          >
            Add Index
          </Button>
        </div>
        <Table<Index>
          dataSource={indices}
          rowKey="id"
          pagination={false}
          size="small"
          columns={[
            {
              title: "Name", dataIndex: "name", key: "name", width: 200,
              render: (t: string) => <Text code>{t}</Text>,
            },
            {
              title: "Sequence", dataIndex: "sequence", key: "sequence", width: 300,
              render: (t: string) => <Text copyable style={{ fontFamily: "monospace", fontSize: 12 }}>{t}</Text>,
            },
            {
              title: "Position", dataIndex: "index_position", key: "index_position", width: 100,
              render: (t: string) => <Tag color={t === "i7" ? "blue" : "green"}>{t}</Tag>,
            },
            {
              title: "", key: "actions", width: 60,
              render: (_: unknown, idx: Index) => (
                <Popconfirm
                  title="Delete index?"
                  onConfirm={() => handleDeleteIndex(idx.id)}
                  okText="Delete"
                  okButtonProps={{ danger: true }}
                >
                  <Button icon={<DeleteOutlined />} size="small" type="text" danger />
                </Popconfirm>
              ),
            },
          ]}
        />
      </div>
    );
  };

  const columns: ColumnsType<IndexFamily> = [
    {
      title: "Name", dataIndex: "name", key: "name", width: 220,
      render: (t: string) => <Text strong><ExperimentOutlined style={{ marginRight: 8, color: "#1677ff" }} />{t}</Text>,
    },
    {
      title: "Platform", dataIndex: "platform", key: "platform", width: 140,
      render: (t: string) => <Tag color="cyan">{t}</Tag>,
    },
    {
      title: "Index Type", dataIndex: "index_type", key: "index_type", width: 140,
      render: (t: string) => <Tag>{t}</Tag>,
    },
    {
      title: "Indices", dataIndex: "index_count", key: "index_count", width: 80,
      render: (n: number) => <Tag color={n > 0 ? "blue" : "default"}>{n}</Tag>,
    },
    {
      title: "Active", dataIndex: "is_active", key: "is_active", width: 80,
      render: (v: boolean) => <Tag color={v ? "green" : "red"}>{v ? "Yes" : "No"}</Tag>,
    },
    {
      title: "Actions", key: "actions", width: 80,
      render: (_: unknown, record: IndexFamily) => (
        <Popconfirm
          title="Delete index family?"
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
            placeholder="Search index families..."
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
            Add Index Family
          </Button>
        </Space>
      </div>

      <Table<IndexFamily>
        columns={columns}
        dataSource={items}
        rowKey="id"
        loading={loading}
        expandable={{
          expandedRowRender,
          onExpand: handleExpand,
        }}
        pagination={{
          current: page,
          pageSize: 50,
          total,
          onChange: (p) => fetch(p),
          showTotal: (t) => `Total ${t} families`,
        }}
        scroll={{ x: 700 }}
      />

      {/* Create Index Family Modal */}
      <Modal
        title="Add Index Family"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        width={450}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: "Name is required" }]}>
            <Input placeholder="e.g., Nextera XT v2 Set A" />
          </Form.Item>
          <Form.Item name="platform" label="Platform" rules={[{ required: true }]}>
            <Select placeholder="Select platform">
              <Option value="ILLUMINA">Illumina</Option>
              <Option value="ION_TORRENT">Ion Torrent</Option>
              <Option value="PACBIO">PacBio</Option>
              <Option value="ONT">Oxford Nanopore</Option>
            </Select>
          </Form.Item>
          <Form.Item name="index_type" label="Index Type" rules={[{ required: true }]}>
            <Select placeholder="Select index type">
              <Option value="DUAL">Dual Index (i7 + i5)</Option>
              <Option value="SINGLE">Single Index (i7 only)</Option>
              <Option value="UNIQUE_DUAL">Unique Dual</Option>
              <Option value="COMBINATORIAL_DUAL">Combinatorial Dual</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Add Index Modal */}
      <Modal
        title="Add Index"
        open={indexModalOpen}
        onCancel={() => setIndexModalOpen(false)}
        onOk={() => indexForm.submit()}
        confirmLoading={indexSubmitting}
        width={450}
      >
        <Form form={indexForm} layout="vertical" onFinish={handleAddIndex}>
          <Form.Item name="name" label="Name / Sequence" rules={[{ required: true, message: "Name is required" }]}>
            <Input placeholder="e.g., ATCACG (name = sequence)" />
          </Form.Item>
          <Form.Item name="index_position" label="Index Position" rules={[{ required: true }]}>
            <Select placeholder="Select position">
              <Option value="i7">i7 (Index 1)</Option>
              <Option value="i5">i5 (Index 2)</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

// ── Library Designs Tab ────────────────────────────────────
function LibraryDesignsTab() {
  const [items, setItems] = useState<LibraryDesign[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [indexFamilyOptions, setIndexFamilyOptions] = useState<IndexFamily[]>([]);
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
      const res = await libraryApi.listDesigns(params);
      const data = res.data as Pageable<LibraryDesign>;
      setItems(data.results);
      setTotal(data.count);
      setPage(currentPage);
      setSearch(currentSearch);
    } catch {
      message.error("Failed to load library designs");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchIndexFamilies = useCallback(async () => {
    try {
      const res = await libraryApi.listIndexFamilies({ size: 200 });
      const data = res.data as Pageable<IndexFamily>;
      setIndexFamilyOptions(data.results);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleDelete = async (id: string) => {
    try {
      await libraryApi.deleteDesign(id);
      message.success("Library design deleted");
      fetch();
    } catch {
      message.error("Failed to delete library design");
    }
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      await libraryApi.createDesign(values);
      message.success("Library design created");
      setModalOpen(false);
      form.resetFields();
      fetch(1);
    } catch {
      message.error("Failed to create library design");
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<LibraryDesign> = [
    {
      title: "Design Code", dataIndex: "design_code", key: "design_code", width: 140,
      render: (t: string) => <Text code style={{ fontWeight: "bold" }}>{t}</Text>,
    },
    {
      title: "Name", dataIndex: "name", key: "name", width: 220,
      render: (t: string) => <Text strong><BookOutlined style={{ marginRight: 8, color: "#1677ff" }} />{t}</Text>,
    },
    {
      title: "Index Family", dataIndex: "index_family_name", key: "index_family_name", width: 180,
      render: (t: string) => t ? <Tag color="purple">{t}</Tag> : <Text type="secondary">None</Text>,
    },
    {
      title: "Selection", dataIndex: "selection_type", key: "selection_type", width: 140,
      render: (t: string) => <Tag color="blue">{t}</Tag>,
    },
    {
      title: "Strategy", dataIndex: "strategy_type", key: "strategy_type", width: 140,
      render: (t: string) => <Tag color="green">{t}</Tag>,
    },
    {
      title: "Actions", key: "actions", width: 80,
      render: (_: unknown, record: LibraryDesign) => (
        <Popconfirm
          title="Delete design?"
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
            placeholder="Search designs..."
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
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); fetchIndexFamilies(); setModalOpen(true); }}>
            Add Design
          </Button>
        </Space>
      </div>

      <Table<LibraryDesign>
        columns={columns}
        dataSource={items}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize: 50,
          total,
          onChange: (p) => fetch(p),
          showTotal: (t) => `Total ${t} designs`,
        }}
        scroll={{ x: 800 }}
      />

      <Modal
        title="Add Library Design"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: "Name is required" }]}>
            <Input placeholder="e.g., TruSeq DNA PCR-Free" />
          </Form.Item>
          <Form.Item name="design_code" label="Design Code" rules={[{ required: true }]}>
            <Input placeholder="e.g., TRUSEQ_DNA_PF" />
          </Form.Item>
          <Form.Item name="index_family" label="Index Family">
            <Select placeholder="Select index family (optional)" allowClear showSearch optionFilterProp="label">
              {indexFamilyOptions.map((fam) => (
                <Option key={fam.id} value={fam.id} label={fam.name}>
                  {fam.name} <Tag color="cyan" style={{ fontSize: 10 }}>{fam.platform}</Tag>
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="selection_type" label="Selection Type" rules={[{ required: true }]}>
            <Select placeholder="Select selection type">
              <Option value="PCR">PCR</Option>
              <Option value="HYBRID_CAPTURE">Hybrid Capture</Option>
              <Option value="AMPLICON">Amplicon</Option>
              <Option value="SIZE_SELECTION">Size Selection</Option>
              <Option value="RANDOM">Random</Option>
              <Option value="CDNA">cDNA</Option>
              <Option value="OTHER">Other</Option>
            </Select>
          </Form.Item>
          <Form.Item name="strategy_type" label="Strategy Type" rules={[{ required: true }]}>
            <Select placeholder="Select strategy type">
              <Option value="WGS">WGS</Option>
              <Option value="WES">WES</Option>
              <Option value="TARGETED">Targeted Panel</Option>
              <Option value="RNA_SEQ">RNA-Seq</Option>
              <Option value="CHIP_SEQ">ChIP-Seq</Option>
              <Option value="ATAC_SEQ">ATAC-Seq</Option>
              <Option value="METHYLATION">Methylation</Option>
              <Option value="16S">16S Amplicon</Option>
              <Option value="OTHER">Other</Option>
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
export default function Library() {
  return (
    <DashboardLayout header="Library">
      <Card>
        <Tabs
          defaultActiveKey="index-families"
          items={[
            {
              key: "index-families",
              label: <span><ExperimentOutlined /> Index Families</span>,
              children: <IndexFamiliesTab />,
            },
            {
              key: "library-designs",
              label: <span><BookOutlined /> Library Designs</span>,
              children: <LibraryDesignsTab />,
            },
          ]}
        />
      </Card>
    </DashboardLayout>
  );
}
