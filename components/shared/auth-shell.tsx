import Link from "next/link";

import type { ReactNode } from "react";

import { ArrowLeft } from "lucide-react";

import { BRAND } from "@/lib/brand";

import styles from "./auth-shell.module.css";
import { AuthSidePanel } from "./auth-side-panel";
import { BrandLogo } from "./brand-logo";

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <div className={styles.main}>
        <header>
          <Link href={BRAND.marketingUrl} aria-label={`${BRAND.name} home`}>
            <BrandLogo />
          </Link>
          <Link href={BRAND.marketingUrl} className={styles.back}>
            <ArrowLeft size={15} aria-hidden="true" />
            Back to product
          </Link>
        </header>
        <section className={styles.content} aria-labelledby="auth-heading">
          <div className={styles.heading}>
            <span>YOUR NEXT CONVERSATION STARTS HERE</span>
            <h1 id="auth-heading">{title}</h1>
            <p>{description}</p>
          </div>
          {children}
          {footer && <footer>{footer}</footer>}
        </section>
      </div>
      <AuthSidePanel />
    </div>
  );
}
