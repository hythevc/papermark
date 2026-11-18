import { useState } from "react";

import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  FileText,
  LayoutGrid,
  Link2,
  LockKeyhole,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";

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

export function ProductPreview() {
  const [section, setSection] = useState<PreviewSection>("overview");
  const [search, setSearch] = useState("");
  const filtered = documents.filter((document) =>
    document.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div
      className={styles.previewWrap}
      id="product"
      role="region"
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
              { icon: FileText, value: "3", label: "documents" },
              { icon: Link2, value: "1", label: "shared links" },
              { icon: BarChart3, value: "2", label: "visits" },
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
