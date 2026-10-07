import 'server-only';
import type { BankDetails, Order, OrderLine } from '@/lib/types';
import { formatDateTime, formatMoney } from '@/lib/format';
import { groupDigits } from '@/lib/banks';
import { describeOptions } from '@/lib/line-options';

const STORE_NAME = 'Audi Outcasts Store';

// Belize palette, inlined because email clients ignore stylesheets
const C = {
  shell: '#354a5f',
  brand: '#427cac',
  page: '#eef1f4',
  text: '#333333',
  label: '#666666',
  border: '#e5e5e5',
  highlight: '#e5f0fa',
};
const FONT = 'Arial, Helvetica, sans-serif';

const esc = (s: string | null | undefined) =>
  String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const nl2br = (s: string) => esc(s).replace(/\r?\n/g, '<br>');

type Input = {
  order: Order;
  lines: OrderLine[];
  member: { name: string; nickname: string | null };
};

export function buildOrderEmail({ order, lines, member }: Input) {
  const bank: BankDetails = order.bank_details;
  const firstName = member.nickname?.trim() || member.name.split(' ')[0];
  const reference = order.order_number;
  const subject = `Order ${reference}: payment details`;

  // ---------------- Item rows ----------------
  const itemRows = lines.map((l) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid ${C.border};width:64px;vertical-align:top;">
        ${l.image_url
          ? `<img src="${esc(l.image_url)}" width="56" height="56" alt="" style="display:block;width:56px;height:56px;object-fit:cover;border:1px solid ${C.border};border-radius:4px;">`
          : `<div style="width:56px;height:56px;background:#fafafa;border:1px solid ${C.border};border-radius:4px;"></div>`}
      </td>
      <td style="padding:12px 12px;border-bottom:1px solid ${C.border};vertical-align:top;font-family:${FONT};font-size:14px;color:${C.text};">
        <strong>${esc(l.name)}</strong><br>
        ${describeOptions(l) ? `<span style="font-size:13px;color:${C.text};">${esc(describeOptions(l))}</span><br>` : ''}
        ${l.note ? `<span style="font-size:13px;color:${C.label};font-style:italic;">Note: ${esc(l.note)}</span><br>` : ''}
        <span style="color:${C.label};font-size:13px;">${l.quantity} &times; ${esc(formatMoney(l.unit_price))}</span>
      </td>
      <td align="right" style="padding:12px 0;border-bottom:1px solid ${C.border};vertical-align:top;font-family:${FONT};font-size:14px;color:${C.text};white-space:nowrap;">
        ${esc(formatMoney(l.line_total))}
      </td>
    </tr>`).join('');

  // ---------------- Banking rows ----------------
  const bankRow = (label: string, value: string, strong = false) => `
    <tr>
      <td style="padding:4px 12px 4px 0;font-family:${FONT};font-size:13px;color:${C.label};white-space:nowrap;vertical-align:top;">${esc(label)}</td>
      <td style="padding:4px 0;font-family:${FONT};font-size:14px;color:${C.text};${strong ? 'font-weight:bold;' : ''}">${esc(value)}</td>
    </tr>`;

  const bankRows = [
    bankRow('Account holder', bank.account_holder),
    bankRow('Bank', bank.bank_name),
    bank.branch_name ? bankRow('Branch', bank.branch_name) : '',
    bankRow('Branch code', bank.branch_code),
    bankRow('Account number', groupDigits(bank.account_number), true),
    bankRow('Account type', bank.account_type),
    bank.swift_code ? bankRow('SWIFT code', bank.swift_code) : '',
  ].join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${C.page};">
<div style="display:none;max-height:0;overflow:hidden;">Total ${esc(formatMoney(order.total))}. Pay by EFT using reference ${esc(reference)}.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page};">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:6px;overflow:hidden;border:1px solid #d9dee3;">

      <!-- Header -->
      <tr><td style="background:${C.shell};padding:18px 24px;font-family:${FONT};">
        <span style="display:inline-block;background:#ffffff;color:${C.shell};font-weight:bold;font-size:13px;padding:6px 7px;border-radius:4px;vertical-align:middle;">AO</span>
        <span style="color:#ffffff;font-size:17px;font-weight:bold;vertical-align:middle;padding-left:10px;">${STORE_NAME}</span>
      </td></tr>

      <!-- Intro -->
      <tr><td style="padding:28px 24px 8px;font-family:${FONT};color:${C.text};">
        <h1 style="margin:0 0 12px;font-size:22px;font-weight:normal;">Thanks for your order, ${esc(firstName)}</h1>
        <p style="margin:0;font-size:14px;line-height:1.5;">
          Your order is reserved and waiting for payment. Please pay by EFT using the banking details below,
          with <strong>${esc(reference)}</strong> as the payment reference, so we can match your payment.
        </p>
      </td></tr>

      <!-- Order meta -->
      <tr><td style="padding:16px 24px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:${FONT};font-size:13px;color:${C.label};">
          <tr>
            <td>Order number<br><span style="font-size:15px;color:${C.text};font-weight:bold;">${esc(reference)}</span></td>
            <td align="right">Placed<br><span style="font-size:15px;color:${C.text};">${esc(formatDateTime(order.created_at))}</span></td>
          </tr>
        </table>
      </td></tr>

      <!-- Items -->
      <tr><td style="padding:20px 24px 0;">
        <h2 style="margin:0 0 4px;font-family:${FONT};font-size:16px;font-weight:normal;color:${C.text};">Items (${order.item_count})</h2>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${itemRows}
          <tr>
            <td></td>
            <td style="padding:14px 12px 0;font-family:${FONT};font-size:15px;font-weight:bold;color:${C.text};">Total</td>
            <td align="right" style="padding:14px 0 0;font-family:${FONT};font-size:20px;font-weight:bold;color:${C.text};white-space:nowrap;">${esc(formatMoney(order.total))}</td>
          </tr>
        </table>
      </td></tr>

      <!-- Banking details -->
      <tr><td style="padding:28px 24px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.highlight};border-left:4px solid ${C.brand};border-radius:4px;">
          <tr><td style="padding:16px 18px;">
            <h2 style="margin:0 0 10px;font-family:${FONT};font-size:16px;font-weight:normal;color:${C.text};">Pay by EFT</h2>
            <table role="presentation" cellpadding="0" cellspacing="0">${bankRows}</table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;background:#ffffff;border:1px solid ${C.brand};border-radius:4px;">
              <tr>
                <td style="padding:10px 14px;font-family:${FONT};font-size:13px;color:${C.label};">Payment reference</td>
                <td align="right" style="padding:10px 14px;font-family:${FONT};font-size:20px;font-weight:bold;letter-spacing:1px;color:${C.shell};">${esc(reference)}</td>
              </tr>
              <tr>
                <td style="padding:0 14px 10px;font-family:${FONT};font-size:13px;color:${C.label};">Amount</td>
                <td align="right" style="padding:0 14px 10px;font-family:${FONT};font-size:16px;font-weight:bold;color:${C.text};">${esc(formatMoney(order.total))}</td>
              </tr>
            </table>
            ${bank.pop_email ? `<p style="margin:14px 0 0;font-family:${FONT};font-size:13px;line-height:1.5;color:${C.text};">Send your proof of payment to <a href="mailto:${esc(bank.pop_email)}" style="color:${C.brand};">${esc(bank.pop_email)}</a>, or simply reply to this email.</p>` : ''}
            ${bank.payment_instructions ? `<p style="margin:10px 0 0;font-family:${FONT};font-size:13px;line-height:1.5;color:${C.text};">${nl2br(bank.payment_instructions)}</p>` : ''}
          </td></tr>
        </table>
      </td></tr>

      <!-- Footer -->
      <tr><td style="padding:28px 24px 24px;font-family:${FONT};font-size:12px;line-height:1.5;color:${C.label};">
        You received this email because you placed an order in the ${STORE_NAME}.
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  // ---------------- Plain-text version ----------------
  const text = [
    `Thanks for your order, ${firstName}`,
    '',
    `Order number: ${reference}`,
    `Placed: ${formatDateTime(order.created_at)}`,
    '',
    'ITEMS',
    ...lines.map((l) => [
      `- ${l.name}${describeOptions(l) ? ` (${describeOptions(l)})` : ''}: ${l.quantity} x ${formatMoney(l.unit_price)} = ${formatMoney(l.line_total)}`,
      ...(l.note ? [`  Note: ${l.note}`] : []),
    ].join('\n')),
    '',
    `TOTAL: ${formatMoney(order.total)}`,
    '',
    'PAY BY EFT',
    `Account holder: ${bank.account_holder}`,
    `Bank: ${bank.bank_name}`,
    ...(bank.branch_name ? [`Branch: ${bank.branch_name}`] : []),
    `Branch code: ${bank.branch_code}`,
    `Account number: ${bank.account_number}`,
    `Account type: ${bank.account_type}`,
    ...(bank.swift_code ? [`SWIFT code: ${bank.swift_code}`] : []),
    `Payment reference: ${reference}`,
    `Amount: ${formatMoney(order.total)}`,
    ...(bank.pop_email ? ['', `Send proof of payment to ${bank.pop_email}.`] : []),
    ...(bank.payment_instructions ? ['', bank.payment_instructions] : []),
  ].join('\n');

  return { subject, html, text };
}
