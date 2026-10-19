import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LineOptions } from '@/components/LineOptions';
import { Price } from '@/components/Price';
import { requireMember } from '@/lib/auth';
import { getOrder } from '@/lib/orders';
import { groupDigits } from '@/lib/banks';
import { formatDateTime, formatMoney, ORDER_STATUS_LABEL } from '@/lib/format';
import { ResendEmailButton } from '@/components/ResendEmailButton';

export const dynamic = 'force-dynamic';

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ placed?: string }>;
}) {
  const member = await requireMember();
  const { orderNumber } = await params;
  const { placed } = await searchParams;

  const result = await getOrder(orderNumber, member.id);
  if (!result) notFound();
  const { order, lines } = result;
  const bank = order.bank_details;

  return (
    <>
      <div className="page-header">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/orders" className="breadcrumbs__link">My Orders</Link>
        </nav>
        <h1 className="page-header__title">Order {order.order_number}</h1>
        <p className="page-header__subtitle">
          Placed {formatDateTime(order.created_at)} · <span className={`status status--${order.status}`}>{ORDER_STATUS_LABEL[order.status]}</span>
        </p>
      </div>

      <div className="page-body">
        {placed && order.email_sent_at && (
          <div className="message-strip message-strip--success" role="status">
            Order placed. We emailed the payment details to {member.email}.
          </div>
        )}
        {order.email_error && !order.email_sent_at && (
          <div className="message-strip message-strip--warning" role="alert">
            Your order is placed, but the confirmation email could not be sent. The payment details are below.
          </div>
        )}

        <div className="cart">
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
            <div className="order-total">
              <span>Total</span>
              <strong>{formatMoney(order.total)}</strong>
            </div>
          </section>

          <aside className="panel cart__summary" aria-labelledby="pay-eft">
            <h2 id="pay-eft" className="cart__summary-title">Pay by EFT</h2>
            <dl className="bank-list">
              <div><dt>Account holder</dt><dd>{bank.account_holder}</dd></div>
              <div><dt>Bank</dt><dd>{bank.bank_name}</dd></div>
              {bank.branch_name && <div><dt>Branch</dt><dd>{bank.branch_name}</dd></div>}
              <div><dt>Branch code</dt><dd>{bank.branch_code}</dd></div>
              <div><dt>Account number</dt><dd><strong>{groupDigits(bank.account_number)}</strong></dd></div>
              <div><dt>Account type</dt><dd>{bank.account_type}</dd></div>
              {bank.swift_code && <div><dt>SWIFT code</dt><dd>{bank.swift_code}</dd></div>}
            </dl>
            <div className="reference">
              <span>Payment reference</span>
              <strong>{order.order_number}</strong>
              <span>Amount</span>
              <strong className="reference__amount">{formatMoney(order.total)}</strong>
            </div>
            {bank.pop_email && (
              <p className="hint">Send proof of payment to <a className="link" href={`mailto:${bank.pop_email}`}>{bank.pop_email}</a>.</p>
            )}
            {bank.payment_instructions && <p className="hint pre-line">{bank.payment_instructions}</p>}
            <ResendEmailButton orderNumber={order.order_number} />
          </aside>
        </div>
      </div>
    </>
  );
}
