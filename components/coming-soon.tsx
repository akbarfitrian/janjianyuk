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
      <h1 className="text-xl font-semibold text-neutral-900">{title}</h1>
      <div className="mt-6 rounded-lg border border-dashed border-neutral-300 p-8 text-center">
        <p className="text-sm font-medium text-neutral-900">
          Belum dibangun — {fase}
        </p>
        <p className="mt-2 text-sm text-neutral-500">{description}</p>
      </div>
    </div>
  );
}
