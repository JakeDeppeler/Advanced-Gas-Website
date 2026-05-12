export function TrustBar() {
  const items = [
    { label: "Licensed Plumbers & Refrigeration", icon: "✓" },
    { label: "VEU Rebate Approved", icon: "★" },
    { label: "6-Year Workmanship Warranty", icon: "🛡" },
    { label: "5★ Google Reviews", icon: "⭐" },
  ];
  return (
    <div className="border-y border-slate-100 bg-slate-50">
      <div className="container grid grid-cols-2 gap-4 py-6 md:grid-cols-4">
        {items.map((i) => (
          <div key={i.label} className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-50 text-brand-700">
              {i.icon}
            </span>
            {i.label}
          </div>
        ))}
      </div>
    </div>
  );
}
