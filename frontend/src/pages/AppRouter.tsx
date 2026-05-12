import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Spin } from "antd";
import AuthLayout from "../components/AuthLayout";
import { useAuthStore } from "../store/auth";

// Lazy-loaded pages — all real implementations
const Login           = lazy(() => import("./Login"));
const Dashboard       = lazy(() => import("./Dashboard"));
const Samples         = lazy(() => import("./Samples"));
const Orders          = lazy(() => import("./Orders"));
const Runs            = lazy(() => import("./Runs"));
const Reports         = lazy(() => import("./Reports"));
const Instruments     = lazy(() => import("./Instruments"));
const Reagents        = lazy(() => import("./Reagents"));
const QC              = lazy(() => import("./QC"));
const Documents       = lazy(() => import("./Documents"));
const Training        = lazy(() => import("./Training"));
const Bioinformatics  = lazy(() => import("./Bioinformatics"));
const Quality         = lazy(() => import("./Quality"));
const AuditLog        = lazy(() => import("./AuditLog"));
const Notifications   = lazy(() => import("./Notifications"));
const Protocols       = lazy(() => import("./Protocols"));
const Storage         = lazy(() => import("./Storage"));
const Barcodes        = lazy(() => import("./Barcodes"));
const Library         = lazy(() => import("./Library"));
const Common          = lazy(() => import("./Common"));

// Loading fallback
const PageLoading = () => (
  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
    <Spin size="large" tip="Loading..." />
  </div>
);

// Auth guard
const Protected = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = !!useAuthStore(s => s.accessToken);
  const initialized = useAuthStore(s => s.initialized);
  if (!initialized) return <PageLoading />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Suspense fallback={<PageLoading />}>{children}</Suspense>;
};

export default function AppRouter() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<AuthLayout><Login /></AuthLayout>} />

        {/* Protected — fully implemented */}
        <Route path="/"       element={<Protected><Dashboard /></Protected>} />
        <Route path="/samples" element={<Protected><Samples /></Protected>} />
        <Route path="/orders"  element={<Protected><Orders /></Protected>} />
        <Route path="/runs"    element={<Protected><Runs /></Protected>} />
        <Route path="/reports" element={<Protected><Reports /></Protected>} />
        <Route path="/instruments" element={<Protected><Instruments /></Protected>} />
        <Route path="/reagents"    element={<Protected><Reagents /></Protected>} />

        {/* QC — implemented */}
        <Route path="/qc"   element={<Protected><QC /></Protected>} />

        {/* Documents, Training, Bioinformatics — now implemented */}
        <Route path="/documents"      element={<Protected><Documents /></Protected>} />
        <Route path="/training"       element={<Protected><Training /></Protected>} />
        <Route path="/bioinformatics" element={<Protected><Bioinformatics /></Protected>} />

        {/* Quality, Audit, Notifications — now implemented */}
        <Route path="/quality"           element={<Protected><Quality /></Protected>} />
        <Route path="/audit"             element={<Protected><AuditLog /></Protected>} />
        <Route path="/notifications"     element={<Protected><Notifications /></Protected>} />

        <Route path="/protocols"     element={<Protected><Protocols /></Protected>} />

        <Route path="/storage"      element={<Protected><Storage /></Protected>} />
        <Route path="/barcodes"     element={<Protected><Barcodes /></Protected>} />
        <Route path="/library"      element={<Protected><Library /></Protected>} />
        <Route path="/common"       element={<Protected><Common /></Protected>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}