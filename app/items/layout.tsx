import { requireAdmin } from '@/lib/auth';

/** Every page under /items is for admins only. */
export default async function ItemsLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return children;
}
