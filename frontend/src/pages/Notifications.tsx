import { useState, useEffect } from "react";
import {
  Table, Card, Button, Space, Tag, Typography, Badge, Popconfirm, message,
} from "antd";
import {
  ReloadOutlined, BellOutlined, CheckOutlined,
  CheckSquareOutlined as CheckDoubleOutlined, InboxOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import api from "../api/client";
import DashboardLayout from "../components/DashboardLayout";

const { Title, Text } = Typography;

// ── Types ──────────────────────────────────────────────────
interface Notification {
  id: string;
  user: string;
  notification_type: string;
  title: string;
  message: string;
  link: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

// ── Main Page ──────────────────────────────────────────────
export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetch = async (p = page) => {
    setLoading(true);
    try {
      const res = await api.get("/notifications/notifications/", { params: { page: p, page_size: 20, ordering: "-created_at" } });
      setNotifications(res.data.results || []);
      setTotal(res.data.count || 0);
      setPage(p);
    } catch {
      // endpoint may not return if not seeded
    } finally {
      setLoading(false);
    }
  };

  const fetchUnread = async () => {
    try {
      const res = await api.get("/notifications/notifications/unread_count/");
      setUnreadCount(res.data.count || 0);
    } catch {
      // ignore
    }
  };

  useEffect(() => { fetch(); fetchUnread(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMarkRead = async (id: string) => {
    try {
      await api.post(`/notifications/notifications/${id}/mark_read/`);
      fetch(page);
      fetchUnread();
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post("/notifications/notifications/mark_all_read/");
      message.success("全部已标记为已读");
      fetch(page);
      fetchUnread();
    } catch {
      // ignore
    }
  };

  return (
    <DashboardLayout header="通知中心">
      <Card>
        <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
          <div>
            <Title level={5}>
              <Badge count={unreadCount} size="small" offset={[8, 0]}>
                通知中心
              </Badge>
            </Title>
            <Text type="secondary">系统通知和提醒</Text>
          </div>
          <Space>
            <Button size="small" icon={<ReloadOutlined />} onClick={() => { fetch(1); fetchUnread(); }}>刷新</Button>
            {unreadCount > 0 && (
              <Popconfirm title="标记所有为已读？" onConfirm={handleMarkAllRead}>
                <Button size="small" icon={<CheckDoubleOutlined />}>全部已读</Button>
              </Popconfirm>
            )}
          </Space>
        </div>

        {notifications.length === 0 && !loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "#999" }}>
            <InboxOutlined style={{ fontSize: 56, marginBottom: 12 }} />
            <div style={{ fontSize: 16 }}>暂无通知</div>
            <Text type="secondary">当有重要事件时，这里会收到通知</Text>
          </div>
        ) : (
          <Table<Notification>
            rowKey="id"
            dataSource={notifications}
            loading={loading}
            columns={[
              {
                title: "状态",
                dataIndex: "is_read",
                width: 60,
                render: (v: boolean) => v
                  ? <CheckOutlined style={{ color: "#52c41a" }} />
                  : <BellOutlined style={{ color: "#fa8c16" }} />,
              },
              {
                title: "标题",
                dataIndex: "title",
                render: (v: string, r: Notification) => (
                  r.is_read ? <span>{v}</span> : <strong>{v}</strong>
                ),
              },
              {
                title: "内容",
                dataIndex: "message",
                ellipsis: { showTitle: true },
              },
              {
                title: "类型",
                dataIndex: "notification_type",
                width: 120,
                render: (v: string) => <Tag color="blue">{v}</Tag>,
              },
              {
                title: "时间",
                dataIndex: "created_at",
                width: 160,
                render: (v: string) => dayjs(v).format("YYYY-MM-DD HH:mm"),
              },
              {
                title: "操作",
                key: "actions",
                width: 100,
                render: (_: unknown, r: Notification) => (
                  !r.is_read ? (
                    <Button size="small" icon={<CheckOutlined />} onClick={() => handleMarkRead(r.id)}>
                      已读
                    </Button>
                  ) : (
                    <Tag color="green">已读</Tag>
                  )
                ),
              },
            ]}
            pagination={{
              current: page, pageSize: 20, total, onChange: (p) => fetch(p),
              showSizeChanger: false, showTotal: (t) => `共 ${t} 条`,
            }}
            scroll={{ x: 900 }}
          />
        )}
      </Card>
    </DashboardLayout>
  );
}
