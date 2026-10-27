import type { InvoiceData } from '@/lib/invoice';
import { invoiceNumber } from '@/lib/invoice';
import { describeOptions } from '@/lib/line-options';
import { formatDate, formatMoney } from '@/lib/format';

const STORE_NAME = 'Audi Outcasts Store';
const LOGO = '/brand/logo-full.png';

/** A4 invoice, designed to look right on screen and when printed or saved as PDF. */
export function Invoice({ data }: { data: InvoiceData }) {
  const { order, lines, member } = data;
  const bank = order.bank_details;
  const paidOn = order.paid_at ?? order.created_at;

  // Totals: show promotion discounts separately when there were any
  const regularTotal = Math.round(
    lines.reduce((s, l) => s + (l.regular_price ?? l.unit_price) * l.quantity, 0) * 100,
  ) / 100;
  const discount = Math.round((regularTotal - order.total) * 100) / 100;
  const last4 = bank.account_number.slice(-4);

  return (
    <article className="invoice" aria-label={`Invoice ${invoiceNumber(order.order_number)}`}>
      {/* Header */}
      <header className="invoice__header">
        <div className="invoice__from">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO} alt={STORE_NAME} className="invoice__logo-img" width={128} height={100} />
          <div className="invoice__from-text">
            <p className="invoice__store">{STORE_NAME}</p>
            <p className="invoice__muted">{bank.account_holder}</p>
            {bank.pop_email && <p className="invoice__muted">{bank.pop_email}</p>}
          </div>
        </div>
        <div className="invoice__title-block">
          <h1 className="invoice__title">Invoice</h1>
          <span className="invoice__paid">Paid</span>
        </div>
      </header>

      {/* Invoice details + bill to */}
      <section className="invoice__meta">
        <div>
          <h2 className="invoice__label">Billed to</h2>
          <p className="invoice__strong">{member.name}</p>
          <p>Member {member.member_number}</p>
          <p>{member.email}</p>
          {member.phone && <p>{member.phone}</p>}
        </div>
        <dl className="invoice__facts">
          <div><dt>Invoice number</dt><dd>{invoiceNumber(order.order_number)}</dd></div>
          <div><dt>Invoice date</dt><dd>{formatDate(paidOn)}</dd></div>
          <div><dt>Order number</dt><dd>{order.order_number}</dd></div>
          <div><dt>Order date</dt><dd>{formatDate(order.created_at)}</dd></div>
        </dl>
      </section>

      {/* Lines */}
      <table className="invoice__lines">
        <thead>
          <tr>
            <th className="invoice__num">#</th>
            <th>Description</th>
            <th className="invoice__r">Qty</th>
            <th className="invoice__r">Unit price</th>
            <th className="invoice__r">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => {
            const options = describeOptions(l);
            const onSale = (l.discount_percent ?? 0) > 0 && l.regular_price != null && l.regular_price > l.unit_price;
            return (
              <tr key={l.line_no}>
                <td className="invoice__num">{i + 1}</td>
                <td>
                  <span className="invoice__strong">{l.name}</span>
                  {options && <span className="invoice__sub">{options}</span>}
                  {l.note && <span className="invoice__sub">Note: {l.note}</span>}
                  {onSale && (
                    <span className="invoice__sub">
                      Promotion {Number(l.discount_percent)}% off (was {formatMoney(l.regular_price!)})
                    </span>
                  )}
                </td>
                <td className="invoice__r">{l.quantity}</td>
                <td className="invoice__r">{formatMoney(l.unit_price)}</td>
                <td className="invoice__r">{formatMoney(l.line_total)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Totals */}
      <section className="invoice__bottom">
        <div className="invoice__payment">
          <h2 className="invoice__label">Payment</h2>
          <p>Paid by EFT on {formatDate(paidOn)}</p>
          <p>Reference {order.order_number}</p>
          <p className="invoice__muted">{bank.bank_name} account ending {last4}</p>
        </div>
        <dl className="invoice__totals">
          {discount > 0 && (
            <>
              <div><dt>Subtotal</dt><dd>{formatMoney(regularTotal)}</dd></div>
              <div><dt>Promotion discounts</dt><dd>−{formatMoney(discount)}</dd></div>
            </>
          )}
          <div className="invoice__total"><dt>Total</dt><dd>{formatMoney(order.total)}</dd></div>
          <div><dt>Amount paid</dt><dd>{formatMoney(order.total)}</dd></div>
          <div className="invoice__due"><dt>Balance due</dt><dd>{formatMoney(0)}</dd></div>
        </dl>
      </section>

      <footer className="invoice__footer">
        <p>No VAT is charged on this invoice.</p>
        <p>Thank you for your order.</p>
      </footer>
    </article>
  );
}
