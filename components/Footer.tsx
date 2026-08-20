import { HeartHandshake } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t border-slate-200 bg-white px-4 py-5 text-center">
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-1.5 text-xs text-slate-400">
        <HeartHandshake className="h-3.5 w-3.5 text-accent-500" />
        พัฒนาโดย ทานแต่ของสะอาด
      </div>
    </footer>
  );
}
