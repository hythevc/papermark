import Head from "next/head";
import Link from "next/link";

import {
  ArrowRight,
  ArrowUpRight,
  Check,
  FileText,
  FolderClosed,
  LockKeyhole,
  Users,
} from "lucide-react";

import { BRAND } from "@/lib/brand";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

import { MarketingFooter, MarketingHeader } from "./marketing-shell";
import { ProductPreview } from "./product-preview";
import styles from "./roomline-home.module.css";

const steps = [
  {
    number: "01",
    title: "Give the deal a home.",
    text: "Bring the pitch, the numbers, and the details together in a room people can navigate.",
    icon: FolderClosed,
  },
  {
    number: "02",
    title: "Review before you share.",
    text: "Make a deliberate choice about the audience, verification, downloads, and expiration.",
    icon: LockKeyhole,
  },
  {
    number: "03",
    title: "Know where to look next.",
    text: "Use document views and room activity to bring context to your next conversation.",
    icon: Users,
  },
];
const questions = [
  {
    question: "What belongs in a data room?",
    answer:
      "A focused collection of materials for a specific conversation: a pitch deck and financial model for fundraising, or financial, legal, and commercial documents for diligence. Use folders and a clear index so guests can find what they need.",
  },
  {
    question: "Can I control who sees the documents?",
    answer:
      "Sharing links support access settings such as email verification, download restrictions, and expiration. Review the settings and your workspace plan before sharing. Your deployment administrator can confirm which controls are enabled.",
  },
  {
    question: "Does a document view mean an investor is interested?",
    answer:
      "A view is an engagement signal, not a commitment or a measure of investment intent. Use the activity as context alongside your own conversations and follow-up.",
  },
  {
    question: "Can I try the product preview?",
    answer:
      "Yes. Switch between the preview’s sections and search its sample files. It is an interactive illustration with sample data; it creates no workspace, shared link, or live permission change.",
  },
];
export function RoomlineHome() {
  return (
    <div className={`roomline-marketing ${styles.site}`}>
      <Head>
        <title>{`${BRAND.name} — Data rooms for your next deal`}</title>
        <meta
          name="description"
          content="Bring documents, sharing controls, and engagement into one focused data room. Make your next investor or diligence conversation easier to navigate."
          key="description"
        />
        <link rel="canonical" href={BRAND.marketingUrl} />
      </Head>
      <MarketingHeader />
      <main id="main-content">
        <section className={styles.hero} aria-labelledby="hero-title">
          <div>
            <span className={styles.eyebrow}>
              THE WORKSPACE BEHIND THE DEAL
            </span>
            <h1 id="hero-title">
              Every document. <br />
              Every decision. <br />
              One clear room.
            </h1>
          </div>
          <div className={styles.heroCopy}>
            <p>
              Organize deal documents, control access, and review visitor
              activity in one data room.
            </p>
            <div className={styles.heroActions}>
              <Button size="lg" asChild>
                <Link href="/register">
                  Create account
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/product">
                  Explore product
                  <ArrowUpRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
        <section
          className={styles.productStage}
          aria-label="Explore the Roomline product"
        >
          <ProductPreview />
        </section>
        <section className={styles.steps} aria-labelledby="workflow-title">
          <div className={styles.sectionLead}>
            <span className={styles.eyebrow}>FROM FIRST LOOK TO NEXT STEP</span>
            <h2 id="workflow-title">
              A clearer way through <br />
              the details.
            </h2>
            <Link href="/product" className={styles.textLink}>
              See the workflow
              <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
          </div>
          <div className={styles.stepList}>
            {steps.map(({ number, title, text, icon: Icon }) => (
              <article key={number}>
                <span className={styles.stepNumber}>{number}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
                <Icon aria-hidden="true" size={23} />
              </article>
            ))}
          </div>
        </section>
        <section className={styles.useCases} aria-labelledby="use-case-title">
          <div className={styles.sectionIntro}>
            <span className={styles.eyebrow}>
              ONE ROOM. A SHARED UNDERSTANDING.
            </span>
            <h2 id="use-case-title">
              Built around your <br />
              next milestone.
            </h2>
          </div>
          <div className={styles.useCaseGrid}>
            <article>
              <span className={styles.useCaseLabel}>FOR FOUNDERS</span>
              <h3>
                Your story, <br />
                ready for a closer look.
              </h3>
              <p>
                Give investors a focused place to explore the business, from the
                first deck to the supporting materials.
              </p>
              <ul>
                <li>
                  <Check size={16} aria-hidden="true" />
                  Organize the investment story
                </li>
                <li>
                  <Check size={16} aria-hidden="true" />
                  Review access before outreach
                </li>
                <li>
                  <Check size={16} aria-hidden="true" />
                  Follow up with more context
                </li>
              </ul>
              <Link href="/solutions/fundraising" className={styles.textLink}>
                Explore fundraising
                <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
            </article>
            <article>
              <span className={styles.useCaseLabel}>
                FOR ADVISORS & INVESTMENT TEAMS
              </span>
              <h3>
                Less searching. <br />
                More shared context.
              </h3>
              <p>
                Keep the materials for a transaction organized, so every new
                question starts from the same information.
              </p>
              <ul>
                <li>
                  <Check size={16} aria-hidden="true" />
                  Structure financial and legal files
                </li>
                <li>
                  <Check size={16} aria-hidden="true" />
                  Separate each deal’s workspace
                </li>
                <li>
                  <Check size={16} aria-hidden="true" />
                  Review sharing as a team
                </li>
              </ul>
              <Link href="/solutions/due-diligence" className={styles.textLink}>
                Explore due diligence
                <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
            </article>
          </div>
        </section>
        <section className={styles.securityBand}>
          <span className={styles.securityGlyph}>
            <LockKeyhole size={30} aria-hidden="true" />
          </span>
          <div>
            <h2>
              Sharing should be a decision. <br />
              Not a guessing game.
            </h2>
            <p>
              Understand the audience and the access settings before a link
              leaves your workspace.
            </p>
          </div>
          <Button variant="outline" size="lg" asChild>
            <Link href="/security">
              Explore access controls
              <ArrowUpRight aria-hidden="true" />
            </Link>
          </Button>
        </section>
        <section className={styles.resources} aria-labelledby="resources-title">
          <div className={styles.sectionTop}>
            <div>
              <span className={styles.eyebrow}>PREPARE WITH INTENTION</span>
              <h2 id="resources-title">
                Good rooms start <br />
                with a clear plan.
              </h2>
            </div>
            <Link href="/guides" className={styles.textLink}>
              All guides
              <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
          </div>
          <div className={styles.resourceGrid}>
            {[
              {
                href: "/guides/fundraising-checklist",
                type: "FUNDRAISING",
                title: "What to prepare before you share.",
                text: "A practical starting checklist for your investor room.",
              },
              {
                href: "/guides/sharing-checklist",
                type: "SHARING",
                title: "The check before the link.",
                text: "Questions to review about audience, verification, and access.",
              },
            ].map(({ href, type, title, text }) => (
              <Link href={href} key={href}>
                <FileText aria-hidden="true" size={24} />
                <span>{type}</span>
                <h3>{title}</h3>
                <p>{text}</p>
                <ArrowUpRight aria-hidden="true" size={20} />
              </Link>
            ))}
          </div>
        </section>
        <section className={styles.faqSection} aria-labelledby="faq-title">
          <div>
            <span className={styles.eyebrow}>CLEAR ANSWERS</span>
            <h2 id="faq-title">
              Before you <br />
              make room.
            </h2>
          </div>
          <Accordion type="single" collapsible className={styles.faqList}>
            {questions.map(({ question, answer }, i) => (
              <AccordionItem value={`q-${i}`} key={question}>
                <AccordionTrigger>{question}</AccordionTrigger>
                <AccordionContent>{answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
        <section className={styles.finalCta}>
          <div>
            <span className={styles.eyebrow}>
              YOUR NEXT CONVERSATION STARTS HERE
            </span>
            <h2>
              Make room for <br />
              what comes next.
            </h2>
          </div>
          <div>
            <Button size="lg" asChild className={styles.inverseButton}>
              <Link href="/register">
                Create your workspace
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <p>Your documents. Your audience. Your next move.</p>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}
