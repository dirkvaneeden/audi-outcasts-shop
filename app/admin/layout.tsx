import { requireAdmin } from '@/lib/auth';

/** Every page under /admin is for admins only. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return children;
}
