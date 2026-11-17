import 'server-only';

const STORE_NAME = 'Audi Outcasts Store';
const C = { shell: '#354a5f', brand: '#427cac', page: '#eef1f4', text: '#333333', label: '#666666', border: '#e5e5e5', star: '#e7b416' };
const FONT = 'Arial, Helvetica, sans-serif';
const esc = (s: string | null | undefined) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

type Input = {
  member: { name: string; nickname: string | null };
  orderNumber: string;
  items: { name: string; image: string | null }[];
  link: string;
};

/** Asks a member to rate items from their order. */
export function buildReviewEmail({ member, orderNumber, items, link }: Input) {
  const firstName = member.nickname?.trim() || member.name.split(' ')[0];
  const subject = items.length === 1
    ? `How is your ${items[0].name}? Leave a quick review`
    : `How are your items from order ${orderNumber}? Leave a quick review`;

  const rows = items.map((i) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid ${C.border};width:64px;">
        ${i.image ? `<img src="${esc(i.image)}" width="52" height="52" alt="" style="display:block;width:52px;height:52px;object-fit:cover;border:1px solid ${C.border};border-radius:4px;">` : ''}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid ${C.border};font-family:${FONT};font-size:15px;color:${C.text};">
        <strong>${esc(i.name)}</strong><br>
        <span style="color:${C.star};font-size:18px;letter-spacing:2px;">&#9734;&#9734;&#9734;&#9734;&#9734;</span>
      </td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${C.page};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page};">
<tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:6px;overflow:hidden;border:1px solid #d9dee3;">
    <tr><td style="background:${C.shell};padding:18px 24px;font-family:${FONT};">
      <span style="display:inline-block;background:#ffffff;color:${C.shell};font-weight:bold;font-size:13px;padding:6px 7px;border-radius:4px;vertical-align:middle;">AO</span>
      <span style="color:#ffffff;font-size:17px;font-weight:bold;vertical-align:middle;padding-left:10px;">${STORE_NAME}</span>
    </td></tr>
    <tr><td style="padding:28px 24px 8px;font-family:${FONT};color:${C.text};">
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:normal;">How did we do, ${esc(firstName)}?</h1>
      <p style="margin:0;font-size:14px;line-height:1.5;">
        We'd love to hear what you think of the items from your order <strong>${esc(orderNumber)}</strong>.
        Give each one a star rating and a few words. Your review helps other members choose,
        and you can choose not to show your name.
      </p>
    </td></tr>
    <tr><td style="padding:12px 24px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr>
    <tr><td align="center" style="padding:24px;">
      <a href="${esc(link)}" style="display:inline-block;background:${C.brand};color:#ffffff;font-family:${FONT};font-size:15px;font-weight:bold;text-decoration:none;padding:12px 28px;border-radius:4px;">Write my review</a>
      <p style="margin:12px 0 0;font-family:${FONT};font-size:12px;color:${C.label};">You'll sign in with your email and a code, as usual. It takes about a minute.</p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;

  const text = [
    `How did we do, ${firstName}?`,
    '',
    `Please rate the items from your order ${orderNumber}:`,
    ...items.map((i) => `- ${i.name}`),
    '',
    `Write your review: ${link}`,
    'You can choose not to show your name.',
  ].join('\n');

  return { subject, html, text };
}
