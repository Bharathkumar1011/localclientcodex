type Props = {
  name?: string | null;
  designation?: string | null;
  email?: string | null;
  phone?: string | null;
  emptyLabel?: string;
};

export function PocDetailsCell({
  name,
  designation,
  email,
  phone,
  emptyLabel = "No POC details",
}: Props) {
  const hasAnyValue = !!name || !!designation || !!email || !!phone;

  if (!hasAnyValue) {
    return <span className="text-xs italic text-muted-foreground">{emptyLabel}</span>;
  }

  return (
    <div className="min-w-[180px] space-y-2 rounded-lg border bg-slate-50 p-3 text-xs">
      {name && <p className="font-medium text-foreground">{name}</p>}

      {designation && <p className="text-muted-foreground">{designation}</p>}

      <div className="space-y-1">
        {email && (
          <p className="break-all rounded bg-white px-2 py-1 text-muted-foreground">
            {email}
          </p>
        )}

        {phone && (
          <p className="rounded bg-white px-2 py-1 text-muted-foreground">{phone}</p>
        )}
      </div>
    </div>
  );
}