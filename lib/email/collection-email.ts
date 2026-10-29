import 'server-only';
import type { CollectionContact, OrderLine } from '@/lib/types';
import { describeOptions } from '@/lib/line-options';

const STORE_NAME = 'Audi Outcasts Store';
const C = { shell: '#354a5f', brand: '#427cac', page: '#eef1f4', text: '#333333', label: '#666666', border: '#e5e5e5', ready: '#2b7c2b', readyBg: '#f1fdf6' };
const FONT = 'Arial, Helvetica, sans-serif';
const esc = (s: string | null | undefined) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

type Input = {
  orderNumber: string;
  lines: OrderLine[];
  member: { name: string; nickname: string | null };
  contact: CollectionContact;
};

/** "Your order is ready for collection": asks the member to arrange collection with the admin. */
export function buildCollectionEmail({ orderNumber, lines, member, contact }: Input) {
  const firstName = member.nickname?.trim() || member.name.split(' ')[0];
  const subject = `Your order ${orderNumber} is ready for collection`;
  const tel = contact.phone ? contact.phone.replace(/[^\d+]/g, '') : '';

  const itemRows = lines.map((l) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid ${C.border};font-family:${FONT};font-size:14px;color:${C.text};width:40px;font-weight:bold;">${l.quantity} &times;</td>
      <td style="padding:8px 0;border-bottom:1px solid ${C.border};font-family:${FONT};font-size:14px;color:${C.text};">
        ${esc(l.name)}${describeOptions(l) ? `<br><span style="font-size:13px;color:${C.label};">${esc(describeOptions(l))}</span>` : ''}
        ${l.note ? `<br><span style="font-size:13px;color:${C.label};font-style:italic;">Note: ${esc(l.note)}</span>` : ''}
      </td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${C.page};">
<div style="display:none;max-height:0;overflow:hidden;">Please contact ${esc(contact.name)} to arrange collection of order ${esc(orderNumber)}.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page};">
<tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:6px;overflow:hidden;border:1px solid #d9dee3;">
    <tr><td style="background:${C.shell};padding:18px 24px;font-family:${FONT};">
      <span style="display:inline-block;background:#ffffff;color:${C.shell};font-weight:bold;font-size:13px;padding:6px 7px;border-radius:4px;vertical-align:middle;">AO</span>
      <span style="color:#ffffff;font-size:17px;font-weight:bold;vertical-align:middle;padding-left:10px;">${STORE_NAME}</span>
    </td></tr>

    <tr><td style="padding:28px 24px 8px;font-family:${FONT};color:${C.text};">
      <span style="display:inline-block;margin-bottom:10px;padding:3px 10px;border-radius:12px;background:${C.readyBg};border:1px solid ${C.ready};color:#1d551d;font-size:12px;font-weight:bold;">READY FOR COLLECTION</span>
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:normal;">Good news, ${esc(firstName)}: your order is ready</h1>
      <p style="margin:0;font-size:14px;line-height:1.5;">
        Your order <strong>${esc(orderNumber)}</strong> has arrived and is ready for collection.
        Please contact <strong>${esc(contact.name)}</strong> to arrange a time and place to collect it.
      </p>
    </td></tr>

    <tr><td style="padding:20px 24px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.readyBg};border-left:4px solid ${C.ready};border-radius:4px;">
        <tr><td style="padding:16px 18px;font-family:${FONT};font-size:14px;color:${C.text};line-height:1.7;">
          <div style="font-size:16px;margin-bottom:6px;">Arrange collection with</div>
          <strong style="font-size:16px;">${esc(contact.name)}</strong><br>
          ${contact.phone ? `Phone: <a href="tel:${esc(tel)}" style="color:${C.brand};">${esc(contact.phone)}</a><br>` : ''}
          Email: <a href="mailto:${esc(contact.email)}?subject=${encodeURIComponent(`Collecting order ${orderNumber}`)}" style="color:${C.brand};">${esc(contact.email)}</a><br>
          <span style="color:${C.label};font-size:13px;">You can also simply reply to this email.</span>
        </td></tr>
      </table>
    </td></tr>

    <tr><td style="padding:24px 24px 0;">
      <h2 style="margin:0 0 4px;font-family:${FONT};font-size:16px;font-weight:normal;color:${C.text};">Your items</h2>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemRows}</table>
    </td></tr>

    <tr><td style="padding:24px;font-family:${FONT};font-size:12px;line-height:1.5;color:${C.label};">
      Please mention order number ${esc(orderNumber)} when you collect. You received this email because you placed an order in the ${STORE_NAME}.
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;

  const text = [
    `Good news, ${firstName}: your order ${orderNumber} is ready for collection.`,
    '',
    `Please contact ${contact.name} to arrange a time and place to collect it:`,
    ...(contact.phone ? [`Phone: ${contact.phone}`] : []),
    `Email: ${contact.email} (or reply to this email)`,
    '',
    'YOUR ITEMS',
    ...lines.flatMap((l) => [
      `- ${l.quantity} x ${l.name}${describeOptions(l) ? ` (${describeOptions(l)})` : ''}`,
      ...(l.note ? [`  Note: ${l.note}`] : []),
    ]),
    '',
    `Please mention order number ${orderNumber} when you collect.`,
  ].join('\n');

  return { subject, html, text };
}
