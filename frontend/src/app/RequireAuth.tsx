import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loading } from "../components/PageHeader";
import { useAuth } from "./AuthContext";

export function RequireAuth() {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <Loading label="Checking session" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
