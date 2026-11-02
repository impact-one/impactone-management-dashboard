import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AuthSkeleton } from "../components/PageSkeleton";
import { useAuth } from "./AuthContext";

export function RequireAuth() {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <AuthSkeleton label="Checking session" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
