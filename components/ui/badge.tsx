import * as React from "react";

import { type VariantProps, cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex min-w-0 max-w-full items-center gap-1 rounded-md border px-2.5 py-0.5 text-xs font-medium leading-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
        time: "border-transparent bg-[hsl(var(--status-warning-bg))] text-[hsl(var(--status-warning-fg))]",
        email:
          "border-transparent bg-[hsl(var(--status-info-bg))] text-[hsl(var(--status-info-fg))]",
        password: "border-transparent bg-secondary text-secondary-foreground",
        preview:
          "border-transparent bg-[hsl(var(--status-success-bg))] text-[hsl(var(--status-success-fg))]",
        download:
          "border-transparent bg-[hsl(var(--status-warning-bg))] text-[hsl(var(--status-warning-fg))]",
        watermark: "border-transparent bg-secondary text-secondary-foreground",
        notification:
          "px-1.5 rounded-sm bg-secondary text-secondary-foreground border-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
