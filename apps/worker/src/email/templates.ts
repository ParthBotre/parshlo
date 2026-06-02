/**
 * Plain-HTML email templates. Each render() returns {subject, html, text}.
 *
 * Templates are inlined CSS, single-column, max-width: 560px — the patterns
 * that survive Outlook, Gmail mobile, and dark-mode rendering. The wrapper
 * shell is centralized below for consistency.
 */

interface Rendered {
  subject: string;
  html: string;
  text: string;
}

function shell(opts: {
  title: string;
  preheader: string;
  body: string;
  cta?: { href: string; label: string };
}): string {
  const cta = opts.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:24px"><tr><td style="border-radius:8px;background:#0e4733"><a href="${opts.cta.href}" style="display:inline-block;padding:12px 20px;font-family:Inter,Arial,sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none">${opts.cta.label}</a></td></tr></table>`
    : '';
  return `<!doctype html>
<html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width" /></head>
<body style="margin:0;padding:0;background:#f6f7f9;font-family:Inter,Arial,sans-serif;color:#0c1116">
  <div style="display:none;max-height:0;overflow:hidden">${opts.preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:32px 16px">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;box-shadow:0 1px 3px rgba(0,0,0,0.06)">
        <tr><td style="padding:24px 32px;border-bottom:1px solid #eef0f3">
          <span style="display:inline-flex;align-items:center;gap:8px;font-size:16px;font-weight:600">
            <span style="display:inline-block;width:24px;height:24px;background:#0e4733;color:#fff;border-radius:6px;text-align:center;line-height:24px;font-size:13px">P</span>
            Parshlo
          </span>
        </td></tr>
        <tr><td style="padding:32px">
          <h1 style="margin:0 0 16px;font-size:20px;line-height:28px;color:#0c1116">${opts.title}</h1>
          <div style="font-size:14px;line-height:22px;color:#34404a">${opts.body}</div>
          ${cta}
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #eef0f3;font-size:11px;color:#6b7480">
          Parshlo · B2B Ordering Platform · This is a transactional message.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function rupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function itemRow(i: { productName: string; quantity: number; lineTotalPaise: number }): string {
  return `<tr><td style="padding:8px 0;border-bottom:1px solid #eef0f3">${i.productName} × ${String(i.quantity)}</td><td style="padding:8px 0;border-bottom:1px solid #eef0f3;text-align:right;font-family:ui-monospace,monospace">${rupees(i.lineTotalPaise)}</td></tr>`;
}

export interface OrderPlacedBuyerData {
  buyerName: string;
  orderNumber: string;
  items: { productName: string; quantity: number; lineTotalPaise: number }[];
  subtotalPaise: number;
  gstPaise: number;
  totalPaise: number;
  trackingUrl: string;
}

export function renderOrderPlacedBuyer(d: OrderPlacedBuyerData): Rendered {
  const rows = d.items.map(itemRow).join('');
  const body = `
    <p>Hi ${d.buyerName},</p>
    <p>We've received your order <strong>${d.orderNumber}</strong> and our team is reviewing it. You'll receive a dispatch confirmation once it's on the way.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;font-size:13px">
      ${rows}
      <tr><td style="padding:8px 0">Subtotal</td><td style="padding:8px 0;text-align:right;font-family:ui-monospace,monospace">${rupees(d.subtotalPaise)}</td></tr>
      <tr><td style="padding:8px 0;color:#6b7480">GST Rate</td><td style="padding:8px 0;text-align:right;font-family:ui-monospace,monospace;color:#6b7480">5% included in price</td></tr>
      <tr><td style="padding:8px 0;font-weight:600">Total</td><td style="padding:8px 0;text-align:right;font-family:ui-monospace,monospace;font-weight:600">${rupees(d.totalPaise)}</td></tr>
    </table>
  `;
  const subject = `Order ${d.orderNumber} received`;
  return {
    subject,
    html: shell({
      title: 'Order received',
      preheader: `${d.orderNumber} — we'll review shortly`,
      body,
      cta: { href: d.trackingUrl, label: 'Track this order' },
    }),
    text: `Hi ${d.buyerName},\nOrder ${d.orderNumber} received. Total ${rupees(d.totalPaise)}.\nTrack: ${d.trackingUrl}`,
  };
}

export interface OrderPlacedAdminData {
  orderNumber: string;
  buyerBusinessName: string;
  buyerGstin: string;
  totalPaise: number;
  itemCount: number;
  adminUrl: string;
}

export function renderOrderPlacedAdmin(d: OrderPlacedAdminData): Rendered {
  const body = `
    <p>A new B2B order needs review.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;font-size:13px">
      <tr><td style="padding:6px 0;color:#6b7480">Order</td><td style="padding:6px 0;text-align:right;font-weight:600">${d.orderNumber}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7480">Buyer</td><td style="padding:6px 0;text-align:right">${d.buyerBusinessName}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7480">GSTIN</td><td style="padding:6px 0;text-align:right;font-family:ui-monospace,monospace">${d.buyerGstin}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7480">Items</td><td style="padding:6px 0;text-align:right">${String(d.itemCount)}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7480">Total</td><td style="padding:6px 0;text-align:right;font-family:ui-monospace,monospace;font-weight:600">${rupees(d.totalPaise)}</td></tr>
    </table>
  `;
  return {
    subject: `[Action] Order ${d.orderNumber} — ${d.buyerBusinessName}`,
    html: shell({
      title: 'New order — needs review',
      preheader: `${d.orderNumber} from ${d.buyerBusinessName}`,
      body,
      cta: { href: d.adminUrl, label: 'Open admin console' },
    }),
    text: `New order ${d.orderNumber} from ${d.buyerBusinessName}. Total ${rupees(d.totalPaise)}.`,
  };
}

export interface KycDecisionData {
  buyerName: string;
  businessName: string;
  reason?: string;
  signInUrl: string;
}

export function renderKycApproved(d: KycDecisionData): Rendered {
  const body = `
    <p>Hi ${d.buyerName},</p>
    <p>Your B2B account for <strong>${d.businessName}</strong> has been verified and approved. You now have access to wholesale pricing, live inventory, and order placement on Parshlo.</p>
  `;
  return {
    subject: `Welcome to Parshlo — ${d.businessName} approved`,
    html: shell({
      title: 'Your B2B account is approved',
      preheader: 'You now have wholesale access on Parshlo',
      body,
      cta: { href: d.signInUrl, label: 'Sign in to your dashboard' },
    }),
    text: `Your Parshlo B2B account for ${d.businessName} has been approved.`,
  };
}

export function renderKycRejected(d: KycDecisionData): Rendered {
  const body = `
    <p>Hi ${d.buyerName},</p>
    <p>After review, we weren't able to approve B2B access for <strong>${d.businessName}</strong> at this time.</p>
    ${d.reason ? `<p style="margin-top:12px;padding:12px;border-left:3px solid #d97706;background:#fffbeb;color:#92400e"><strong>Reason:</strong> ${d.reason}</p>` : ''}
    <p>If you believe this was made in error or you have additional documentation, please contact our partnerships team.</p>
  `;
  return {
    subject: `Parshlo · Verification result for ${d.businessName}`,
    html: shell({
      title: 'Verification update',
      preheader: 'We could not approve your application at this time',
      body,
    }),
    text: `Your Parshlo application for ${d.businessName} was not approved.${d.reason ? ` Reason: ${d.reason}` : ''}`,
  };
}

export interface LeaveRequestData {
  employeeName: string;
  startDate: string;
  endDate: string;
  dayCount: number;
  reason?: string;
  status?: 'APPROVED' | 'REJECTED';
  reviewerNote?: string;
  adminUrl?: string;
}

export function renderLeaveRequestCreated(d: LeaveRequestData): Rendered {
  const body = `
    <p><strong>${d.employeeName}</strong> submitted a holiday request.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;font-size:13px">
      <tr><td style="padding:6px 0;color:#6b7480">Dates</td><td style="padding:6px 0;text-align:right">${d.startDate} to ${d.endDate}</td></tr>
      <tr><td style="padding:6px 0;color:#6b7480">Days</td><td style="padding:6px 0;text-align:right">${String(d.dayCount)}</td></tr>
      ${d.reason ? `<tr><td style="padding:6px 0;color:#6b7480">Reason</td><td style="padding:6px 0;text-align:right">${d.reason}</td></tr>` : ''}
    </table>
  `;
  return {
    subject: `[Action] Holiday request from ${d.employeeName}`,
    html: shell({
      title: 'Holiday request submitted',
      preheader: `${d.employeeName} requested ${String(d.dayCount)} day(s) off`,
      body,
      cta: d.adminUrl ? { href: d.adminUrl, label: 'Review request' } : undefined,
    }),
    text: `${d.employeeName} requested holiday from ${d.startDate} to ${d.endDate} (${String(d.dayCount)} day(s)).`,
  };
}

export function renderLeaveRequestReviewed(d: LeaveRequestData): Rendered {
  const status = d.status ?? 'APPROVED';
  const approved = status === 'APPROVED';
  const body = `
    <p>Hi ${d.employeeName},</p>
    <p>Your holiday request for <strong>${d.startDate} to ${d.endDate}</strong> (${String(d.dayCount)} day(s)) was <strong>${approved ? 'approved' : 'rejected'}</strong>.</p>
    ${d.reviewerNote ? `<p style="margin-top:12px;padding:12px;border-left:3px solid #0e4733;background:#eef8f3;color:#0e4733"><strong>Note:</strong> ${d.reviewerNote}</p>` : ''}
  `;
  return {
    subject: `Holiday request ${approved ? 'approved' : 'rejected'}`,
    html: shell({
      title: `Holiday request ${approved ? 'approved' : 'rejected'}`,
      preheader: `${d.startDate} to ${d.endDate}`,
      body,
    }),
    text: `Your holiday request for ${d.startDate} to ${d.endDate} was ${approved ? 'approved' : 'rejected'}.${d.reviewerNote ? ` Note: ${d.reviewerNote}` : ''}`,
  };
}
