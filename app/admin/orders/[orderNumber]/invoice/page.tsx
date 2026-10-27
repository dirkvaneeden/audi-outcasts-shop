import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getInvoice, hasInvoice, invoiceNumber } from '@/lib/invoice';
import { Invoice } from '@/components/Invoice';
import { PrintButton } from '@/components/PrintButton';

export const dynamic = 'force-dynamic';

/** Admins can open the invoice of any paid order (the admin layout checks the role). */
export default async function AdminInvoicePage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const data = await getInvoice(orderNumber, null);
  if (!data) notFound();

  return (
    <div className="invoice-page">
      <div className="invoice-toolbar no-print">
        <Link href={`/admin/orders/${orderNumber}`} className="btn">Back to Order</Link>
        <span className="toolbar__spacer" />
        {hasInvoice(data.order.status) && <PrintButton />}
      </div>
      {hasInvoice(data.order.status) ? (
        <Invoice data={data} />
      ) : (
        <section className="panel no-data"><p>This order isn’t paid yet, so there is no invoice.</p></section>
      )}
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  return { title: `Invoice ${invoiceNumber(orderNumber)}` };
}
