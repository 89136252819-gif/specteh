export default function StaffLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-3 w-28 rounded-full bg-slate-200" />
        <div className="h-8 w-56 max-w-full rounded-2xl bg-slate-200" />
        <div className="h-4 w-72 max-w-full rounded-full bg-slate-100" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div className="h-24 rounded-3xl bg-white ring-1 ring-slate-200/80" key={item} />
        ))}
      </div>
      <div className="rounded-3xl bg-white p-4 ring-1 ring-slate-200/80">
        <div className="mb-4 h-10 max-w-sm rounded-2xl bg-slate-100" />
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((item) => (
            <div className="h-14 rounded-2xl bg-slate-50" key={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
