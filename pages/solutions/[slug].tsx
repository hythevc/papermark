import type { GetStaticPaths, GetStaticProps } from "next";
import Link from "next/link";

import { GUIDES, SOLUTIONS, type SolutionPage } from "@/lib/marketing-content";

import {
  MarketingCTA,
  MarketingShell,
} from "@/components/marketing/marketing-shell";
import styles from "@/components/marketing/marketing-shell.module.css";
import { Button } from "@/components/ui/button";

export default function Solution({ solution }: { solution: SolutionPage }) {
  const guide = GUIDES.find(({ slug }) => slug === solution.relatedGuideSlug);
  const otherSolution = SOLUTIONS.find(({ slug }) => slug !== solution.slug);
  return (
    <MarketingShell
      title={
        solution.slug === "fundraising"
          ? "Data rooms for fundraising"
          : "Data rooms for due diligence"
      }
      description={solution.description}
      path={`/solutions/${solution.slug}`}
    >
      <section className={styles.hero}>
        <h1>{solution.title}</h1>
        <p>{solution.description}</p>
        <div className={styles.heroActions}>
          <Button asChild className={styles.primaryButton}>
            <Link href="/register">Create workspace</Link>
          </Button>
          {guide && (
            <Button asChild variant="outline" className={styles.outlineButton}>
              <Link href={`/guides/${guide.slug}`}>
                Read the preparation guide
              </Link>
            </Button>
          )}
        </div>
      </section>
      <section className={styles.section} aria-labelledby="approach-heading">
        <div className={styles.sectionHeader}>
          <h2 id="approach-heading">A useful room starts with the reader.</h2>
          <p>{solution.introduction}</p>
        </div>
        <div className={styles.featureRows}>
          {solution.outcomes.map(({ title, body }) => (
            <div className={styles.featureRow} key={title}>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </section>
      <section className={styles.section} aria-labelledby="checklist-heading">
        <h2 id="checklist-heading" className={styles.sectionTitle}>
          {solution.checklistTitle}
        </h2>
        <ul className={styles.checklist}>
          {solution.checklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        {guide && (
          <Link href={`/guides/${guide.slug}`} className={styles.textLink}>
            {guide.title}
          </Link>
        )}
      </section>
      {otherSolution && (
        <section className={styles.section} aria-labelledby="related-heading">
          <div className={styles.sectionHeader}>
            <h2 id="related-heading">
              When the conversation becomes a deeper review.
            </h2>
            <div>
              <p>
                Keep the same care for structure, audience, and current
                information as the work develops.
              </p>
              <Link
                href={`/solutions/${otherSolution.slug}`}
                className={styles.textLink}
              >
                Explore{" "}
                {otherSolution.slug === "fundraising"
                  ? "fundraising"
                  : "due diligence"}
              </Link>
            </div>
          </div>
        </section>
      )}
      <MarketingCTA />
    </MarketingShell>
  );
}

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: SOLUTIONS.map(({ slug }) => ({ params: { slug } })),
  fallback: false,
});
export const getStaticProps: GetStaticProps = async ({ params }) => {
  const solution = SOLUTIONS.find(({ slug }) => slug === params?.slug);
  return solution ? { props: { solution } } : { notFound: true };
};
