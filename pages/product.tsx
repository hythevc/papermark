import Link from "next/link";

import {
  MarketingCTA,
  MarketingShell,
} from "@/components/marketing/marketing-shell";
import styles from "@/components/marketing/marketing-shell.module.css";
import { ProductPreview } from "@/components/marketing/product-preview";
import { Button } from "@/components/ui/button";

export default function ProductPage() {
  return (
    <MarketingShell
      title="A clearer way to share documents"
      description="Organize documents, choose your sharing controls, and follow viewer activity in one Roomline workspace."
      path="/product"
    >
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <h1>The documents are only the beginning.</h1>
          <p>
            A good room helps people find the right information, understand what
            they can access, and keep a conversation moving.
          </p>
          <div className={styles.heroActions}>
            <Button asChild className={styles.primaryButton}>
              <Link href="/register">Create workspace</Link>
            </Button>
            <Button asChild variant="outline" className={styles.outlineButton}>
              <Link href="/guides/sharing-checklist">
                Explore the sharing checklist
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="preview-heading">
        <div className={styles.sectionHeader}>
          <h2 id="preview-heading">Explore the room before you create one.</h2>
          <p>
            This preview uses sample data. Explore documents, sharing links, and
            visitor activity without uploading files or changing a live
            workspace.
          </p>
        </div>
        <div className={styles.previewSurface}>
          <ProductPreview />
        </div>
      </section>

      <section className={styles.section} aria-labelledby="workflow-heading">
        <div className={styles.sectionHeader}>
          <h2 id="workflow-heading">
            One workspace, from preparation to follow-up.
          </h2>
          <p>
            Roomline brings the documents and their sharing workflow together.
            Start with the material a reader needs, then keep the access and
            next conversation in view.
          </p>
        </div>
        <div className={styles.featureRows}>
          <div className={styles.featureRow}>
            <h3>Make the material easy to navigate</h3>
            <div>
              <p>
                Group related documents in rooms and folders. Use names that
                explain the contents and period covered, so readers can find a
                starting point without asking which attachment is current.
              </p>
              <Link href="/guides/fundraising-checklist">
                Prepare a room people can navigate
              </Link>
            </div>
          </div>
          <div className={styles.featureRow}>
            <h3>Share deliberately</h3>
            <div>
              <p>
                Review the destination and access settings for a link before it
                leaves your workspace. Depending on your plan and deployment,
                controls may include recipient requirements, passwords,
                expiration, and download settings.
              </p>
              <Link href="/security">Understand the sharing controls</Link>
            </div>
          </div>
          <div className={styles.featureRow}>
            <h3>Bring context to the next conversation</h3>
            <div>
              <p>
                Use available visitor and document activity to see where
                attention has gone. Confirm questions and completion directly: a
                view is an engagement signal, not an investment decision or an
                approval.
              </p>
              <Link href="/solutions/due-diligence">
                Coordinate a clearer review
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="use-cases-heading">
        <div className={styles.sectionHeader}>
          <h2 id="use-cases-heading">
            Built around the work behind a decision.
          </h2>
          <p>
            The same document can support a first conversation or a detailed
            review. Give each audience the context and access that fits the
            stage.
          </p>
        </div>
        <div className={styles.cards}>
          <div className={styles.infoCard}>
            <h3>Fundraising</h3>
            <p>
              Bring the materials behind your pitch into a room that investors
              can understand. Keep current versions and follow-up questions
              connected.
            </p>
            <Link className={styles.textLink} href="/solutions/fundraising">
              Explore fundraising
            </Link>
          </div>
          <div className={styles.infoCard}>
            <h3>Due diligence</h3>
            <p>
              Organize evidence for a review, check the audience for each shared
              link, and make it easier for advisers and reviewers to find what
              they need.
            </p>
            <Link className={styles.textLink} href="/solutions/due-diligence">
              Explore due diligence
            </Link>
          </div>
        </div>
      </section>
      <MarketingCTA />
    </MarketingShell>
  );
}
