import Link from 'next/link';
import { supabaseAdmin, ACTIVE_ITEMS_VIEW } from '@/lib/supabase/server';
import { formatMoney, formatPercent } from '@/lib/format';
import type { Item } from '@/lib/types';
import { DeleteItemButton } from '@/components/DeleteItemButton';
import { listSuppliers } from '@/lib/suppliers';

export const dynamic = 'force-dynamic';

const MESSAGES: Record<string, string> = {
  created: 'Item created.',
  saved: 'Item saved.',
  deleted: 'Item deleted.',
};

export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string }>;
}) {
  const { msg } = await searchParams;

  // Always read from the active view: items marked for deletion never appear
  const [{ data, error }, suppliers] = await Promise.all([
    supabaseAdmin().from(ACTIVE_ITEMS_VIEW).select('*').order('created_at', { ascending: false }),
    listSuppliers(),
  ]);

  const items = (data ?? []) as Item[];
  const supplierName = new Map(suppliers.map((s) => [s.id, s.name]));

  return (
    <>
      <div className="page-header">
        <h1 className="page-header__title">Manage Items</h1>
        <p className="page-header__subtitle">Create items and set their prices for the store.</p>
      </div>

      <div className="page-body">
        {msg && MESSAGES[msg] && (
          <div className="message-strip message-strip--success" role="status">{MESSAGES[msg]}</div>
        )}
        {error && (
          <div className="message-strip message-strip--error" role="alert">
            Items could not be loaded: {error.message}
          </div>
        )}

        <section className="panel">
          <div className="toolbar">
            <h2 className="toolbar__title">Items ({items.length})</h2>
            <span className="toolbar__spacer" />
            <Link href="/items/new" className="btn btn--emphasized">Create</Link>
          </div>

          {items.length === 0 ? (
            <div className="no-data">
              <p>No items yet.</p>
              <Link href="/items/new" className="btn">Create your first item</Link>
            </div>
          ) : (
            <table className="rtable">
              <thead>
                <tr>
                  <th className="rtable__img"><span className="sr-only">Image</span></th>
                  <th>Item</th>
                  <th className="num">Purchase Price</th>
                  <th className="num">Markup</th>
                  <th className="num">Selling Price</th>
                  <th className="rtable__actions"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="rtable__img">
                      {item.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image_url} alt="" className="thumb" loading="lazy" />
                      ) : (
                        <span className="thumb thumb--empty" aria-hidden="true">No image</span>
                      )}
                    </td>
                    <td className="rtable__name">
                      <Link href={`/items/${item.id}`} className="link">{item.name}</Link>
                      {item.description && <span className="rtable__desc">{item.description}</span>}
                      {(item.sizes?.length > 0 || item.colours?.length > 0) && (
                        <span className="rtable__options">
                          {item.sizes?.length > 0 && <>Sizes: {item.sizes.join(', ')}</>}
                          {item.sizes?.length > 0 && item.colours?.length > 0 && ' · '}
                          {item.colours?.length > 0 && <>Colours: {item.colours.join(', ')}</>}
                        </span>
                      )}
                      <span className={`rtable__supplier${item.supplier_id && supplierName.has(item.supplier_id) ? '' : ' rtable__supplier--none'}`}>
                        {item.supplier_id && supplierName.get(item.supplier_id)
                          ? `Supplier: ${supplierName.get(item.supplier_id)}`
                          : 'No supplier'}
                      </span>
                    </td>
                    <td className="num" data-label="Purchase Price">{formatMoney(item.purchase_price)}</td>
                    <td className="num" data-label="Markup">{formatPercent(item.markup_percent)}</td>
                    <td className="num rtable__selling" data-label="Selling Price">{formatMoney(item.selling_price)}</td>
                    <td className="rtable__actions">
                      <Link href={`/items/${item.id}`} className="btn btn--transparent">Edit</Link>
                      <DeleteItemButton id={item.id} name={item.name} />
                    </td>
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
