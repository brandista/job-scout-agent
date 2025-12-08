/**
 * Email Digest - Viikottainen yhteenveto sähköpostiin
 * 
 * Käyttää Resend API:a sähköpostien lähettämiseen
 */

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface DigestEmailParams {
  to: string;
  userName: string;
  watchlist: any[];
  profile: any;
  topSignals?: any[];
  newJobs?: any[];
}

/**
 * Generate HTML email content for digest
 */
function generateDigestHtml(params: DigestEmailParams): string {
  const { userName, watchlist, topSignals = [], newJobs = [] } = params;
  
  const signalRows = topSignals.slice(0, 5).map(signal => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">
        <strong>${signal.companyName || 'Yritys'}</strong>
        <br>
        <span style="color: #666; font-size: 14px;">${signal.headline || signal.eventType}</span>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
        <span style="background: ${signal.talentNeedScore >= 7 ? '#22c55e' : signal.talentNeedScore >= 4 ? '#eab308' : '#6b7280'}; color: white; padding: 4px 12px; border-radius: 12px; font-weight: bold;">
          ${signal.talentNeedScore?.toFixed(1) || '—'}
        </span>
      </td>
    </tr>
  `).join('');

  const watchlistRows = watchlist.slice(0, 5).map(item => `
    <tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">
        ${item.companyName}
      </td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align: center;">
        ${item.recentEventsCount || 0} signaalia
      </td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>JobScout Viikkodigest</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <!-- Header -->
  <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #3b82f6;">
    <h1 style="margin: 0; color: #3b82f6;">🎯 JobScout</h1>
    <p style="margin: 5px 0 0; color: #666;">Viikkodigest</p>
  </div>

  <!-- Greeting -->
  <div style="padding: 20px 0;">
    <h2 style="margin: 0 0 10px;">Hei ${userName}! 👋</h2>
    <p style="margin: 0; color: #666;">
      Tässä viikon tärkeimmät rekrytointisignaalit ja päivitykset.
    </p>
  </div>

  <!-- Top Signals -->
  ${topSignals.length > 0 ? `
  <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
    <h3 style="margin: 0 0 15px; color: #1e40af;">🔥 Viikon vahvimmat signaalit</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <thead>
        <tr>
          <th style="text-align: left; padding: 8px 12px; border-bottom: 2px solid #ddd;">Yritys</th>
          <th style="text-align: center; padding: 8px 12px; border-bottom: 2px solid #ddd;">Score</th>
        </tr>
      </thead>
      <tbody>
        ${signalRows || '<tr><td colspan="2" style="padding: 12px; text-align: center; color: #666;">Ei uusia signaaleja</td></tr>'}
      </tbody>
    </table>
  </div>
  ` : ''}

  <!-- Watchlist Updates -->
  ${watchlist.length > 0 ? `
  <div style="background: #fef3c7; border-radius: 8px; padding: 20px; margin: 20px 0;">
    <h3 style="margin: 0 0 15px; color: #92400e;">👀 Seuraamiesi yritysten tilanne</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <tbody>
        ${watchlistRows}
      </tbody>
    </table>
    <p style="margin: 15px 0 0; font-size: 14px; color: #666;">
      Seuraat ${watchlist.length} yritystä
    </p>
  </div>
  ` : `
  <div style="background: #f1f5f9; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
    <p style="margin: 0; color: #666;">
      Et vielä seuraa yrityksiä. 
      <a href="https://jobscout.brandista.eu/prh" style="color: #3b82f6;">Lisää yrityksiä watchlistille →</a>
    </p>
  </div>
  `}

  <!-- CTA -->
  <div style="text-align: center; padding: 30px 0;">
    <a href="https://jobscout.brandista.eu/agents" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">
      🔮 Kysy Väinöltä lisää
    </a>
  </div>

  <!-- Footer -->
  <div style="border-top: 1px solid #eee; padding: 20px 0; text-align: center; color: #999; font-size: 12px;">
    <p style="margin: 0 0 10px;">
      Sait tämän viestin koska olet rekisteröitynyt JobScout-palveluun.
    </p>
    <p style="margin: 0;">
      <a href="https://jobscout.brandista.eu/profile" style="color: #666;">Muokkaa asetuksia</a> · 
      <a href="https://jobscout.brandista.eu" style="color: #666;">Avaa JobScout</a>
    </p>
  </div>

</body>
</html>
  `;
}

/**
 * Send digest email
 */
export async function sendDigestEmail(params: DigestEmailParams): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.error('[EmailDigest] RESEND_API_KEY not configured');
    throw new Error('Email service not configured');
  }

  const html = generateDigestHtml(params);

  try {
    const { data, error } = await resend.emails.send({
      from: 'JobScout <noreply@brandista.eu>',
      to: params.to,
      subject: `🎯 JobScout Viikkodigest - ${new Date().toLocaleDateString('fi-FI')}`,
      html,
    });

    if (error) {
      console.error('[EmailDigest] Send error:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    console.log(`[EmailDigest] Sent to ${params.to}, id: ${data?.id}`);
  } catch (error) {
    console.error('[EmailDigest] Error:', error);
    throw error;
  }
}

/**
 * Send digest to all users with email enabled
 * Called by cron job or manual trigger
 */
export async function sendWeeklyDigests(): Promise<{ sent: number; failed: number }> {
  const { getDb } = await import("./db");
  const { sql } = await import("drizzle-orm");
  
  const db = await getDb();
  if (!db) {
    console.error('[EmailDigest] Database not available');
    return { sent: 0, failed: 0 };
  }

  // Get users with email digest enabled
  const usersResult = await db.execute(sql`
    SELECT u.id, u.name, u.email, a.emailAddress
    FROM users u
    LEFT JOIN autoScoutSettings a ON u.id = a.userId
    WHERE a.emailEnabled = 1 OR u.email IS NOT NULL
  `);
  
  const users = (usersResult[0] as any[]) || [];
  let sent = 0;
  let failed = 0;

  for (const user of users) {
    const email = user.emailAddress || user.email;
    if (!email) continue;

    try {
      const { getProfileByUserId, getWatchlist } = await import("./db");
      
      const [profile, watchlist] = await Promise.all([
        getProfileByUserId(user.id),
        getWatchlist(user.id),
      ]);

      // Get top signals
      const signalsResult = await db.execute(sql`
        SELECT e.*, c.name as companyName, c.talentNeedScore
        FROM events e
        JOIN companies c ON e.companyId = c.id
        WHERE e.createdAt > DATE_SUB(NOW(), INTERVAL 7 DAY)
        ORDER BY c.talentNeedScore DESC
        LIMIT 5
      `);

      await sendDigestEmail({
        to: email,
        userName: user.name || 'Käyttäjä',
        watchlist,
        profile,
        topSignals: (signalsResult[0] as any[]) || [],
      });

      sent++;
    } catch (error) {
      console.error(`[EmailDigest] Failed for user ${user.id}:`, error);
      failed++;
    }
  }

  console.log(`[EmailDigest] Weekly digest complete: ${sent} sent, ${failed} failed`);
  return { sent, failed };
}
