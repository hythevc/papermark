"use client";

import {
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";

import { cn } from "@/lib/utils";

type ConversationSidebarContextValue = {
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
};

const ConversationSidebarContext =
  createContext<ConversationSidebarContextValue | null>(null);

export function useConversationSidebarSafe() {
  return useContext(ConversationSidebarContext);
}

/** Shared state keeps the viewer header, document and Q&A panel in sync. */
export function ConversationSidebarProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const value = useMemo(() => ({ isOpen, setIsOpen }), [isOpen]);

  return (
    <ConversationSidebarContext.Provider value={value}>
      {children}
    </ConversationSidebarContext.Provider>
  );
}

export function ConversationSidebarLayout({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const context = useConversationSidebarSafe();
  if (!context) return <>{children}</>;

  return (
    <div
      className={cn(
        "transition-[padding] duration-200 motion-reduce:transition-none",
        context.isOpen && "lg:pr-[400px]",
        className,
      )}
    >
      {children}
    </div>
  );
}
