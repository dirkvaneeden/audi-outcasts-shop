import 'server-only';
import type { AdminOrder, OrderLine } from '@/lib/types';
import { formatDate, formatMoney } from '@/lib/format';

/**
 * Supplier list: everything that is paid or ordered but not delivered.
 * Written to be forwarded to a supplier: it shows cost prices and the amount to pay the supplier,
 * but never selling prices, member phone numbers or emails.
 */

type OpenOrder = { order: AdminOrder; lines: OrderLine[] };
type Contact = { name: string; email: string };

const C = {
  shell: '#354a5f', brand: '#427cac', page: '#eef1f4', text: '#222222', label: '#666666',
  border: '#dddddd', soft: '#f5f7f9', newCol: '#2b7c2b', oldCol: '#7a8793', note: '#fff6d6', noteBorder: '#e7b416',
};
const FONT = 'Arial, Helvetica, sans-serif';
const esc = (s: string | null | undefined) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const dash = (s: string) => (s ? s : '–');

// ---------- Totals: item -> size/colour -> quantity --------------------
type Variant = { size: string; colour: string; unitCost: number | null; quantity: number; notes: number };
type ItemGroup = { name: string; image_url: string | null; quantity: number; variants: Variant[] };

const lineCost = (l: OrderLine) => (l.unit_cost == null ? null : Math.round(l.unit_cost * l.quantity * 100) / 100);

/** Total cost of a set of orders, and how many lines have no cost price. */
function costTotals(list: OpenOrder[]) {
  let total = 0;
  let missing = 0;
  for (const { lines } of list) for (const l of lines) {
    const c = lineCost(l);
    if (c == null) missing += 1; else total += c;
  }
  return { total: Math.round(total * 100) / 100, missing };
}

function groupByItem(list: OpenOrder[]): ItemGroup[] {
  const items = new Map<string, ItemGroup>();
  for (const { lines } of list) {
    for (const l of lines) {
      const key = l.item_id ?? l.name;
      const item = items.get(key) ?? { name: l.name, image_url: l.image_url, quantity: 0, variants: [] };
      // Same size and colour at a different cost (price changed between orders) gets its own row
      const unitCost = l.unit_cost ?? null;
      let v = item.variants.find((x) => x.size === l.size && x.colour === l.colour && x.unitCost === unitCost);
      if (!v) { v = { size: l.size, colour: l.colour, unitCost, quantity: 0, notes: 0 }; item.variants.push(v); }
      v.quantity += l.quantity;
      if (l.note) v.notes += 1;
      item.quantity += l.quantity;
      items.set(key, item);
    }
  }
  const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', 'XXL', '3XL', 'XXXL', '4XL', '5XL'];
  const rank = (s: string) => { const i = sizeOrder.indexOf(s.toUpperCase()); return i < 0 ? 99 : i; };
  for (const item of items.values()) {
    item.variants.sort((a, b) => rank(a.size) - rank(b.size) || a.size.localeCompare(b.size) || a.colour.localeCompare(b.colour));
  }
  return [...items.values()].sort((a, b) => a.name.localeCompare(b.name));
}

const pieces = (list: OpenOrder[]) => list.reduce((n, o) => n + o.lines.reduce((m, l) => m + l.quantity, 0), 0);

// ---------- HTML building blocks ----------------------------------------
const th = (text: string, align = 'left', width = '') =>
  `<th align="${align}" ${width ? `width="${width}"` : ''} style="padding:8px 10px;background:${C.soft};border-bottom:2px solid ${C.border};font-family:${FONT};font-size:12px;font-weight:bold;color:${C.label};text-align:${align};">${esc(text)}</th>`;

const td = (html: string, align = 'left', extra = '') =>
  `<td align="${align}" style="padding:8px 10px;border-bottom:1px solid ${C.border};font-family:${FONT};font-size:14px;color:${C.text};vertical-align:top;${extra}">${html}</td>`;

function sectionTitle(title: string, subtitle: string, colour: string) {
  return `
  <tr><td style="padding:28px 24px 10px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="border-left:5px solid ${colour};padding:2px 0 2px 12px;font-family:${FONT};">
        <div style="font-size:19px;font-weight:bold;color:${C.text};">${esc(title)}</div>
        <div style="font-size:13px;color:${C.label};margin-top:2px;">${esc(subtitle)}</div>
      </td>
    </tr></table>
  </td></tr>`;
}

/** Table 1: what to supply, totalled per item, size and colour. */
function totalsTable(list: OpenOrder[], totalLabel: string) {
  const cost = costTotals(list);
  const rows = groupByItem(list).map((item) => {
    const head = `
      <tr>
        <td colspan="6" style="padding:12px 10px 6px;border-bottom:1px solid ${C.border};background:#ffffff;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            ${item.image_url ? `<td style="padding-right:10px;"><img src="${esc(item.image_url)}" width="44" height="44" alt="" style="display:block;width:44px;height:44px;object-fit:cover;border:1px solid ${C.border};border-radius:4px;"></td>` : ''}
            <td style="font-family:${FONT};font-size:15px;font-weight:bold;color:${C.text};">${esc(item.name)}
              <span style="font-weight:normal;color:${C.label};font-size:13px;">&nbsp;&nbsp;${item.quantity} in total</span></td>
          </tr></table>
        </td>
      </tr>`;
    const variants = item.variants.map((v) => `
      <tr>
        ${td('', 'left', 'width:20px;')}
        ${td(esc(dash(v.size)), 'left', 'font-weight:bold;')}
        ${td(esc(dash(v.colour)) + (v.notes ? `<br><span style="font-size:12px;color:#8a6d00;">${v.notes} with a note, see list below</span>` : ''))}
        ${td(String(v.quantity), 'right', 'font-size:18px;font-weight:bold;white-space:nowrap;')}
        ${td(v.unitCost == null ? '<span style="color:#bb0000;">not set</span>' : esc(formatMoney(v.unitCost)), 'right', 'white-space:nowrap;color:#555555;')}
        ${td(v.unitCost == null ? '–' : esc(formatMoney(v.unitCost * v.quantity)), 'right', 'white-space:nowrap;font-weight:bold;')}
      </tr>`).join('');
    return head + variants;
  }).join('');

  return `
  <tr><td style="padding:0 24px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${C.border};border-radius:4px;border-collapse:separate;">
      <tr>${th('', 'left', '20')}${th('Size')}${th('Colour')}${th('Qty', 'right', '50')}${th('Cost each', 'right', '95')}${th('Total', 'right', '105')}</tr>
      ${rows}
      <tr>
        <td colspan="3" style="padding:12px 10px;background:${C.soft};font-family:${FONT};font-size:14px;font-weight:bold;color:${C.text};">Total pieces</td>
        <td align="right" style="padding:12px 10px;background:${C.soft};font-family:${FONT};font-size:18px;font-weight:bold;color:${C.text};">${pieces(list)}</td>
        <td colspan="2" style="background:${C.soft};"></td>
      </tr>
      <tr>
        <td colspan="4" style="padding:14px 10px;border-top:2px solid ${C.text};font-family:${FONT};font-size:15px;font-weight:bold;color:${C.text};">${esc(totalLabel)}</td>
        <td colspan="2" align="right" style="padding:14px 10px;border-top:2px solid ${C.text};font-family:${FONT};font-size:22px;font-weight:bold;color:${C.text};white-space:nowrap;">${esc(formatMoney(cost.total))}</td>
      </tr>
      ${cost.missing ? `<tr><td colspan="6" style="padding:0 10px 12px;font-family:${FONT};font-size:12px;color:#bb0000;">${cost.missing} ${cost.missing === 1 ? 'line has' : 'lines have'} no cost price and ${cost.missing === 1 ? 'is' : 'are'} not included in this total.</td></tr>` : ''}
    </table>
  </td></tr>
  <tr><td style="height:16px;line-height:16px;font-size:0;">&nbsp;</td></tr>`;
}

/** Table 2: per person, so the supplier can pack and personalise each order. */
function perPerson(list: OpenOrder[], dateLabel: string, dateField: 'paid_at' | 'ordered_at') {
  return list.map(({ order, lines }) => {
    const when = order[dateField] ?? order.created_at;
    const rows = lines.map((l) => `
      <tr>
        ${td(String(l.quantity), 'center', 'font-weight:bold;width:40px;')}
        ${td(esc(l.name))}
        ${td(esc(dash(l.size)), 'left', 'font-weight:bold;')}
        ${td(esc(dash(l.colour)))}
        ${td(l.unit_cost == null ? '<span style="color:#bb0000;">not set</span>' : esc(formatMoney(l.unit_cost)), 'right', 'white-space:nowrap;color:#555555;')}
        ${td(lineCost(l) == null ? '–' : esc(formatMoney(lineCost(l)!)), 'right', 'white-space:nowrap;font-weight:bold;')}
      </tr>
      ${l.note ? `
      <tr>
        <td></td>
        <td colspan="5" style="padding:0 10px 10px;border-bottom:1px solid ${C.border};">
          <div style="background:${C.note};border-left:4px solid ${C.noteBorder};padding:8px 10px;font-family:${FONT};font-size:14px;color:${C.text};">
            <strong>Note:</strong> ${esc(l.note)}
          </div>
        </td>
      </tr>` : ''}`).join('');

    return `
    <tr><td style="padding:0 24px 14px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${C.border};border-radius:4px;border-collapse:separate;">
        <tr><td colspan="6" style="padding:10px 10px;background:${C.soft};border-bottom:1px solid ${C.border};font-family:${FONT};">
          <span style="font-size:15px;font-weight:bold;color:${C.text};">${esc(order.member.name)}</span>
          <span style="font-size:13px;color:${C.label};">&nbsp;&nbsp;Order ${esc(order.order_number)} &middot; ${esc(dateLabel)} ${esc(formatDate(when))}</span>
        </td></tr>
        <tr>${th('Qty', 'center', '40')}${th('Item')}${th('Size')}${th('Colour')}${th('Cost each', 'right', '90')}${th('Total', 'right', '95')}</tr>
        ${rows}
        <tr>
          <td colspan="4" style="padding:8px 10px;font-family:${FONT};font-size:13px;color:${C.label};">Order total at cost</td>
          <td colspan="2" align="right" style="padding:8px 10px;font-family:${FONT};font-size:15px;font-weight:bold;color:${C.text};white-space:nowrap;">${esc(formatMoney(costTotals([{ order, lines }]).total))}</td>
        </tr>
      </table>
    </td></tr>`;
  }).join('');
}

// ---------- Email ---------------------------------------------------------
export function buildOpenOrdersEmail(
  open: OpenOrder[],
  contact: Contact,
  supplier?: { name: string; contact_person: string | null } | null,
) {
  // Belt and braces: only paid and ordered orders that are not delivered
  const live = open.filter(({ order }) => (order.status === 'paid' || order.status === 'ordered') && !order.delivered_at);
  const toSupply = live.filter((o) => o.order.status === 'paid');
  const alreadyOrdered = live.filter((o) => o.order.status === 'ordered');

  const today = formatDate(new Date().toISOString());
  const newCost = costTotals(toSupply);
  const oldCost = costTotals(alreadyOrdered);
  const forWhom = supplier ? ` for ${supplier.name}` : '';
  const subject = `Audi Outcasts supplier list${forWhom} ${today}: ${pieces(toSupply)} new pieces, ${formatMoney(newCost.total)}`;
  const greeting = supplier ? `Hi ${supplier.contact_person?.trim() || supplier.name},<br><br>` : '';

  const empty = (text: string) =>
    `<tr><td style="padding:0 24px;font-family:${FONT};font-size:14px;color:${C.label};">${esc(text)}</td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${C.page};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page};">
<tr><td align="center" style="padding:24px 8px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;background:#ffffff;border-radius:6px;overflow:hidden;border:1px solid #d9dee3;">

    <tr><td style="background:${C.shell};padding:18px 24px;font-family:${FONT};">
      <span style="display:inline-block;background:#ffffff;color:${C.shell};font-weight:bold;font-size:13px;padding:6px 7px;border-radius:4px;vertical-align:middle;">AO</span>
      <span style="color:#ffffff;font-size:17px;font-weight:bold;vertical-align:middle;padding-left:10px;">Audi Outcasts: Supplier List</span>
      <div style="color:#c3ccd5;font-size:13px;margin-top:6px;">${supplier ? `For ${esc(supplier.name)} &middot; ` : ''}${esc(today)}</div>
    </td></tr>

    <tr><td style="padding:22px 24px 0;font-family:${FONT};font-size:14px;line-height:1.55;color:${C.text};">
      ${greeting}Please supply the items in <strong>section 1</strong>. The first table gives the totals per size and colour,
      with cost prices and the <strong>total to be paid to you</strong>. The list under it shows who each item is for,
      including any notes such as names to print.
      <br><br>
      Questions? Contact ${esc(contact.name)} at <a href="mailto:${esc(contact.email)}" style="color:${C.brand};">${esc(contact.email)}</a>.
    </td></tr>

    <!-- Key figures -->
    <tr><td style="padding:18px 24px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td width="50%" style="padding-right:6px;">
          <div style="border-top:4px solid ${C.newCol};background:${C.soft};padding:12px 14px;font-family:${FONT};">
            <div style="font-size:13px;color:${C.label};">1. New, please supply</div>
            <div style="font-size:26px;font-weight:bold;color:${C.text};">${pieces(toSupply)} <span style="font-size:14px;font-weight:normal;">pieces</span></div>
            <div style="font-size:13px;color:${C.label};">${toSupply.length} ${toSupply.length === 1 ? 'person' : 'people'}</div>
            <div style="font-size:13px;color:${C.label};margin-top:8px;">To pay supplier</div>
            <div style="font-size:20px;font-weight:bold;color:${C.text};">${esc(formatMoney(newCost.total))}</div>
          </div>
        </td>
        <td width="50%" style="padding-left:6px;">
          <div style="border-top:4px solid ${C.oldCol};background:${C.soft};padding:12px 14px;font-family:${FONT};">
            <div style="font-size:13px;color:${C.label};">2. Ordered before, not delivered</div>
            <div style="font-size:26px;font-weight:bold;color:${C.text};">${pieces(alreadyOrdered)} <span style="font-size:14px;font-weight:normal;">pieces</span></div>
            <div style="font-size:13px;color:${C.label};">${alreadyOrdered.length} ${alreadyOrdered.length === 1 ? 'person' : 'people'}</div>
            <div style="font-size:13px;color:${C.label};margin-top:8px;">Value at cost</div>
            <div style="font-size:20px;font-weight:bold;color:${C.text};">${esc(formatMoney(oldCost.total))}</div>
          </div>
        </td>
      </tr></table>
    </td></tr>

    <!-- Section 1 -->
    ${sectionTitle('1. New items to supply', 'Totals per item, size and colour', C.newCol)}
    ${toSupply.length ? totalsTable(toSupply, 'Total to be paid to supplier') : empty('Nothing new to supply.')}
    ${toSupply.length ? sectionTitle('1. Per person', 'Who each item is for, with notes', C.newCol) + perPerson(toSupply, 'paid', 'paid_at') : ''}

    <!-- Section 2 -->
    ${sectionTitle('2. Ordered before, not delivered yet', 'For reference only. Do not supply these again.', C.oldCol)}
    ${alreadyOrdered.length ? totalsTable(alreadyOrdered, 'Value of items ordered before') + perPerson(alreadyOrdered, 'ordered', 'ordered_at') : empty('Nothing outstanding.')}

    <tr><td style="padding:24px;font-family:${FONT};font-size:12px;color:${C.label};">
      Sizes and colours shown as “–” mean the item has no size or colour option.
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;

  // ---------- Plain-text version ----------
  const totalsText = (list: OpenOrder[], totalLabel: string) => [
    ...groupByItem(list).flatMap((item) => [
      `${item.name} (${item.quantity} in total)`,
      ...item.variants.map((v) =>
        `   ${String(v.quantity).padStart(3)} x  size ${dash(v.size)}, colour ${dash(v.colour)}` +
        (v.unitCost == null ? '  (cost not set)' : `  @ ${formatMoney(v.unitCost)} = ${formatMoney(v.unitCost * v.quantity)}`)),
    ]),
    `${totalLabel.toUpperCase()}: ${formatMoney(costTotals(list).total)}`,
  ];
  const personText = (list: OpenOrder[]) => list.flatMap(({ order, lines }) => [
    `${order.member.name} (order ${order.order_number})`,
    ...lines.flatMap((l) => [
      `   ${String(l.quantity).padStart(3)} x ${l.name}, size ${dash(l.size)}, colour ${dash(l.colour)}` +
        (l.unit_cost == null ? '  (cost not set)' : `  @ ${formatMoney(l.unit_cost)} = ${formatMoney(lineCost(l)!)}`),
      ...(l.note ? [`         NOTE: ${l.note}`] : []),
    ]),
    '',
  ]);

  const text = [
    `AUDI OUTCASTS: SUPPLIER LIST${supplier ? ` FOR ${supplier.name.toUpperCase()}` : ''}, ${today}`,
    ...(supplier ? [`Hi ${supplier.contact_person?.trim() || supplier.name},`] : []),
    `Questions? ${contact.name}, ${contact.email}`,
    '',
    `1. NEW ITEMS TO SUPPLY: ${pieces(toSupply)} pieces`,
    ...(toSupply.length ? [...totalsText(toSupply, 'Total to be paid to supplier'), '', 'Per person:', ...personText(toSupply)] : ['Nothing new to supply.', '']),
    '',
    `2. ORDERED BEFORE, NOT DELIVERED (reference only, do not supply again): ${pieces(alreadyOrdered)} pieces`,
    ...(alreadyOrdered.length ? [...totalsText(alreadyOrdered, 'Value of items ordered before'), '', ...personText(alreadyOrdered)] : ['Nothing outstanding.']),
  ].join('\n');

  return { subject, html, text };
}
