import type { GetStaticPaths, GetStaticProps } from "next";
import Link from "next/link";

import { GUIDES, type MarketingGuide } from "@/lib/marketing-content";

import {
  MarketingCTA,
  MarketingShell,
} from "@/components/marketing/marketing-shell";
import styles from "@/components/marketing/marketing-shell.module.css";
import { Button } from "@/components/ui/button";

export default function GuidePage({ guide }: { guide: MarketingGuide }) {
  return (
    <MarketingShell
      title={guide.title}
      description={guide.summary}
      path={`/guides/${guide.slug}`}
    >
      <header className={styles.articleHero}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/guides">Guides</Link>
          <span aria-hidden="true">/</span>
          <span>{guide.category}</span>
        </nav>
        <h1>{guide.title}</h1>
        <p>{guide.summary}</p>
        <Button
          type="button"
          variant="outline"
          onClick={() => window.print()}
          className={`${styles.outlineButton} ${styles.printAction}`}
        >
          Print guide
        </Button>
      </header>
      <div className={styles.articleLayout}>
        <nav className={styles.toc} aria-label="In this guide">
          <h2>In this guide</h2>
          <ul>
            {guide.sections.map(({ id, title }) => (
              <li key={id}>
                <a href={`#${id}`}>{title}</a>
              </li>
            ))}
          </ul>
        </nav>
        <article className={styles.article} aria-label={guide.title}>
          {guide.sections.map(({ id, title, paragraphs, checklist }) => (
            <section id={id} key={id} aria-labelledby={`${id}-title`}>
              <h2 id={`${id}-title`}>{title}</h2>
              {paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {checklist && (
                <ul>
                  {checklist.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
          <Link href="/guides" className={styles.textLink}>
            Explore the other guides
          </Link>
        </article>
      </div>
      <MarketingCTA />
    </MarketingShell>
  );
}

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: GUIDES.map(({ slug }) => ({ params: { slug } })),
  fallback: false,
});
export const getStaticProps: GetStaticProps = async ({ params }) => {
  const guide = GUIDES.find(({ slug }) => slug === params?.slug);
  return guide ? { props: { guide } } : { notFound: true };
};
