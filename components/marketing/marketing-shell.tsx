import Head from "next/head";
import Image from "next/image";
import Link from "next/link";

import { type ReactNode, useRef } from "react";

import { ChevronDown } from "lucide-react";

import { BRAND } from "@/lib/brand";

import { Button } from "@/components/ui/button";

import styles from "./marketing-shell.module.css";

const navigation = [
  { label: "Product", href: "/product" },
  { label: "Solutions", href: "/solutions/fundraising" },
  { label: "Security", href: "/security" },
  { label: "Guides", href: "/guides" },
];

export function MarketingHeader({
  activePath = "",
  contentId = "main-content",
  className = "",
}: {
  activePath?: string;
  contentId?: string;
  className?: string;
}) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const isActive = (href: string) =>
    href.startsWith("/solutions")
      ? activePath.startsWith("/solutions")
      : href === "/guides"
        ? activePath.startsWith("/guides")
        : activePath === href;

  const closeMenu = () => {
    if (menuRef.current) menuRef.current.open = false;
  };

  return (
    <>
      <a
        href={`#${contentId}`}
        className={`${styles.theme} ${styles.skipLink}`}
      >
        Skip to content
      </a>
      <header className={`${styles.theme} ${styles.header} ${className}`}>
        <Link
          href="/"
          className={styles.wordmark}
          aria-label={`${BRAND.name} home`}
        >
          <Image src={BRAND.mark} width={30} height={30} alt="" />
          <span>{BRAND.name}</span>
        </Link>
        <nav className={styles.desktopNav} aria-label="Main navigation">
          {navigation.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className={styles.headerActions}>
          <Link href="/login" className={styles.signIn}>
            Sign in
          </Link>
          <Button
            asChild
            className={`${styles.primaryButton} ${styles.desktopCreate}`}
          >
            <Link href="/register">Create workspace</Link>
          </Button>
          <details
            ref={menuRef}
            className={styles.mobileMenu}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                closeMenu();
                summaryRef.current?.focus();
              }
            }}
          >
            <summary ref={summaryRef}>
              Menu <ChevronDown size={16} aria-hidden="true" />
            </summary>
            <nav aria-label="Mobile navigation" className={styles.mobileLinks}>
              {navigation.map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={closeMenu}
                  aria-current={isActive(href) ? "page" : undefined}
                >
                  {label}
                </Link>
              ))}
              <Link href="/solutions/due-diligence" onClick={closeMenu}>
                Due diligence
              </Link>
              <Link href="/login" onClick={closeMenu}>
                Sign in
              </Link>
              <Button asChild className={styles.primaryButton}>
                <Link href="/register" onClick={closeMenu}>
                  Create workspace
                </Link>
              </Button>
            </nav>
          </details>
        </div>
      </header>
    </>
  );
}

export function MarketingFooter({ className = "" }: { className?: string }) {
  return (
    <footer className={`${styles.theme} ${styles.footer} ${className}`}>
      <div className={styles.footerIntro}>
        <Link
          href="/"
          className={styles.wordmark}
          aria-label={`${BRAND.name} home`}
        >
          <Image src={BRAND.mark} width={30} height={30} alt="" />
          <span>{BRAND.name}</span>
        </Link>
        <p>{BRAND.tagline}</p>
      </div>
      <nav className={styles.footerNav} aria-label="Footer navigation">
        <Link href="/product">Product</Link>
        <Link href="/solutions/fundraising">Fundraising</Link>
        <Link href="/solutions/due-diligence">Due diligence</Link>
        <Link href="/security">Security</Link>
        <Link href="/guides">Guides</Link>
        <a href="https://github.com/hythevc/papermark">
          Source &amp; attribution
        </a>
        {BRAND.supportEmail && (
          <a href={`mailto:${BRAND.supportEmail}`}>Contact</a>
        )}
        {BRAND.termsUrl && <a href={BRAND.termsUrl}>Terms</a>}
        {BRAND.privacyUrl && <a href={BRAND.privacyUrl}>Privacy</a>}
      </nav>
      <p className={styles.copyright}>
        © {new Date().getFullYear()} {BRAND.name}
      </p>
    </footer>
  );
}

export function MarketingShell({
  title,
  description,
  path,
  children,
}: {
  title: string;
  description: string;
  path: string;
  children: ReactNode;
}) {
  const pageTitle = `${title} | ${BRAND.name}`;
  const canonical = new URL(path, BRAND.marketingUrl).toString();
  return (
    <div className={`roomline-marketing ${styles.theme} ${styles.site}`}>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={description} key="description" />
        <meta property="og:title" content={pageTitle} key="og-title" />
        <meta
          property="og:description"
          content={description}
          key="og-description"
        />
        <meta property="og:url" content={canonical} key="og-url" />
        <meta name="twitter:title" content={pageTitle} key="tw-title" />
        <meta
          name="twitter:description"
          content={description}
          key="tw-description"
        />
        <link rel="canonical" href={canonical} key="canonical" />
      </Head>
      <MarketingHeader activePath={path} />
      <main id="main-content" className={styles.main}>
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}

export function MarketingCTA({
  title = "Give your next conversation a home.",
  description = "Bring the documents together. Choose how you share them. Keep the next step in sight.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <section className={styles.cta} aria-label="Create your workspace">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <Button asChild className={styles.lightButton}>
        <Link href="/register">Create workspace</Link>
      </Button>
    </section>
  );
}
