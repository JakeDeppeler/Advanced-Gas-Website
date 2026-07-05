import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="ftr">
      <div className="wrap ftr__grid">
        <div className="ftr__brand">
          <div
            className="ftr__logo"
            style={{ display: "inline-flex", alignItems: "center", background: "#fff", borderRadius: 8, padding: 6 }}
          >
            <Image
              src="/advanced-gas-logo.jpg"
              alt={`${site.name} logo`}
              width={220}
              height={110}
              style={{ height: 44, width: "auto" }}
            />
          </div>
          <p className="ftr__tag">
            Family-run gas, hot water &amp; aircon specialists.
            Pakenham locals since 2014.
          </p>
          <p className="ftr__nap">
            <strong>{site.name}</strong>
            <br />
            Pakenham, VIC 3810
            <br />
            <a href={`tel:${site.phoneE164}`}>{site.phone}</a> ·{" "}
            <a href={`mailto:${site.email}`}>{site.email}</a>
          </p>
          <p className="ftr__hours">
            <strong>Hours.</strong> Mon–Fri 7am–6pm · Sat 8am–2pm · 24/7 emergency
          </p>
        </div>

        <div className="ftr__col">
          <h4>Services</h4>
          <ul>
            <li><Link href="/services#heatpump">Heat pump hot water</Link></li>
            <li><Link href="/services#split">Split systems</Link></li>
            <li><Link href="/services#ducted">Ducted aircon</Link></li>
            <li><Link href="/services#gas-heating">Gas heating</Link></li>
            <li><Link href="/services#hotwater">Hot water</Link></li>
            <li><Link href="/services#service">Service &amp; safety</Link></li>
            <li><Link href="/services#commercial">Commercial</Link></li>
            <li><Link href="/contact#emergency">24/7 emergency</Link></li>
          </ul>
        </div>

        <div className="ftr__col">
          <h4>Rebates</h4>
          <ul>
            <li><Link href="/rebates">VEU explained</Link></li>
            <li><Link href="/rebates#calc">Eligibility check</Link></li>
            <li><Link href="/rebates#calc">Rebate calculator</Link></li>
            <li><Link href="/rebates#faq">Rebate FAQ</Link></li>
          </ul>
          <h4 style={{ marginTop: 24 }}>Company</h4>
          <ul>
            <li><Link href="/about">About</Link></li>
            <li><Link href="/blog">Blog &amp; guides</Link></li>
            <li><Link href="/contact">Contact</Link></li>
          </ul>
        </div>

        <div className="ftr__col">
          <h4>Service area</h4>
          <p className="ftr__suburbs">
            Pakenham · Officer · Beaconsfield · Berwick · Narre Warren · Cranbourne · Clyde ·
            Hampton Park · Hallam · Dandenong · Endeavour Hills · Lynbrook · Bunyip · Garfield ·
            Tynong · Drouin · Warragul · Emerald · Gembrook · Tooradin — within 50 km of Pakenham.
          </p>
        </div>
      </div>

      <div className="wrap ftr__bottom">
        <span>
          © {new Date().getFullYear()} {site.name} · ABN {site.abn} ·{" "}
          {site.licences.plumbing} · {site.licences.refrigeration}
        </span>
        <span className="ftr__partners">
          <span className="ftr-partner">VEU accredited</span>
          <span className="ftr-partner">Reece trade partner</span>
          <span className="ftr-partner">ARC authorised</span>
        </span>
      </div>
    </footer>
  );
}
