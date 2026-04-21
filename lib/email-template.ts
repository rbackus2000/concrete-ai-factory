/**
 * Marketing email template with tracking pixel, click tracking, and unsubscribe link.
 * Matches the RB Studio branded email template used across all modules.
 */

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

/**
 * Wrap all <a href="..."> links in the body with click-tracking redirects.
 */
export function wrapLinksWithTracking(html: string, trackingToken: string): string {
  const appUrl = getAppUrl();
  return html.replace(
    /<a\s+([^>]*?)href="(https?:\/\/[^"]+)"([^>]*?)>/gi,
    (_match, before, url, after) => {
      const encoded = encodeURIComponent(url);
      return `<a ${before}href="${appUrl}/api/track/click/${trackingToken}?url=${encoded}"${after}>`;
    },
  );
}

/**
 * Replace personalization tokens in email body.
 */
export function replaceTokens(
  html: string,
  tokens: Record<string, string | undefined>,
): string {
  let result = html;
  for (const [key, value] of Object.entries(tokens)) {
    if (value !== undefined) {
      result = result.replaceAll(`[${key}]`, value);
    }
  }
  return result;
}

/**
 * Build the full branded email HTML with tracking pixel and unsubscribe link.
 */
export function buildMarketingEmail(input: {
  subject: string;
  bodyHtml: string;
  trackingToken: string;
}): string {
  const appUrl = getAppUrl();
  const pixelUrl = `${appUrl}/api/track/open/${input.trackingToken}`;
  const unsubUrl = `${appUrl}/unsubscribe/${input.trackingToken}`;

  // Wrap links for click tracking
  const trackedBody = wrapLinksWithTracking(input.bodyHtml, input.trackingToken);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; background: #f5f5f5; }
    .header { background: #0a0a0a; padding: 24px 32px; }
    .header-text { color: #c8a96e; font-size: 20px; font-weight: 600; letter-spacing: 0.5px; }
    .content { background: #ffffff; max-width: 600px; margin: 0 auto; padding: 32px; }
    .footer { text-align: center; padding: 24px 32px; color: #999; font-size: 12px; background: #0a0a0a; }
    .footer a { color: #c8a96e; }
    .btn { display: inline-block; padding: 12px 28px; background: #c8a96e; color: #0a0a0a; text-decoration: none; font-weight: 600; border-radius: 6px; }
    .divider { border: none; border-top: 1px solid #eee; margin: 24px 0; }
    h2 { margin: 0 0 16px; color: #0a0a0a; }
    p { line-height: 1.6; margin: 0 0 12px; }
  </style>
</head>
<body>
  <div style="max-width: 600px; margin: 0 auto;">
    <div class="header">
      <span class="header-text">RB Studio</span>
    </div>
    <div class="content">
      ${trackedBody}
    </div>
    <div class="footer">
      <p>RB Architecture Concrete Studio</p>
      <p><a href="${unsubUrl}">Unsubscribe</a></p>
    </div>
  </div>
  <img src="${pixelUrl}" width="1" height="1" style="display:none" alt="" />
</body>
</html>`;
}
