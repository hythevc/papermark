import {
  ArrowUpRight,
  FolderOpen,
  KeyRound,
  MousePointer2,
} from "lucide-react";

import { BRAND } from "@/lib/brand";

/** Product benefits, without inherited customer testimonials or endorsements. */
export function AuthSidePanel() {
  return (
    <aside className="relative hidden w-[45%] flex-col justify-between overflow-hidden bg-[#123f36] px-10 py-12 text-white md:flex lg:px-16">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-100/70">
        A clearer path to your next deal
      </p>
      <div className="my-12 max-w-md">
        <ArrowUpRight
          className="mb-8 h-12 w-12 text-[#c0e3b4]"
          strokeWidth={1.4}
        />
        <h2 className="text-4xl font-medium leading-[1.15] tracking-tight lg:text-5xl">
          {BRAND.tagline}
        </h2>
        <p className="mt-6 max-w-sm text-base leading-7 text-emerald-50/75">
          One place to organize the details, share with confidence, and
          understand what comes next.
        </p>
        <ul className="mt-12 space-y-5 text-sm text-emerald-50/90">
          {[
            { Icon: FolderOpen, text: "Bring the right documents together" },
            { Icon: KeyRound, text: "Choose who gets access" },
            { Icon: MousePointer2, text: "See where attention goes" },
          ].map(({ Icon, text }) => (
            <li key={text} className="flex items-center gap-3">
              <Icon className="h-4 w-4 text-[#c0e3b4]" aria-hidden="true" />
              {text}
            </li>
          ))}
        </ul>
      </div>
      <p className="text-xs text-emerald-100/60">
        {BRAND.name} · Built for the conversations that matter.
      </p>
    </aside>
  );
}
