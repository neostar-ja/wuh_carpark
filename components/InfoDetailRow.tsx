type Props = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
};

export function InfoDetailRow({ icon: Icon, label, value }: Props) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-wuh-50 text-wuh-600">
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <div className="min-w-0 py-0.5">
        <p className="text-[11px] font-medium uppercase leading-[1.8] tracking-wide text-slate-400">
          {label}
        </p>
        <p className="break-words text-sm font-semibold leading-[1.8] text-slate-800">{value || "-"}</p>
      </div>
    </div>
  );
}
