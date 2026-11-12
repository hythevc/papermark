import Head from "next/head";
import Image from "next/image";
import Link from "next/link";

import { useState } from "react";

import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  FileText,
  FolderClosed,
  LayoutGrid,
  Link2,
  LockKeyhole,
  Menu,
  Search,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

import { BRAND } from "@/lib/brand";

import styles from "./roomline-home.module.css";

const documents = [
  {
    name: "Pitch deck.pdf",
    category: "Company overview",
    type: "PDF",
    size: "8.4 MB",
  },
  {
    name: "Financial model.xlsx",
    category: "Financials",
    type: "XLS",
    size: "2.1 MB",
  },
  {
    name: "Investor update.pdf",
    category: "Company overview",
    type: "PDF",
    size: "1.3 MB",
  },
];
const sections = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "access", label: "Shared links", icon: Link2 },
  { id: "activity", label: "Visitors", icon: Users },
] as const;
type PreviewSection = (typeof sections)[number]["id"];

function ProductPreview() {
  const [section, setSection] = useState<PreviewSection>("overview");
  const [search, setSearch] = useState("");
  const filtered = documents.filter((document) =>
    document.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div
      className={styles.previewWrap}
      id="product"
      aria-label="Interactive product preview with illustrative data"
    >
      <div className={styles.previewCaption}>
        <span className={styles.liveDot} /> A look inside your next workspace{" "}
        <span>Sample data</span>
      </div>
      <div className={styles.preview}>
        <aside className={styles.previewSidebar}>
          <div className={styles.workspace}>
            <span>N</span>
            <strong>Northstar</strong>
            <ChevronDown size={13} />
          </div>
          <nav aria-label="Product preview navigation">
            {sections.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-pressed={section === id}
                className={section === id ? styles.selectedNav : ""}
                onClick={() => setSection(id)}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
          <div className={styles.previewSidebarFooter}>
            <LockKeyhole size={13} /> Your room. Your rules.
          </div>
        </aside>
        <div className={styles.previewMain}>
          <div className={styles.previewBreadcrumb}>
            <span>Data rooms / Series A</span>
            <span className={styles.avatar}>JD</span>
          </div>
          <div className={styles.previewHeading}>
            <div>
              <p>FUNDRAISING WORKSPACE</p>
              <h2>Series A fundraise</h2>
            </div>
            <span className={styles.shared}>
              <span /> Shared
            </span>
          </div>
          <div className={styles.stats}>
            {[
              { icon: FileText, value: "24", label: "documents" },
              { icon: Link2, value: "8", label: "shared links" },
              { icon: BarChart3, value: "126", label: "visits" },
            ].map(({ icon: Icon, value, label }) => (
              <div key={label}>
                <Icon size={19} />
                <div>
                  <strong>{value}</strong>
                  <span>{label}</span>
                </div>
              </div>
            ))}
          </div>
          {(section === "overview" || section === "documents") && (
            <section
              className={styles.previewPanel}
              aria-label="Sample documents"
            >
              <div className={styles.panelHeading}>
                <h3>Documents</h3>
                {section === "overview" ? (
                  <button type="button" onClick={() => setSection("documents")}>
                    View all <ArrowRight size={12} />
                  </button>
                ) : (
                  <span>3 sample files</span>
                )}
              </div>
              {section === "documents" && (
                <label className={styles.previewSearch}>
                  <Search size={14} />
                  <input
                    aria-label="Search sample documents"
                    placeholder="Search documents…"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>
              )}
              <div className={styles.tableHeader}>
                <span>Name</span>
                <span>Size</span>
              </div>
              {filtered.map((document) => (
                <div className={styles.documentRow} key={document.name}>
                  <span
                    className={
                      document.type === "XLS" ? styles.xls : styles.pdf
                    }
                  >
                    {document.type}
                  </span>
                  <div>
                    <strong>{document.name}</strong>
                    <small>{document.category}</small>
                  </div>
                  <span>{document.size}</span>
                </div>
              ))}
              {filtered.length === 0 && (
                <p className={styles.noResults}>
                  No sample files match “{search}”.{" "}
                  <button type="button" onClick={() => setSearch("")}>
                    Clear search
                  </button>
                </p>
              )}
            </section>
          )}
          {(section === "overview" || section === "activity") && (
            <section
              className={styles.previewPanel}
              aria-label="Sample visitor activity"
            >
              <div className={styles.panelHeading}>
                <h3>Recent activity</h3>
                <span>Illustrative events</span>
              </div>
              <div className={styles.activityRow}>
                <span className={styles.activityDot} />
                <p>
                  <strong>Alex Morgan</strong> viewed Pitch deck.pdf
                  <small>Today, 10:42 AM</small>
                </p>
                <span className={styles.miniAvatar}>AM</span>
              </div>
              <div className={styles.activityRow}>
                <span className={styles.activityDot} />
                <p>
                  <strong>Jordan Lee</strong> opened the room
                  <small>Today, 9:18 AM</small>
                </p>
                <span className={styles.miniAvatar}>JL</span>
              </div>
            </section>
          )}
          {section === "access" && (
            <section
              className={styles.previewPanel}
              aria-label="Sample sharing settings"
            >
              <div className={styles.panelHeading}>
                <h3>Investor access</h3>
                <span className={styles.shared}>Active</span>
              </div>
              <p className={styles.accessIntro}>
                A readable summary of who can enter and what they can do.
              </p>
              {[
                { label: "Audience", value: "Invited investors" },
                { label: "Email verification", value: "Required" },
                { label: "Downloads", value: "Restricted" },
                { label: "Link expires", value: "30 days after creation" },
              ].map(({ label, value }) => (
                <div className={styles.accessRow} key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
              <p className={styles.previewNote}>
                Illustrative settings. No live room or access link is created.
              </p>
            </section>
          )}
        </div>
      </div>
      <div className={styles.permissionCard}>
        <span className={styles.permissionIcon}>
          <ShieldCheck size={21} />
        </span>
        <div>
          <strong>Access on your terms</strong>
          <p>
            <Check size={13} /> Verify emails. Control downloads.
          </p>
        </div>
      </div>
    </div>
  );
}

const faqs = [
  {
    question: "What can I use a data room for?",
    answer:
      "Bring fundraising materials, due diligence documents, or client deliverables into one organized workspace. Create a room for each deal and share the relevant materials with your audience.",
  },
  {
    question: "Can I control who sees my documents?",
    answer:
      "The app supports sharing links with access settings, including email verification, download restrictions, and expiration. Available controls depend on the workspace plan and deployment configuration.",
  },
  {
    question: "What does engagement tracking show?",
    answer:
      "Document and room activity helps you understand when shared materials are being viewed. Use those signals as context for follow-up; a view alone does not establish investment intent.",
  },
  {
    question: "Is the preview connected to a real workspace?",
    answer:
      "No. The interactive preview uses clearly labeled sample documents and visitor activity. Create an account to use your own workspace once this deployment’s authentication and services are configured.",
  },
];

export function RoomlineHome() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className={styles.site}>
      <Head>
        <title>{`${BRAND.name} — A clearer path to your next deal`}</title>
        <meta
          name="description"
          content={BRAND.description}
          key="description"
        />
        <link rel="canonical" href={BRAND.marketingUrl} />
      </Head>
      <a className={styles.skipLink} href="#main-content">
        Skip to content
      </a>
      <header className={styles.header}>
        <Link
          href="/"
          aria-label={`${BRAND.name} home`}
          className={styles.logo}
        >
          <img src={BRAND.mark} width="27" height="30" alt="" />
          <span>{BRAND.name}</span>
        </Link>
        <nav className={styles.desktopNav} aria-label="Main navigation">
          <a href="#product">Product</a>
          <a href="#how-it-works">How it works</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className={styles.headerActions}>
          <Link href="/login" className={styles.signIn}>
            Sign in
          </Link>
          <Link href="/register" className={styles.primaryButton}>
            Create workspace <ArrowRight size={15} />
          </Link>
        </div>
        <button
          type="button"
          className={styles.menuToggle}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        {menuOpen && (
          <nav
            className={styles.mobileNav}
            id="mobile-menu"
            aria-label="Mobile navigation"
          >
            {[
              { href: "#product", label: "Product" },
              { href: "#how-it-works", label: "How it works" },
              { href: "#faq", label: "FAQ" },
            ].map(({ href, label }) => (
              <a href={href} key={href} onClick={() => setMenuOpen(false)}>
                {label}
              </a>
            ))}
            <Link href="/login">Sign in</Link>
            <Link href="/register">
              Create workspace <ArrowRight size={15} />
            </Link>
          </nav>
        )}
      </header>
      <main id="main-content">
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>
              <span /> DATA ROOMS, WITHOUT THE FRICTION
            </span>
            <h1 id="hero-title">
              A clearer path
              <br />
              to your next
              <br />
              <em>deal.</em>
              <span className={styles.titleSquare} />
            </h1>
            <p>
              Organize your documents, control access, and understand engagement
              in one focused workspace.
            </p>
            <div className={styles.heroActions}>
              <Link href="/register" className={styles.primaryButton}>
                Create your workspace <ArrowRight size={17} />
              </Link>
              <a href="#product" className={styles.secondaryButton}>
                Explore the product <ArrowDown size={16} />
              </a>
            </div>
            <span className={styles.heroFootnote}>
              Built for the work behind the deal.
            </span>
          </div>
          <ProductPreview />
        </section>
        <section
          className={styles.steps}
          id="how-it-works"
          aria-label="How Roomline works"
        >
          {[
            {
              title: "Set the room",
              text: "Give every deal a home. Bring your documents together in a structure that makes sense.",
              icon: FolderClosed,
            },
            {
              title: "Share on your terms",
              text: "Choose your audience, review access, and share the right materials with the right people.",
              icon: LockKeyhole,
            },
            {
              title: "Read the signals",
              text: "See what’s getting attention and bring more context to your next conversation.",
              icon: BarChart3,
            },
          ].map(({ title, text, icon: Icon }, i) => (
            <article key={title}>
              <div className={styles.stepTop}>
                <span>0{i + 1}</span>
                <Icon size={20} />
              </div>
              <h2>{title}</h2>
              <p>{text}</p>
            </article>
          ))}
        </section>
        <section
          className={styles.featureSection}
          aria-labelledby="feature-title"
        >
          <div className={styles.sectionIntro}>
            <span className={styles.kicker}>LESS CHASING. MORE CLARITY.</span>
            <h2 id="feature-title">
              Keep the deal moving.
              <br />
              Keep control of the details.
            </h2>
            <p>
              From the first shared deck to the final round of diligence, give
              every conversation a better starting point.
            </p>
          </div>
          <div className={styles.featureGrid}>
            <article>
              <span className={styles.featureNumber}>01 / ORGANIZE</span>
              <h3>
                One workspace.
                <br />A shared understanding.
              </h3>
              <p>
                Keep your pitch deck, financials, and supporting materials
                together. Templates and folders help you start with a clear
                structure.
              </p>
              <div className={styles.folderVisual} aria-hidden="true">
                {[
                  "01  Company overview",
                  "02  Financials",
                  "03  Legal & corporate",
                ].map((name) => (
                  <div key={name}>
                    <FolderClosed size={18} />
                    <span>{name}</span>
                    <ChevronDown size={14} />
                  </div>
                ))}
              </div>
            </article>
            <article>
              <span className={styles.featureNumber}>02 / CONTROL</span>
              <h3>
                Make sharing
                <br />a considered decision.
              </h3>
              <p>
                Review the audience, verification, download rules, and expiry
                before sending a link. Keep your access decisions easy to
                understand.
              </p>
              <div className={styles.controlsVisual}>
                <div>
                  <ShieldCheck size={19} />
                  <strong>Share with confidence</strong>
                </div>
                <p>
                  <Check size={15} /> Clear access settings
                </p>
                <p>
                  <Check size={15} /> Link expiration controls
                </p>
                <p>
                  <Check size={15} /> Review and revoke access
                </p>
              </div>
            </article>
          </div>
        </section>
        <section className={styles.audienceSection}>
          <span className={styles.kicker}>
            BUILT AROUND YOUR NEXT MILESTONE
          </span>
          <h2>
            For the people
            <br />
            behind the progress.
          </h2>
          <div className={styles.audienceGrid}>
            {[
              {
                title: "Founders",
                text: "Tell a clear story and give investors a focused place to explore it.",
              },
              {
                title: "Investment teams",
                text: "Bring materials and engagement into a clearer diligence workflow.",
              },
              {
                title: "Advisors & operators",
                text: "Keep each transaction organized, with a dedicated room for every deal.",
              },
            ].map(({ title, text }) => (
              <article key={title}>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section
          className={styles.faqSection}
          id="faq"
          aria-labelledby="faq-title"
        >
          <div>
            <span className={styles.kicker}>A FEW THINGS, ANSWERED</span>
            <h2 id="faq-title">
              Good questions.
              <br />
              Clear answers.
            </h2>
          </div>
          <div className={styles.faqList}>
            {faqs.map(({ question, answer }) => (
              <details key={question}>
                <summary>
                  {question}
                  <ChevronDown size={18} />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section className={styles.finalCta}>
          <div>
            <span className={styles.kicker}>YOUR NEXT CHAPTER STARTS HERE</span>
            <h2>
              Make room for
              <br />
              <em>what comes next.</em>
            </h2>
          </div>
          <div>
            <Link href="/register" className={styles.lightButton}>
              Create your workspace <ArrowRight size={18} />
            </Link>
            <p>Your documents. Your audience. Your next move.</p>
          </div>
        </section>
      </main>
      <footer className={styles.footer}>
        <Link href="/" className={styles.logo}>
          <img src={BRAND.mark} width="24" height="28" alt="" />
          <span>{BRAND.name}</span>
        </Link>
        <span>Clarity, from first look to next step.</span>
        <nav aria-label="Footer navigation">
          <Link href="/login">Sign in</Link>
          {BRAND.privacyUrl && <a href={BRAND.privacyUrl}>Privacy</a>}
          {BRAND.termsUrl && <a href={BRAND.termsUrl}>Terms</a>}
          <a href="https://github.com/hythevc/papermark">
            Source & attribution
          </a>
        </nav>
      </footer>
    </div>
  );
}
