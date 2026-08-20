import { HeartHandshake } from "lucide-react";

export function Footer() {
  return (
    <footer className="mx-auto w-full max-w-md px-4 pb-8 pt-2 text-center">
      <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
        <HeartHandshake className="h-3.5 w-3.5 text-accent-500" />
        พัฒนาโดย ทานแต่ของสะอาด
      </div>
    </footer>
  );
}
