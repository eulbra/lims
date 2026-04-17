import type { ReactNode } from "react";
import { Layout } from "antd";
const { Content, Footer } = Layout;

interface Props {
  children: ReactNode;
}

/** Centered gradient background layout for login / password-reset pages. */
export default function AuthLayout({ children }: Props) {
  return (
    <Layout style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
    }}>
      <Content style={{
        display: "flex", justifyContent: "center", alignItems: "center",
        padding: "24px 16px",
      }}>
        <div style={{ maxWidth: 420, width: "100%" }}>
          {children}
        </div>
      </Content>
      <Footer style={{
        textAlign: "center", background: "transparent",
        color: "rgba(255,255,255,0.6)",
      }}>
        NGS LIMS &copy; {new Date().getFullYear()} — Laboratory Information Management System
      </Footer>
    </Layout>
  );
}
