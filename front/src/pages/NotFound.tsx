import { Navigate } from "react-router-dom";

/** Catch-all: always redirect to login or app */
export default function NotFound() {
  return <Navigate to="/login" replace />;
}
