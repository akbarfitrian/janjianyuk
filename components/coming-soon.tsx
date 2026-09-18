export function ComingSoon({
  title,
  fase,
  description,
}: {
  title: string;
  fase: string;
  description: string;
}) {
  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">{title}</h1>
      <div className="mt-6 rounded-lg border border-dashed border-line-strong p-8 text-center">
        <p className="text-sm font-medium text-ink">
          Belum dibangun — {fase}
        </p>
        <p className="mt-2 text-sm text-ink-subtle">{description}</p>
      </div>
    </div>
  );
}
