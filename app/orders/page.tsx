import Link from 'next/link';
import { requireMember } from '@/lib/auth';
import { listOrders } from '@/lib/orders';
import { formatDateTime, formatMoney, ORDER_STATUS_LABEL } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const member = await requireMember();
  const { orders, error } = await listOrders(member.id);

  return (
    <>
      <div className="page-header">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/" className="breadcrumbs__link">Store</Link>
        </nav>
        <h1 className="page-header__title">My Orders</h1>
      </div>

      <div className="page-body">
        {error && <div className="message-strip message-strip--error" role="alert">Orders could not be loaded: {error}</div>}

        <section className="panel">
          <div className="toolbar"><h2 className="toolbar__title">Orders ({orders.length})</h2></div>
          {orders.length === 0 ? (
            <div className="no-data">
              <p>You haven’t placed any orders yet.</p>
              <Link href="/" className="btn btn--emphasized">Browse the store</Link>
            </div>
          ) : (
            <table className="rtable rtable--orders">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Placed</th>
                  <th className="num">Items</th>
                  <th className="num">Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className="rtable__name"><Link href={`/orders/${o.order_number}`} className="link">{o.order_number}</Link></td>
                    <td data-label="Placed">{formatDateTime(o.created_at)}</td>
                    <td className="num" data-label="Items">{o.item_count}</td>
                    <td className="num" data-label="Total">{formatMoney(o.total)}</td>
                    <td data-label="Status"><span className={`status status--${o.status}`}>{ORDER_STATUS_LABEL[o.status]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}
