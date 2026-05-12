export function TrustBar() {
  const items = [
    { label: "Licensed Plumbing & Refrigeration", icon: "shield" },
    { label: "VEU Rebate Approved", icon: "star" },
    { label: "6-Year Workmanship Warranty", icon: "check" },
    { label: "5★ Google Reviews", icon: "rating" },
  ];
  return (
    <div className="border-b border-navy-50 bg-white">
      <div className="container">
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 py-6 md:grid-cols-4">
          {items.map((i) => (
            <div key={i.label} className="flex items-center gap-3 text-sm font-medium text-navy-700">
              <Icon name={i.icon} />
              {i.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Icon({ name }: { name: string }) {
  const wrap = "grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-cyan-50 to-cyan-100 text-cyan-600 ring-1 ring-cyan-100";
  switch (name) {
    case "shield":
      return (
        <span className={wrap}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-4z" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </span>
      );
    case "star":
      return (
        <span className={wrap}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" /></svg>
        </span>
      );
    case "check":
      return (
        <span className={wrap}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
        </span>
      );
    case "rating":
      return (
        <span className={wrap}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>
        </span>
      );
    default:
      return null;
  }
}
