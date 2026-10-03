/**
 * The trade portal while the server is still working: the header and the
 * panel, drawn empty, so the screen doesn't flash white between pages.
 */
export default function TradeLoading() {
  return (
    <div className="tr" data-no-reveal aria-busy="true">
      <header className="tr__head"><span className="tr-skel tr-skel--title" /></header>
      <main className="tr__panel">
        <div className="tr__inner">
          <p className="tr-sr" role="status">Loading…</p>
          <span className="tr-skel tr-skel--panel" />
          <span className="tr-skel tr-skel--panel" style={{ height: 120 }} />
        </div>
      </main>
    </div>
  );
}
