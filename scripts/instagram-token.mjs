#!/usr/bin/env node
/**
 * Instagram token helper.
 *
 * Instagram hands you a SHORT-lived token (1 hour) from the Graph API
 * Explorer. That's useless for a website. This exchanges it for a
 * LONG-lived one (60 days) and prints both env vars ready to paste.
 *
 *   node scripts/instagram-token.mjs <short-lived-token>
 *
 * Refresh before it expires (any time after day 1, up to day 60):
 *
 *   node scripts/instagram-token.mjs --refresh <current-long-lived-token>
 *
 * ── GETTING THE FIRST TOKEN ───────────────────────────────────────
 * 1. Instagram account must be Business or Creator, not Personal.
 *    Instagram app → Settings → Account type and tools → Switch to
 *    professional account
 * 2. Link it to a Facebook Page:
 *    Instagram → Settings → Accounts Centre → Connected experiences
 * 3. developers.facebook.com → My Apps → Create App → "Business"
 * 4. In the app: Add Product → Instagram → Basic Display (or Instagram
 *    Graph API if you're using the Business login flow)
 * 5. Generate a token for your Instagram user, copy it, and run this
 *    script with it.
 *
 * Set a calendar reminder for ~day 50. If the token lapses the feed just
 * hides itself — the site keeps working, it simply stops showing posts.
 */

const args = process.argv.slice(2);
const REFRESH = args.includes("--refresh");
const token = args.find((a) => !a.startsWith("--"));

if (!token) {
  console.error("✗ No token supplied.\n");
  console.error("  First time:  node scripts/instagram-token.mjs <short-lived-token>");
  console.error("  Refreshing:  node scripts/instagram-token.mjs --refresh <long-lived-token>\n");
  console.error("  See the comment block at the top of this file for how to");
  console.error("  get the first token out of developers.facebook.com.");
  process.exit(1);
}

const daysLeft = (seconds) => Math.round(seconds / 86400);

async function main() {
  let longLived;
  let expiresIn;

  if (REFRESH) {
    const url = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`;
    const res = await fetch(url);
    const body = await res.json();
    if (!res.ok) return fail(res.status, body);
    longLived = body.access_token;
    expiresIn = body.expires_in;
    console.log(`✓ Token refreshed — good for another ${daysLeft(expiresIn)} days.\n`);
  } else {
    const secret = process.env.INSTAGRAM_APP_SECRET;
    if (!secret) {
      console.error("✗ INSTAGRAM_APP_SECRET is not set.\n");
      console.error("  Find it at developers.facebook.com → your app → App settings → Basic");
      console.error("  Then:  INSTAGRAM_APP_SECRET=xxx node scripts/instagram-token.mjs <token>");
      process.exit(1);
    }
    const url = `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${secret}&access_token=${token}`;
    const res = await fetch(url);
    const body = await res.json();
    if (!res.ok) return fail(res.status, body);
    longLived = body.access_token;
    expiresIn = body.expires_in;
    console.log(`✓ Exchanged for a long-lived token — good for ${daysLeft(expiresIn)} days.\n`);
  }

  // Resolve the user ID so both env vars come from one command.
  const meRes = await fetch(`https://graph.instagram.com/me?fields=id,username&access_token=${longLived}`);
  const me = await meRes.json();

  console.log("Add these to Vercel → Settings → Environment Variables:\n");
  console.log(`INSTAGRAM_ACCESS_TOKEN=${longLived}`);
  if (meRes.ok && me.id) {
    console.log(`INSTAGRAM_USER_ID=${me.id}`);
    console.log(`\n(account: @${me.username})`);
  } else {
    console.log(`INSTAGRAM_USER_ID=<couldn't resolve — check the token scopes>`);
  }

  const expiry = new Date(Date.now() + expiresIn * 1000);
  console.log(`\n⏰ Expires ${expiry.toDateString()}. Set a reminder ~10 days before and run:`);
  console.log(`   node scripts/instagram-token.mjs --refresh <this-token>`);
}

function fail(status, body) {
  console.error(`✗ Instagram returned ${status}`);
  console.error(JSON.stringify(body, null, 2).slice(0, 800));
  const code = body?.error?.code;
  if (code === 190) {
    console.error("\n  Code 190 = the token is invalid or already expired.");
    console.error("  Generate a fresh short-lived one in the Graph API Explorer.");
  }
  process.exit(1);
}

main().catch((e) => {
  console.error("✗ Failed:", e.message);
  process.exit(1);
});
