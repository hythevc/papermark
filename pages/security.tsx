import Link from "next/link";

import {
  MarketingCTA,
  MarketingShell,
} from "@/components/marketing/marketing-shell";
import styles from "@/components/marketing/marketing-shell.module.css";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const controls = [
  {
    id: "audience",
    title: "Check who a link is intended for",
    paragraphs: [
      "Review the recipient requirements shown in your workspace. An email prompt, a verified email, a password, and an explicit recipient restriction serve different purposes. Choose the controls that match your intended audience.",
      "A link can be forwarded. Where verification or recipient restrictions are enabled, test the conditions a new recipient must meet rather than treating possession of a link as proof of identity.",
    ],
  },
  {
    id: "scope",
    title: "Review the material the recipient can reach",
    paragraphs: [
      "Confirm the document or room attached to the link, including the folders and files visible from its starting point. A familiar link name is not a substitute for checking its destination.",
      "Use document and folder permissions where they are available for your plan. Give different audiences separate links when that makes the scope and later access changes easier to understand.",
    ],
  },
  {
    id: "lifecycle",
    title: "Decide what happens after the review",
    paragraphs: [
      "Review expiration, download, and revocation settings where enabled. Revisit links when a review ends, its scope changes, or a recipient no longer needs access.",
      "Revoking a link controls future access through that link. It does not retrieve files a recipient has already downloaded or copied. Set expectations with your recipients before sharing.",
    ],
  },
  {
    id: "activity",
    title: "Understand what activity can tell you",
    paragraphs: [
      "Visitor and document activity can inform follow-up. The identity and detail available depend on the verification and analytics settings in use.",
      "A visit does not establish that a person read every page, accepted the contents, or completed a review. Ask for confirmation when completion matters.",
    ],
  },
];

export default function SecurityPage() {
  return (
    <MarketingShell
      title="Sharing controls, explained"
      description="Understand Roomline sharing controls, recipient access, link scope, and what to check before sending a document."
      path="/security"
    >
      <section className={styles.hero}>
        <h1>Confidence starts with clear access.</h1>
        <p>
          Understand what you are sharing, who it is for, and which controls
          apply. Make those choices before the link leaves your workspace.
        </p>
        <p className={styles.notice}>
          Available controls vary by plan and deployment. Check the settings
          shown in your workspace for the material you intend to share.
        </p>
      </section>
      <section className={styles.section} aria-labelledby="controls-heading">
        <div className={styles.sectionHeader}>
          <h2 id="controls-heading">
            Four checks that belong in every sharing decision.
          </h2>
          <p>
            Access settings should be understandable to the person using them.
            Start with the audience, then check the scope, lifecycle, and
            meaning of the activity you see.
          </p>
        </div>
        <Accordion
          type="multiple"
          defaultValue={["audience"]}
          className={styles.accordion}
        >
          {controls.map(({ id, title, paragraphs }) => (
            <AccordionItem value={id} key={id} className={styles.accordionItem}>
              <AccordionTrigger className={styles.accordionTrigger}>
                {title}
              </AccordionTrigger>
              <AccordionContent className={styles.accordionBody}>
                {paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>
      <section
        className={styles.section}
        aria-labelledby="responsibility-heading"
      >
        <div className={styles.sectionHeader}>
          <h2 id="responsibility-heading">
            Good controls need a shared understanding.
          </h2>
          <p>
            A room owner, a team member, and a recipient have different
            responsibilities. Keep the access review connected to the people and
            material involved.
          </p>
        </div>
        <div className={styles.cards}>
          <div className={styles.infoCard}>
            <h3>Your sharing decisions</h3>
            <p>
              Choose the audience and scope. Check team roles before allowing
              someone to change a room or its links. Test a recipient path, keep
              material current, and revisit access when the work changes.
            </p>
            <Link href="/guides/sharing-checklist" className={styles.textLink}>
              Use the sharing checklist
            </Link>
          </div>
          <div className={styles.infoCard}>
            <h3>Your workspace requirements</h3>
            <p>
              If your review requires a particular certification, retention
              arrangement, storage location, or contract term, establish that
              requirement for your deployment before sharing. A setting or
              activity record alone does not establish those assurances.
            </p>
            <Link
              href="/guides/fundraising-checklist"
              className={styles.textLink}
            >
              Prepare the review with your team
            </Link>
          </div>
        </div>
      </section>
      <MarketingCTA
        title="Give every link a clear purpose."
        description="Bring your materials together and make deliberate choices about how they are shared."
      />
    </MarketingShell>
  );
}
