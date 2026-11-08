/**
 * Advanced Gas & Aircon — weather-triggered location targeting.
 *
 * Paste into Google Ads › Tools › Bulk actions › Scripts, authorise, preview,
 * then schedule HOURLY. Setup and what each setting means: docs/weather-ads/README.md.
 *
 * Every hour it reads https://www.advancedgas.com.au/api/weather-triggers and:
 *
 *   A. Weather campaigns (WEATHER_CAMPAIGNS): paused campaigns you build once
 *      with weather ads in them. While a flag for that campaign is live, the
 *      script points the campaign at the flagged zones and enables it; when
 *      the flags clear, it pauses it again.
 *
 *   B. Bid adjustments (BID_CAMPAIGNS): your always-on campaigns. Each zone
 *      gets a radius target with a bid adjustment that goes up while a
 *      matching flag is live and back to +0% when it clears. Only does
 *      anything on Manual CPC: Smart Bidding ignores location bid adjustments.
 *
 * It never acts on a forecast it couldn't get. If the endpoint is down, the
 * forecast failed, or it's stale, nothing changes and you get an email.
 *
 * NOT YET RUN AGAINST A LIVE ADS ACCOUNT. Preview it first (README, step 4).
 */

var CONFIG = {
  ENDPOINT: 'https://www.advancedgas.com.au/api/weather-triggers',

  // Who hears about failures and changes. Leave '' for no email.
  EMAIL: '',

  // A. Paused weather campaigns: campaign name -> the flag campaigns that switch it on.
  //    Leave a name out (or delete the line) if you haven't built that campaign.
  WEATHER_CAMPAIGNS: {
    'Weather | Cooling':     ['cooling', 'aircon_service'],
    'Weather | Heating':     ['heating', 'heater_service'],
    'Weather | Hot water':   ['hot_water'],
    'Weather | Storm check': ['storm_check'],
  },

  // B. Always-on campaigns to bid up in flagged zones: name -> flag campaigns.
  //    Empty by default: fill in only campaigns on Manual CPC.
  BID_CAMPAIGNS: {
    // 'Aircon - Search':  ['cooling', 'aircon_service'],
    // 'Heating - Search': ['heating', 'heater_service'],
  },

  // Bid adjustment by severity, as a multiplier: 1.15 = +15%. Starting points.
  UPLIFT: { moderate: 1.15, strong: 1.30 },

  // Forecasts firm up as they get closer. Ignore flags whose weather is more
  // than this many days away (0 = today only). The portal still shows them.
  MAX_LEAD_DAYS: 3,

  // Set true and run once to undo everything: pause the weather campaigns and
  // put every zone's bid adjustment back to +0%. Then set it false again.
  RESET_ALL: false,
};

/* ------------------------------------------------------------------ */

var SCHEMA = 1;          // the endpoint's SCHEMA_VERSION this script understands
var SAME_POINT = 0.0015; // degrees, ~150 m: "this proximity target is that zone"

function main() {
  var preview = AdsApp.getExecutionInfo().isPreview();
  var log = [];
  function say(s) { Logger.log(s); log.push(s); }
  say((preview ? '[PREVIEW: no changes are saved] ' : '') + 'Weather targets run ' + new Date().toISOString());

  if (CONFIG.RESET_ALL) {
    resetAll(say);
    notify('Weather targets: reset', log);
    return;
  }

  var report = fetchReport(say);
  if (!report) { notify('Weather targets: NOT RUN, endpoint failed', log); return; }

  // Only "ok" and "partial" are safe to act on. Anything else means the
  // forecast couldn't be checked, which is not the same as "no weather".
  if (report.status !== 'ok' && report.status !== 'partial') {
    say('Forecast status is "' + report.status + '": ' + report.message);
    say('Changing nothing. Ads stay exactly as they were.');
    notify('Weather targets: NOT RUN, forecast ' + report.status, log);
    return;
  }
  say('Forecast: ' + report.message);

  // Zones whose forecast arrived. Anything else is left untouched below.
  var zones = {};
  report.zones.forEach(function (z) { if (z.weather === 'ok') zones[z.id] = z; });

  var live = report.flags.filter(function (f) {
    return zones[f.zoneId] && f.leadDays <= CONFIG.MAX_LEAD_DAYS;
  });
  say(live.length + ' flag(s) within ' + CONFIG.MAX_LEAD_DAYS + ' days: ' +
      live.map(function (f) { return f.label + ' / ' + f.zoneName + ' (' + f.severity + ')'; }).join('; '));

  var changed = false;
  Object.keys(CONFIG.WEATHER_CAMPAIGNS).forEach(function (name) {
    changed = runWeatherCampaign(name, CONFIG.WEATHER_CAMPAIGNS[name], live, say) || changed;
  });
  Object.keys(CONFIG.BID_CAMPAIGNS).forEach(function (name) {
    changed = runBidCampaign(name, CONFIG.BID_CAMPAIGNS[name], live, report.zones, say) || changed;
  });

  if (changed) notify('Weather targets: changes made', log);
}

/* ------------------------------------------------------- the endpoint */

function fetchReport(say) {
  var res;
  try {
    res = UrlFetchApp.fetch(CONFIG.ENDPOINT, { muteHttpExceptions: true, headers: { Accept: 'application/json' } });
  } catch (e) {
    say('Could not reach ' + CONFIG.ENDPOINT + ': ' + e);
    return null;
  }
  if (res.getResponseCode() !== 200) {
    say('Endpoint answered ' + res.getResponseCode() + '. Changing nothing.');
    return null;
  }
  var report;
  try { report = JSON.parse(res.getContentText()); } catch (e) { say('Endpoint sent something that is not JSON.'); return null; }
  if (report.schema !== SCHEMA) {
    say('Endpoint is schema ' + report.schema + ', this script reads ' + SCHEMA + '. Update the script. Changing nothing.');
    return null;
  }
  return report;
}

/* ------------------------------------------- A. paused weather campaigns */

function runWeatherCampaign(name, keys, live, say) {
  var campaign = findCampaign(name);
  if (!campaign) { say('"' + name + '": no such campaign, skipped.'); return false; }

  // The strongest live flag per zone for this campaign.
  var want = {};
  live.forEach(function (f) {
    if (keys.indexOf(f.campaign) < 0) return;
    var mod = CONFIG.UPLIFT[f.severity] || 1;
    if (!want[f.zoneId] || want[f.zoneId].mod < mod) want[f.zoneId] = { lat: f.lat, lng: f.lng, radius: f.radiusKm, mod: mod, name: f.zoneName };
  });
  var wanted = Object.keys(want);

  if (!wanted.length) {
    // Paused with its last targets left on. Removing them would leave a
    // campaign with no locations, which Google reads as "everywhere", one
    // accidental click on Enable away from spending Australia-wide.
    if (campaign.isEnabled()) { campaign.pause(); say('"' + name + '": no live flags, paused.'); return true; }
    say('"' + name + '": no live flags, stays paused.');
    return false;
  }

  // Add the new targets before removing the old, so the campaign never
  // passes through having none.
  var existing = proximities(campaign);
  var changed = false;
  wanted.forEach(function (id) {
    var w = want[id];
    var hit = matchPoint(existing, w);
    if (!hit) {
      campaign.addProximity(w.lat, w.lng, w.radius, 'KILOMETERS', { bidModifier: w.mod });
      say('"' + name + '": targeting ' + w.name + ' (' + w.radius + ' km, x' + w.mod + ').');
      changed = true;
    } else {
      hit.keep = true;
      if (Math.abs(hit.target.getBidModifier() - w.mod) > 0.001) { hit.target.setBidModifier(w.mod); changed = true; }
    }
  });
  existing.forEach(function (e) {
    if (!e.keep) { e.target.remove(); changed = true; say('"' + name + '": dropped a zone no longer flagged.'); }
  });
  if (!campaign.isEnabled()) { campaign.enable(); say('"' + name + '": ENABLED for ' + wanted.length + ' zone(s).'); changed = true; }
  return changed;
}

/* --------------------------------------------- B. bid adjustments on always-on */

function runBidCampaign(name, keys, live, allZones, say) {
  var campaign = findCampaign(name);
  if (!campaign) { say('"' + name + '": no such campaign, skipped.'); return false; }
  var existing = proximities(campaign);
  var changed = false;

  allZones.forEach(function (z) {
    // A zone without a fresh forecast keeps whatever adjustment it had.
    if (z.weather !== 'ok') { say('"' + name + '": ' + z.name + ' has no forecast, left as is.'); return; }
    var mod = 1;
    live.forEach(function (f) {
      if (f.zoneId === z.id && keys.indexOf(f.campaign) >= 0) mod = Math.max(mod, CONFIG.UPLIFT[f.severity] || 1);
    });
    var hit = matchPoint(existing, { lat: z.lat, lng: z.lng, radius: z.radiusKm });
    if (!hit) {
      // Every zone circle sits inside the 75 km service radius, so adding them
      // doesn't widen a campaign already aimed at the service area.
      campaign.addProximity(z.lat, z.lng, z.radiusKm, 'KILOMETERS', { bidModifier: mod });
      say('"' + name + '": added ' + z.name + ' at x' + mod + '.');
      changed = true;
    } else if (Math.abs(hit.target.getBidModifier() - mod) > 0.001) {
      say('"' + name + '": ' + z.name + ' x' + hit.target.getBidModifier().toFixed(2) + ' -> x' + mod + '.');
      hit.target.setBidModifier(mod);
      changed = true;
    }
  });
  return changed;
}

/* ------------------------------------------------------------- reset */

function resetAll(say) {
  Object.keys(CONFIG.WEATHER_CAMPAIGNS).forEach(function (name) {
    var c = findCampaign(name);
    if (c && c.isEnabled()) { c.pause(); say('"' + name + '": paused.'); }
  });
  Object.keys(CONFIG.BID_CAMPAIGNS).forEach(function (name) {
    var c = findCampaign(name);
    if (!c) return;
    proximities(c).forEach(function (e) {
      if (Math.abs(e.target.getBidModifier() - 1) > 0.001) { e.target.setBidModifier(1); }
    });
    say('"' + name + '": every radius target back to +0%.');
  });
}

/* ----------------------------------------------------------- helpers */

function findCampaign(name) {
  var it = AdsApp.campaigns()
    .withCondition("campaign.name = '" + name.replace(/'/g, "\\'") + "'")
    .withCondition("campaign.status != REMOVED")
    .get();
  return it.hasNext() ? it.next() : null;
}

function proximities(campaign) {
  var out = [];
  var it = campaign.targeting().targetedProximities().get();
  while (it.hasNext()) {
    var p = it.next();
    out.push({ target: p, lat: p.getLatitude(), lng: p.getLongitude(), radius: p.getRadius(), units: p.getRadiusUnits(), keep: false });
  }
  return out;
}

/** The existing proximity target at this zone's centre and radius, if any. */
function matchPoint(existing, w) {
  for (var i = 0; i < existing.length; i++) {
    var e = existing[i];
    var km = e.units === 'MILES' ? e.radius * 1.609 : e.radius;
    if (Math.abs(e.lat - w.lat) < SAME_POINT && Math.abs(e.lng - w.lng) < SAME_POINT && Math.abs(km - w.radius) < 0.5) return e;
  }
  return null;
}

function notify(subject, log) {
  if (!CONFIG.EMAIL) return;
  MailApp.sendEmail(CONFIG.EMAIL, subject, log.join('\n') + '\n\nPortal: https://www.advancedgas.com.au/portal/marketing/weather');
}
