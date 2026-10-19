import Link from 'next/link';
import { requireMember } from '@/lib/auth';
import { getCartLines, cartTotals } from '@/lib/cart';
import { formatMoney } from '@/lib/format';
import { CartQuantity } from '@/components/CartQuantity';
import { PlaceOrderButton } from '@/components/PlaceOrderButton';
import { LineOptions } from '@/components/LineOptions';
import { Price } from '@/components/Price';

export const dynamic = 'force-dynamic';

export default async function CartPage() {
  const member = await requireMember();
  const { lines, error } = await getCartLines(member.id);
  const { count, total } = cartTotals(lines);

  return (
    <>
      <div className="page-header">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/" className="breadcrumbs__link">Store</Link>
        </nav>
        <h1 className="page-header__title">Cart</h1>
        <p className="page-header__subtitle">
          {count === 1 ? '1 item' : `${count} items`}
        </p>
      </div>

      <div className="page-body">
        {error && (
          <div className="message-strip message-strip--error" role="alert">
            The cart could not be loaded: {error}
          </div>
        )}

        {lines.length === 0 ? (
          <section className="panel no-data">
            <p>Your cart is empty.</p>
            <Link href="/" className="btn btn--emphasized">Browse the store</Link>
          </section>
        ) : (
          <div className="cart">
            <section className="panel" aria-labelledby="cart-items">
              <div className="toolbar">
                <h2 id="cart-items" className="toolbar__title">Items ({count})</h2>
              </div>
              <ul className="cart__lines">
                {lines.map((line) => (
                  <li key={line.line_id} className="cart-line">
                    <div className="cart-line__image">
                      {line.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={line.image_url} alt={line.name} />
                      ) : (
                        <span className="product__noimage">No image</span>
                      )}
                    </div>
                    <div className="cart-line__info">
                      <h3 className="cart-line__name">{line.name}</h3>
                      <LineOptions size={line.size} colour={line.colour} note={line.note} />
                      <p className="cart-line__unit">
                        <Price price={line.selling_price} regular={line.regular_price} discount={line.discount_percent} /> each
                      </p>
                      <CartQuantity lineId={line.line_id} itemName={line.name} quantity={line.quantity} />
                    </div>
                    <p className="cart-line__total">{formatMoney(line.line_total)}</p>
                  </li>
                ))}
              </ul>
            </section>

            <aside className="panel cart__summary" aria-labelledby="cart-summary">
              <h2 id="cart-summary" className="cart__summary-title">Summary</h2>
              <dl className="cart__totals">
                <div><dt>Items</dt><dd>{count}</dd></div>
                <div className="cart__grand"><dt>Total</dt><dd>{formatMoney(total)}</dd></div>
              </dl>
              <PlaceOrderButton />
              <Link href="/" className="btn cart__continue">Continue shopping</Link>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}
