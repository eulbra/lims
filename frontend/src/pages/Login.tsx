import { useState } from "react";
import { Card, Form, Input, Button, message, Typography, Alert } from "antd";
import { useNavigate } from "react-router-dom";
import { UserOutlined, LockOutlined, LoadingOutlined } from "@ant-design/icons";
import { useAuthStore } from "../store/auth";

const { Title, Text } = Typography;

interface LoginValues {
  username: string;
  password: string;
}

export default function Login() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const [form] = Form.useForm<LoginValues>();
  const [error, setError] = useState<string | null>(null);

  const onFinish = async (values: LoginValues) => {
    setError(null);
    try {
      await login(values.username, values.password);
      message.success("登录成功");
      navigate("/", { replace: true });
    } catch {
      setError("用户名或密码错误，请重试");
    }
  };

  return (
    <Card style={{ borderRadius: 12 }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <Title level={3} style={{ color: "#fff", marginBottom: 4 }}>
          NGS LIMS
        </Title>
        <Text style={{ color: "rgba(255,255,255,0.7)" }}>
          Laboratory Information Management System
        </Text>
      </div>

      {/* Login form */}
      <Form<LoginValues>
        form={form}
        layout="vertical"
        onFinish={onFinish}
        size="large"
        disabled={isLoading}
      >
        <Form.Item name="username" rules={[{ required: true, message: "Enter your username" }]}>
          <Input
            prefix={<UserOutlined style={{ color: "#999" }} />}
            placeholder="Username"
            autoComplete="username"
          />
        </Form.Item>

        <Form.Item name="password" rules={[{ required: true, message: "Enter your password" }]}>
          <Input.Password
            prefix={<LockOutlined style={{ color: "#999" }} />}
            placeholder="Password"
            autoComplete="current-password"
          />
        </Form.Item>

        {error && (
          <Alert type="error" message={error} closable style={{ marginBottom: 16 }} />
        )}

        <Form.Item style={{ marginBottom: 0 }}>
          <Button type="primary" htmlType="submit" block loading={isLoading}>
            {isLoading ? <LoadingOutlined /> : "Sign In"}
          </Button>
        </Form.Item>
      </Form>

      {/* Footer text */}
      <div style={{ textAlign: "center", marginTop: 16 }}>
        <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
          For support, contact your lab administrator
        </Text>
      </div>
    </Card>
  );
}
