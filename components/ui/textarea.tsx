import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[100px] w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-base leading-relaxed text-foreground shadow-sm ring-offset-background transition-colors duration-150 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive motion-reduce:transition-none md:text-sm",
          className,
        )}
        ref={ref}
        data-1p-ignore
        {...props}
        data-slot="textarea"
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
