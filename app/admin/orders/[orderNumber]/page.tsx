import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LineOptions } from '@/components/LineOptions';
import { Price } from '@/components/Price';
import { getAdminOrder } from '@/lib/admin-orders';
import { formatDateTime, formatMoney } from '@/lib/format';
import { ORDER_STATUS_LABEL } from '@/lib/order-status';
import { OrderStatusActions } from '@/components/OrderStatusActions';
import { hasInvoice } from '@/lib/invoice';
import { PaymentReminderButton } from '@/components/PaymentReminderButton';

export const dynamic = 'force-dynamic';

export default async function AdminOrderPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const result = await getAdminOrder(orderNumber);
  if (!result) notFound();
  const { order, lines, log } = result;
  const m = order.member;

  const milestones = [
    { label: 'Placed', at: order.created_at },
    { label: 'Paid', at: order.paid_at },
    { label: 'Ordered', at: order.ordered_at },
    { label: 'Delivered', at: order.delivered_at },
  ];

  return (
    <>
      <div className="page-header">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href={`/admin/orders?status=${order.status}`} className="breadcrumbs__link">Manage Orders</Link>
        </nav>
        <h1 className="page-header__title">Order {order.order_number}</h1>
        <p className="page-header__subtitle">
          <span className={`status status--${order.status}`}>{ORDER_STATUS_LABEL[order.status]}</span>
          {' '}· {formatMoney(order.total)} · placed {formatDateTime(order.created_at)}
        </p>
      </div>

      <div className="page-body">
        {order.status === 'rejected' && (
          <div className="message-strip message-strip--error">
            Rejected{order.rejected_at ? ` on ${formatDateTime(order.rejected_at)}` : ''}.
            {order.status_note ? ` Reason: ${order.status_note}` : ''}
          </div>
        )}

        <div className="cart">
          <div className="stack">
            <section className="panel" aria-labelledby="order-items">
              <div className="toolbar"><h2 id="order-items" className="toolbar__title">Items ({order.item_count})</h2></div>
              <ul className="cart__lines">
                {lines.map((l) => (
                  <li key={l.line_no} className="cart-line">
                    <div className="cart-line__image">
                      {l.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={l.image_url} alt={l.name} />
                      ) : (
                        <span className="product__noimage">No image</span>
                      )}
                    </div>
                    <div className="cart-line__info">
                      <h3 className="cart-line__name">{l.name}</h3>
                    <LineOptions size={l.size} colour={l.colour} note={l.note} />
                      <p className="cart-line__unit">{l.quantity} × <Price price={l.unit_price} regular={l.regular_price} discount={l.discount_percent} /></p>
                    </div>
                    <p className="cart-line__total">{formatMoney(l.line_total)}</p>
                  </li>
                ))}
              </ul>
              <div className="order-total"><span>Total</span><strong>{formatMoney(order.total)}</strong></div>
            </section>

            <section className="panel form-group" aria-labelledby="history">
              <h2 id="history" className="form-group__title">History</h2>
              <ol className="timeline">
                <li><strong>Order placed</strong><span className="hint">{formatDateTime(order.created_at)}</span></li>
                {log.map((e, i) => (
                  <li key={i}>
                    <strong>{e.from_status ? `${ORDER_STATUS_LABEL[e.from_status]} → ` : ''}{ORDER_STATUS_LABEL[e.to_status]}</strong>
                    <span className="hint">{formatDateTime(e.changed_at)}{e.changer ? ` by ${e.changer.name}` : ''}</span>
                    {e.note && <span className="timeline__note">{e.note}</span>}
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <aside className="stack">
            <section className="panel cart__summary" aria-labelledby="status-title">
              <h2 id="status-title" className="cart__summary-title">Status</h2>
              <ol className="milestones">
                {milestones.map((ms) => (
                  <li key={ms.label} className={ms.at ? 'is-done' : undefined}>
                    <span>{ms.label}</span>
                    <span className="hint">{ms.at ? formatDateTime(ms.at) : '–'}</span>
                  </li>
                ))}
              </ol>
              <OrderStatusActions orderId={order.id} status={order.status} />
              {order.status === 'awaiting_payment' && <PaymentReminderButton orderId={order.id} />}
            </section>

            <section className="panel cart__summary" aria-labelledby="member-title">
              <h2 id="member-title" className="cart__summary-title">Member</h2>
              <dl className="bank-list">
                <div><dt>Name</dt><dd>{m.name}</dd></div>
                <div><dt>Member no.</dt><dd>{m.member_number}</dd></div>
                <div><dt>Email</dt><dd><a className="link" href={`mailto:${m.email}`}>{m.email}</a></dd></div>
                {m.phone && <div><dt>Phone</dt><dd><a className="link" href={`tel:${m.phone.replace(/[^\d+]/g, '')}`}>{m.phone}</a></dd></div>}
              </dl>
            </section>

            <section className="panel cart__summary" aria-labelledby="payment-title">
              <h2 id="payment-title" className="cart__summary-title">Payment</h2>
              {hasInvoice(order.status) && (
                <Link href={`/admin/orders/${order.order_number}/invoice`} className="btn">View Invoice</Link>
              )}
              <dl className="bank-list">
                <div><dt>Reference</dt><dd><strong>{order.order_number}</strong></dd></div>
                <div><dt>Amount</dt><dd>{formatMoney(order.total)}</dd></div>
                <div><dt>Into account</dt><dd>{order.bank_details.bank_name} {order.bank_details.account_number}</dd></div>
                <div><dt>Order email</dt><dd>{order.email_sent_at ? `Sent ${formatDateTime(order.email_sent_at)}` : 'Not sent'}</dd></div>
                <div><dt>Reminders</dt><dd>{order.reminder_count > 0
                  ? `${order.reminder_count} sent${order.last_reminder_at ? `, last ${formatDateTime(order.last_reminder_at)}` : ''}`
                  : 'None'}</dd></div>
              </dl>
            </section>
          </aside>
        </div>
      </div>
    </>
  );
}
