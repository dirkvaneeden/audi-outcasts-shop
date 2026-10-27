import Link from 'next/link';
import { listSuppliers, itemCountsBySupplier } from '@/lib/suppliers';

export const dynamic = 'force-dynamic';

const MESSAGES: Record<string, string> = { created: 'Supplier created.', saved: 'Supplier saved.', deleted: 'Supplier deleted.' };

export default async function SuppliersPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const { msg } = await searchParams;
  const [suppliers, counts] = await Promise.all([listSuppliers(), itemCountsBySupplier()]);

  return (
    <>
      <div className="page-header">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/" className="breadcrumbs__link">Store</Link>
        </nav>
        <h1 className="page-header__title">Suppliers</h1>
        <p className="page-header__subtitle">Link items to a supplier under Manage Items, then send each supplier their own list.</p>
      </div>
      <div className="page-body">
        {msg && MESSAGES[msg] && <div className="message-strip message-strip--success" role="status">{MESSAGES[msg]}</div>}
        <section className="panel">
          <div className="toolbar">
            <h2 className="toolbar__title">Suppliers ({suppliers.length})</h2>
            <span className="toolbar__spacer" />
            <Link href="/admin/suppliers/new" className="btn btn--emphasized">Create</Link>
          </div>
          {suppliers.length === 0 ? (
            <div className="no-data">
              <p>No suppliers yet.</p>
              <Link href="/admin/suppliers/new" className="btn">Create your first supplier</Link>
            </div>
          ) : (
            <table className="rtable rtable--suppliers">
              <thead>
                <tr><th>Supplier</th><th>Email</th><th>Phone</th><th className="num">Items</th>
                  <th className="rtable__actions"><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id}>
                    <td className="rtable__name">
                      <Link href={`/admin/suppliers/${s.id}`} className="link">{s.name}</Link>
                      {s.contact_person && <span className="rtable__desc">{s.contact_person}</span>}
                    </td>
                    <td data-label="Email">{s.email ?? <span className="field-error">No email</span>}</td>
                    <td data-label="Phone">{s.phone ?? '–'}</td>
                    <td className="num" data-label="Items">{counts.get(s.id) ?? 0}</td>
                    <td className="rtable__actions"><Link href={`/admin/suppliers/${s.id}`} className="btn btn--transparent">Edit</Link></td>
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
