export default function Loading() {
  return (
    <div className="animate-pulse" aria-busy aria-label="Loading">
      <div className="mb-2 h-7 w-56 rounded-lg bg-subtle" />
      <div className="mb-8 h-4 w-80 max-w-full rounded bg-subtle" />
      <div className="grid auto-rows-[150px] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-subtle sm:col-span-2 sm:row-span-2" />
        <div className="rounded-2xl bg-subtle sm:col-span-2 sm:row-span-2" />
        <div className="rounded-2xl bg-subtle sm:col-span-2" />
        <div className="rounded-2xl bg-subtle sm:col-span-2" />
      </div>
    </div>
  );
}
