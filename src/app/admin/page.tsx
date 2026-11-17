import AdminDashboard from "@/components/AdminDashboard";
import AdminLoginForm from "@/components/AdminLoginForm";
import { isAdminAuthenticated } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Technical Support Console — Admin",
  description: "Unified Triage Queue: Technical Issues & Project Reviews",
};

export default async function AdminPage() {
  const authed = await isAdminAuthenticated();
  return authed ? <AdminDashboard /> : <AdminLoginForm />;
}
