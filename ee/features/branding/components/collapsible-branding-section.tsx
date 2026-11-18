import { type ReactNode } from "react";

import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export function CollapsibleBrandingSection({
  title,
  defaultOpen = false,
  children,
  disabled = false,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      disabled={disabled}
      className="min-w-0"
    >
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          disabled={disabled}
          className="group w-full justify-between border border-border bg-card px-4 text-left"
        >
          {title}
          <ChevronDown
            aria-hidden="true"
            className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180"
          />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4">{children}</CollapsibleContent>
    </Collapsible>
  );
}
