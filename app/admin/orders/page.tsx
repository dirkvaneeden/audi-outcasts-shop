import Link from 'next/link';
import { listAdminOrders, orderStatusCounts } from '@/lib/admin-orders';
import { ADMIN_TABS, type OrderStatus } from '@/lib/order-status';
import { AdminOrdersTable } from '@/components/AdminOrdersTable';
import { SupplierListButton } from '@/components/SupplierListButton';
import { listSuppliers } from '@/lib/suppliers';

export const dynamic = 'force-dynamic';

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: raw } = await searchParams;
  const tab = (ADMIN_TABS.some((t) => t.key === raw) ? raw : 'awaiting_payment') as OrderStatus | 'all';

  const [{ orders, error }, counts, suppliers] = await Promise.all([listAdminOrders(tab), orderStatusCounts(), listSuppliers()]);
  const tabLabel = ADMIN_TABS.find((t) => t.key === tab)!.label;

  return (
    <>
      <div className="page-header">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/" className="breadcrumbs__link">Store</Link>
        </nav>
        <h1 className="page-header__title">Manage Orders</h1>
        <p className="page-header__subtitle">
          {counts.awaiting_payment ?? 0} unpaid · {counts.paid ?? 0} paid · {counts.ordered ?? 0} ordered
        </p>
      </div>

      <div className="page-body">
        {error && <div className="message-strip message-strip--error" role="alert">Orders could not be loaded: {error}</div>}

        <section className="panel">
          <nav className="tabs" aria-label="Order status">
            {ADMIN_TABS.map((t) => (
              <Link key={t.key} href={`/admin/orders?status=${t.key}`}
                className={`tabs__tab${t.key === tab ? ' tabs__tab--active' : ''}`}
                aria-current={t.key === tab ? 'page' : undefined}>
                <span className="tabs__count">{counts[t.key] ?? 0}</span>
                <span className="tabs__label">{t.label}</span>
              </Link>
            ))}
          </nav>

          <div className="toolbar toolbar--wrap">
            <h2 className="toolbar__title">{tabLabel} ({orders.length})</h2>
            <span className="toolbar__spacer" />
            <SupplierListButton suppliers={suppliers.map((s) => ({ id: s.id, name: s.name, email: s.email }))} />
          </div>

          {orders.length === 0 ? (
            <div className="no-data">
              <p>{tab === 'all' ? 'No orders yet.' : `No ${tabLabel.toLowerCase()} orders.`}</p>
            </div>
          ) : (
            <AdminOrdersTable orders={orders} tab={tab} />
          )}
        </section>
      </div>
    </>
  );
}
