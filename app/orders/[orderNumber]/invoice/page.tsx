import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireMember } from '@/lib/auth';
import { getInvoice, hasInvoice, invoiceNumber } from '@/lib/invoice';
import { Invoice } from '@/components/Invoice';
import { PrintButton } from '@/components/PrintButton';

export const dynamic = 'force-dynamic';

export default async function MemberInvoicePage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const member = await requireMember();
  const { orderNumber } = await params;
  const data = await getInvoice(orderNumber, member.id);   // only the member's own orders
  if (!data) notFound();

  return (
    <div className="invoice-page">
      <div className="invoice-toolbar no-print">
        <Link href={`/orders/${orderNumber}`} className="btn">Back to Order</Link>
        <span className="toolbar__spacer" />
        {hasInvoice(data.order.status) && <PrintButton />}
      </div>

      {hasInvoice(data.order.status) ? (
        <Invoice data={data} />
      ) : (
        <section className="panel no-data">
          <p>The invoice for order {orderNumber} is available once your payment has been received.</p>
          <Link href={`/orders/${orderNumber}`} className="btn btn--emphasized">View payment details</Link>
        </section>
      )}
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  return { title: `Invoice ${invoiceNumber(orderNumber)}` };   // also the default PDF file name
}
