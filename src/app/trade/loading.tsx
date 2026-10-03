/**
 * The trade portal while the server is still working — see the office portal's
 * loading page for why this exists. The rail is drawn empty rather than with
 * its eleven links, because which of them are lit depends on the page.
 */
export default function TradeLoading() {
  return (
    <div className="tr" data-no-reveal aria-busy="true">
      <nav className="tr__rail" aria-hidden="true" />
      <div className="tr__main">
        <header className="tr__head"><span className="tr-skel tr-skel__h" /></header>
        <main className="tr-skel__body">
          <p className="tr-sr" role="status">Loading…</p>
          <span className="tr-skel tr-skel__panel" />
          <span className="tr-skel tr-skel__panel tr-skel__panel--short" />
        </main>
      </div>
    </div>
  );
}
