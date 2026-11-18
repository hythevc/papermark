import * as React from "react";

import { Slot } from "@radix-ui/react-slot";
import { type VariantProps, cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

import LoadingSpinner from "./loading-spinner";

const buttonVariants = cva(
  "inline-flex min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium leading-5 ring-offset-background transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 motion-reduce:transition-none [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border border-transparent bg-primary text-primary-foreground hover:bg-primary/90",
        special: "text-white",
        orange:
          "border border-transparent bg-[hsl(var(--promotional))] text-[hsl(var(--promotional-foreground))] hover:bg-[hsl(var(--promotional-hover))]",
        destructive:
          "border border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "border border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      disabled,
      loading,
      asChild = false,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    const isDisabled = !!(disabled || loading);
    const stopActivation = (event: React.SyntheticEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };
    const disabledSlotProps = {
      "aria-disabled": true as const,
      tabIndex: -1,
      onClickCapture: stopActivation,
      onAuxClickCapture: stopActivation,
      onKeyDownCapture: (event: React.KeyboardEvent) => {
        if (event.key === "Enter" || event.key === " ") stopActivation(event);
      },
    };
    let content = children;
    if (asChild && React.isValidElement<Record<string, unknown>>(children)) {
      // Slot runs child handlers first. Guard the child itself so a disabled
      // link cannot navigate or invoke its callback before a parent guard.
      content = React.cloneElement(children, {
        ...(isDisabled ? disabledSlotProps : {}),
        ...(isDisabled && children.type === "button" ? { disabled: true } : {}),
        ...(loading ? { "aria-busy": true } : {}),
      });
    }
    return (
      <Comp
        {...props}
        {...(asChild && isDisabled ? disabledSlotProps : {})}
        className={cn(
          buttonVariants({ variant, size, className }),
          loading && "disabled:opacity-100 aria-disabled:opacity-100",
        )}
        ref={ref}
        disabled={asChild ? undefined : isDisabled}
        aria-busy={loading || props["aria-busy"]}
        data-slot="button"
        data-loading={loading || undefined}
      >
        {asChild ? (
          content
        ) : (
          <>
            {loading ? (
              <span aria-hidden="true">
                <LoadingSpinner className="h-5 w-5" />
              </span>
            ) : null}
            {children}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
