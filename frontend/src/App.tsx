import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider, theme } from "antd";
import { useEffect } from "react";
import { useAuthStore } from "./store/auth";
import AppRouter from "./pages/AppRouter";
import enUS from "antd/locale/en_US";
import zhCN from "antd/locale/zh_CN";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 5 * 60 * 1000 },
  },
});

// Locale map for Ant Design
const LOCALES: Record<string, typeof enUS> = {
  en: enUS,
  zh: zhCN,
};

export default function App() {
  const { initialize, user } = useAuthStore();
  useEffect(() => { initialize(); }, [initialize]);

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: "#0066ff",
          borderRadius: 6,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        },
      }}
      locale={user ? LOCALES[user.locale] || LOCALES.en : LOCALES.en}
    >
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </QueryClientProvider>
    </ConfigProvider>
  );
}
