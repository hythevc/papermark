import Link from "next/link";

import { GUIDES } from "@/lib/marketing-content";

import {
  MarketingCTA,
  MarketingShell,
} from "@/components/marketing/marketing-shell";
import styles from "@/components/marketing/marketing-shell.module.css";

export default function GuidesPage() {
  return (
    <MarketingShell
      title="Practical guides for a clearer review"
      description="Checklists for preparing a fundraising room and sharing document links with a clear audience, scope, and next step."
      path="/guides"
    >
      <section className={styles.hero}>
        <h1>Prepare well. Share deliberately.</h1>
        <p>
          Practical guides for the work around your documents: choosing the
          material, checking access, and closing the loop with the people
          reviewing it.
        </p>
      </section>
      <section className={styles.section} aria-label="Roomline guides">
        <div className={styles.guideGrid}>
          {GUIDES.map(({ slug, title, summary, category }) => (
            <Link
              href={`/guides/${slug}`}
              key={slug}
              className={styles.guideCard}
            >
              <span className={styles.guideCategory}>{category}</span>
              <h2>{title}</h2>
              <p>{summary}</p>
              <span className={styles.textLink}>Read guide</span>
            </Link>
          ))}
        </div>
      </section>
      <MarketingCTA
        title="Put the preparation into practice."
        description="Create a home for your documents and the conversations they support."
      />
    </MarketingShell>
  );
}
