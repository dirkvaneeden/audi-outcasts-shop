import Link from 'next/link';
import { listPromotions, promotionState, type PromotionState } from '@/lib/promotions';
import { formatDay, todayISO } from '@/lib/format';

export const dynamic = 'force-dynamic';

const STATE_LABEL: Record<PromotionState, string> = {
  live: 'Live',
  scheduled: 'Scheduled',
  ended: 'Ended',
  off: 'Switched off',
  'item-deleted': 'Item deleted',
};

const MESSAGES: Record<string, string> = {
  created: 'Promotion created.',
  saved: 'Promotion saved.',
  deleted: 'Promotion deleted.',
};

export default async function PromotionsPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const { msg } = await searchParams;
  const { promotions, error } = await listPromotions();
  const today = todayISO();

  return (
    <>
      <div className="page-header">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/" className="breadcrumbs__link">Store</Link>
        </nav>
        <h1 className="page-header__title">Promotions</h1>
        <p className="page-header__subtitle">Live promotions pop up for members when they open the store.</p>
      </div>

      <div className="page-body">
        {msg && MESSAGES[msg] && <div className="message-strip message-strip--success" role="status">{MESSAGES[msg]}</div>}
        {error && <div className="message-strip message-strip--error" role="alert">Promotions could not be loaded: {error}</div>}

        <section className="panel">
          <div className="toolbar">
            <h2 className="toolbar__title">Promotions ({promotions.length})</h2>
            <span className="toolbar__spacer" />
            <Link href="/admin/promotions/new" className="btn btn--emphasized">Create</Link>
          </div>

          {promotions.length === 0 ? (
            <div className="no-data">
              <p>No promotions yet.</p>
              <Link href="/admin/promotions/new" className="btn">Create your first promotion</Link>
            </div>
          ) : (
            <table className="rtable rtable--promos">
              <thead>
                <tr>
                  <th className="rtable__img"><span className="sr-only">Image</span></th>
                  <th>Promotion</th>
                  <th>Dates</th>
                  <th>Status</th>
                  <th className="num">Added</th>
                  <th className="num">Ignored</th>
                  <th className="rtable__actions"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {promotions.map((p) => {
                  const state = promotionState(p, today);
                  return (
                    <tr key={p.id}>
                      <td className="rtable__img">
                        {p.item?.image_url
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={p.item.image_url} alt="" className="thumb" />
                          : <span className="thumb thumb--empty" aria-hidden="true">No image</span>}
                      </td>
                      <td className="rtable__name">
                        <Link href={`/admin/promotions/${p.id}`} className="link">{p.title}</Link>
                        <span className="rtable__desc">{p.item?.name ?? 'Unknown item'}</span>
                      </td>
                      <td data-label="Dates">{formatDay(p.starts_on)} – {formatDay(p.ends_on)}</td>
                      <td data-label="Status"><span className={`status status--promo-${state}`}>{STATE_LABEL[state]}</span></td>
                      <td className="num" data-label="Added">{p.added}</td>
                      <td className="num" data-label="Ignored">{p.ignored}</td>
                      <td className="rtable__actions">
                        <Link href={`/admin/promotions/${p.id}`} className="btn btn--transparent">Edit</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}
