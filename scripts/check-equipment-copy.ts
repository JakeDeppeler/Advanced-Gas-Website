/**
 * The equipment wording (src/lib/pricebook/equipmentCopy.ts), Jake 17 Nov:
 * every unit on a quote says how it saves money, its key features, why it
 * beats the brand or model below it, and its warranty, then ours.
 *
 *   npx tsx scripts/check-equipment-copy.ts
 */
import { EQUIPMENT_LABELS, WORKMANSHIP, equipmentCopy } from "../src/lib/pricebook/equipmentCopy";

let bad = 0;
const ok = (name: string, pass: boolean, extra: unknown = "") => {
  console.log(`${pass ? "ok   " : "FAIL "} ${name}${extra === "" ? "" : `  ${JSON.stringify(extra)}`}`);
  if (!pass) bad++;
};

// Every unit on the office's quote templates (pricebook names and models, 17 Nov).
const UNITS: [string, string][] = [
  ["Mitsubishi Electric 2.5kw Split System", "MSZAP25VGKD2KIT"], ["Mitsubishi Electric 3.5kw Split System", "MSZAP35VGKD2KIT"], ["Mitsubishi Electric 5kw Split System ", "MSZAP50VGKD2KIT"],
  ["Mitsubishi Electric 6kw Split System  ", "MSZAP60VGKD2KIT"], ["Mitsubishi Electric 7.1kw Split System   ", "MSZAP70VGKD2KIT"],
  ["Mitsubishi Electric 2.5kw Indoor Head", "MSZ-AP25VGKD2-A2"], ["Mitsubishi Electric 7.1kw Indoor Head ", "MSZ-AP71VGKD2-A2"],
  ["Mitsubishi Electric 8kw Multi Condenser", "MXZ-4F80VGD-A2"], ["Mitsubishi Electric 12kw Multi Condenser ", "MXZ-6F120VGD-A2"],
  ["Mitsubishi Electric 12kw Ducted Split", "PEAZM125VHAA2MAKIT"], ["Mitsubishi Electric 18kw Ducted Split", "PEAZM180VLAAMAAKIT"],
  ["Kaden KSI 2.5kw V3 Split Air Conditioner ", "KSI 2.6 V3"], ["Kaden KSI 7kw V3 Split Air Conditioner", "KSI 7 V3"], ["Kaden KSI 2.6kw Indoor", "KSI-2.5"],
  ["Kaden 13kw Multi Condenser", "KM48"], ["Kaden Multi Condenser KM60", "KM60"], ["Kaden Ducted Split 17kW V2", "KDI-17-v2"],
  ["Kaden Window Air Conditioner kW09", "KW09"], ["Kaden Window Air Conditioner kW12 R32 3.9kW", "KW12"],
  ["Rinnai RPX 2.5kw Indoor\t", "HINRPX25M"], ["Rinnai Multi Condenser 11kw", "MON4H11B1LA"], ["Rinnai Multi Condenser 19kw", "MON6H19B1TA"],
  ["  Zonemate Touch Pro Bundle + 4 Wireless Sensors", "Zonemate Touch Pro"],
  ["Reclaim Split - Glass Lined - 315L V2 (WIFI) ", "REHP-CO2-315-GL-V2"], ["Reclaim Split - Glass Lined - 160L V1 ", "REHP-CO2-160-GL"],
  ["Reclaim Split - Stainless Steel - 250L V2   (Earth Worker)", "REHP-CO2-250-SS-V2"], ["Reclaim Split - Stainless Steel - 315L V2 (Duplex)", "REHP-CO2-315DX-V2"],
  ["Reclaim x Panasonic - Glass Lined - 250L 4kw", "HE-UM40CR-PHE-250AGR"], ["Reclaim x Panasonic - Stainless Steel - 315L  6kw", "HE-UM60CR-PHE-315AGR"],
  ["Reclaim Heat Pump 300L - Plug In ", "R290 300L"], ["Thermann Heat Pump 285L - Plug In ", "300THC25P"], ["IStore Heat Pump 270L  ", "IStore 270L"],
  ["Thermann 170L Gas Storage", "4 Star 170L Storage"], ["Thermann Smart Electric Storage 125L 3kw", "1361442"],
  ["Thermann G-Series 26L 50 degree Natural Gas Continuous Flow Hot Water System", ""],
  ["Brivis Buffalo 3 Star 26kW", "Buffalo BX326CNG"], ["Brivis Buffalo 5 Star 26kW", "Buffalo BX526CNGV3"], ["Brivis Classic 2P Wombat 20NG ", "Wombat 2PW20NNG"],
  ["Brivis Compact Classic Natural Gas 19kW with Manual Controller", "Compact CC320INGV2"], ["Brivis Starpro SP615in V4", "Starpro SP615in V4"], ["Braemar TQM618NG ", " TQM618NG \t"],
  ["Kaden Ducted Heater 3 Star KN315 Internal With Manual Controller Natural Gas 15kW", ""], ["Kaden Ducted Heater 3 Star KUN320", "KUN320"],
  ["Braemar Dominator Series 3 18kw - Internal", "Dominator S3 Internal KCDB195D1B"], ["Braemar Dominator Series 3 - External", "Dominator S3 External KGHV200A1S"],
  ["Brivis Advance F46DS Evap Cooler (Charcoal)", "Advance F46DS Charcoal"], ["Brivis Advanced Dump F86DS Evaporative Cooler Char", "F86DS"],
  ["Brivis Promina P56 Evap Cooler (Beige)", "P56"], ["Brivis Contour L46 Evaporative Cooler (T'cotta Red)", "Contour L46 Red"], ["Brivis Contour L77 Evap Cooler (Beige)", "Contour L77 Beige"],
  ["Brivis Balaero 70 Evap Cooler (Charcoal)", "Balaero 70 Charcoal"], ["Kaden Evaporative Cooler Classic KC32 Charcoal", "KC32"],
  ["Bosch Series 4 60cm Gas Cooktop with Wok Burner", "PNK6B6K40A"], ["Beko 60Cm Stainless Steel Gas Cooktop ", "BCT60GX1"],
  ["Westinghouse 60cm 4 Burner Natural Gas Cooktop – Stainless Steel", "WHG644SC"], ["Bosch 53cm Series 4 Under Cupboard Rangehood", "DHL555BAU"],
];
const copies = UNITS.map(([name, model]) => ({ name, model, c: equipmentCopy({ name, model }) }));
ok("every unit on a quote template has its description", copies.every((x) => x.c), copies.filter((x) => !x.c).map((x) => x.name));
const LABELS = Object.values(EQUIPMENT_LABELS);
const texts = copies.filter((x) => x.c).map((x) => ({ name: x.name, family: x.c!.family, t: x.c!.text, paras: x.c!.text.split("\n\n") }));
ok("each is the unit's name, then the four labelled parts in order", texts.every((x) => x.paras.length === 5 && LABELS.every((l, k) => x.paras[k + 1].startsWith(l))), texts.filter((x) => x.paras.length !== 5).map((x) => x.name));
ok("each ends with our 6-year workmanship warranty", texts.every((x) => x.t.endsWith(WORKMANSHIP)));
ok("no prices, sales or anything left unconfirmed", texts.every((x) => !/\$\d[\d,]*(?!\s*a year)|on sale|RRP|UNCONFIRMED|\{|\}/i.test(x.t.replace(/\$\d+ a year/g, ""))), texts.filter((x) => /on sale|RRP|UNCONFIRMED|\{|\}/i.test(x.t)).map((x) => x.name));
ok("no install scope on the unit: that's the summary's", texts.every((x) => !/removal of your old|includes installation|supply and installation/i.test(x.t)));
ok("no hype words", texts.every((x) => !/\b(ultimate|best-in-class|revolutionary|perfect)\b/i.test(x.t)));
const words = texts.map((x) => ({ name: x.name, n: x.t.split(/\s+/).length }));
ok("short enough to read on a quote (under 190 words)", words.every((w) => w.n < 190), words.filter((w) => w.n >= 190));

const by = (name: string) => texts.find((x) => x.name.trim() === name.trim())!;
ok("the titles use the maker's real outputs: the '26kW' Buffalos are 28 and 30kW", /Buffalo 28kW 3-star/.test(by("Brivis Buffalo 3 Star 26kW").t) && /Buffalo 30kW 5-star/.test(by("Brivis Buffalo 5 Star 26kW").t));
ok("Mitsubishi never claims a warranty edge", texts.filter((x) => x.family.startsWith("mitsubishi")).every((x) => !/longer warranty/i.test(x.t)) && /7-year warranty/.test(by("Kaden KSI 7kw V3 Split Air Conditioner").t));

// Jake, 25 Nov: "on the brand we should only talk about that brand, not compare
// it to other brands". A unit's words name its own maker only. The exceptions
// are where another name is part of the product, not a comparison: Reclaim's
// Panasonic-powered range, Kaden's warranty (serviced through Rinnai's network)
// and ZoneMate, which says which ducted systems it works with.
const BRANDS: [string, RegExp][] = [
  ["mitsubishi", /Mitsubishi/i], ["kaden", /Kaden/i], ["rinnai", /Rinnai/i], ["zonemate", /Zone ?Mate/i], ["reclaim", /Reclaim/i], ["panasonic", /Panasonic/i],
  ["thermann", /Thermann/i], ["istore", /iStore/i], ["brivis", /Brivis/i], ["braemar", /Braemar/i], ["seeley", /Seeley/i], ["bosch", /Bosch/i],
  ["beko", /Beko/i], ["westinghouse", /Westinghouse/i], ["daikin", /Daikin/i], ["fujitsu", /Fujitsu/i], ["rheem", /Rheem/i], ["dux", /\bDux\b/], ["breezair", /Breezair/i], ["coolair", /Coolair/i],
];
const ALLOWED: Record<string, string[]> = { "reclaim-x-panasonic": ["panasonic"], "zonemate-touch-pro": ["mitsubishi", "kaden"] };
const ownBrand = (family: string) => BRANDS.map(([b]) => b).filter((b) => family.startsWith(b) || family.includes(b));
const others = texts.map((x) => ({ name: x.name.trim(), family: x.family, hits: BRANDS.filter(([b, re]) => re.test(x.t) && !ownBrand(x.family).includes(b) && !(ALLOWED[x.family] ?? []).includes(b) && !(b === "rinnai" && x.family.startsWith("kaden") && /Rinnai service/.test(x.t))).map(([b]) => b) })).filter((x) => x.hits.length);
ok("each unit talks about its own brand only, no comparison with another", others.length === 0, others);
ok("same-brand comparisons stay: Buffalo 3-star against 5-star", /Compared with the 5-star Buffalo/.test(by("Brivis Buffalo 3 Star 26kW").t));
ok("the KM60 is a multi-split, not the ducted text it had", /multi-split outdoor unit, for up to 6 rooms/.test(by("Kaden Multi Condenser KM60").t));
ok("the StarPro says StarPro, not the Ecostar text it had", /StarPro 6/.test(by("Brivis Starpro SP615in V4").t) && !/Ecostar/.test(by("Brivis Starpro SP615in V4").t));
ok("the Bosch cooktop lost its 'on sale' line", !/sale/i.test(by("Bosch Series 4 60cm Gas Cooktop with Wok Burner").t));
ok("the Promina's winter seal is an add-on, the Advance's and Contour's built in", /winter seal is available as an add-on/.test(by("Brivis Promina P56 Evap Cooler (Beige)").t) && /Motorised winter seal/.test(by("Brivis Advance F46DS Evap Cooler (Charcoal)").t));
ok("colours read the same however the pricebook spells them", /L46 slimline evaporative cooler, Terra Red/.test(by("Brivis Contour L46 Evaporative Cooler (T'cotta Red)").t) && /F86DS evaporative cooler, Charcoal/.test(by("Brivis Advanced Dump F86DS Evaporative Cooler Char").t));
ok("the Contour 7 gets its own words, not the standard Contour's", by("Brivis Contour L77 Evap Cooler (Beige)").family === "brivis-contour-7");
ok("the V1 Reclaim makes no wifi or 10-year heat pump claim", !/wifi|10 years parts and labour/i.test(by("Reclaim Split - Glass Lined - 160L V1 ").t.replace("adds app control", "")));
ok("the Rinnai 11kW condenser carries no figures until its part is confirmed", !/\d+(\.\d+)?kW cooling/.test(by("Rinnai Multi Condenser 11kw").t));
ok("nothing is described that isn't on the list", equipmentCopy({ name: "Mechanical Services - Equipment" }) === null);

console.log(bad ? `\n${bad} failed` : "\nall passed");
process.exit(bad ? 1 : 0);
