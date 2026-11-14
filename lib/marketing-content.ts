export type SolutionPage = {
  slug: string;
  title: string;
  description: string;
  introduction: string;
  outcomes: { title: string; body: string }[];
  checklistTitle: string;
  checklist: string[];
  relatedGuideSlug: string;
};

export const SOLUTIONS: SolutionPage[] = [
  {
    slug: "fundraising",
    title: "A clear room for your next round",
    description:
      "Organize the materials behind your pitch, share them deliberately, and keep investor follow-up grounded in context.",
    introduction:
      "A raise creates a steady stream of document requests. Keep the current materials together so your team can answer with a clear link instead of another attachment. Roomline brings document organization, link settings, and visitor activity into the same workspace.",
    outcomes: [
      {
        title: "Make the room easy to understand",
        body: "Build folders around the questions an investor needs to answer. Use clear document names, current versions, and a short index that explains what is available. Give each missing item an owner in your team's preparation process.",
      },
      {
        title: "Share for the stage you are in",
        body: "A first conversation and a detailed review need different materials. Review each link's scope and access settings before sending it. Available controls depend on the plan and deployment you use.",
      },
      {
        title: "Follow up with context",
        body: "Use visitor activity to inform a conversation, then confirm what the investor needs. A view is an engagement signal, not proof that someone has completed a review or made a decision.",
      },
    ],
    checklistTitle: "Before your first investor link",
    checklist: [
      "Choose the documents needed for this stage of the raise.",
      "Check dates, versions, and the figures repeated across materials.",
      "Review link scope, recipient requirements, and download settings.",
      "Assign responsibility for questions and missing documents.",
    ],
    relatedGuideSlug: "fundraising-checklist",
  },
  {
    slug: "due-diligence",
    title: "Give every review a clear starting point",
    description:
      "Bring the evidence together, set the right access, and help reviewers find the information behind a decision.",
    introduction:
      "Due diligence works better when people can find the right document and understand its context. Whether you are preparing a transaction, reviewing a company, or coordinating advisers, Roomline gives your team a shared place for the materials and their links.",
    outcomes: [
      {
        title: "Organize around the review",
        body: "Structure folders by the work reviewers need to complete. Keep document titles descriptive and include reporting periods where they matter. Record open requests and the person responsible in your review process so gaps have a next step.",
      },
      {
        title: "Make access a deliberate choice",
        body: "Different reviewers may need different material. Check the scope of each sharing link and use the access controls enabled for your plan and deployment. Test the recipient experience before sending sensitive material.",
      },
      {
        title: "Keep the conversation connected",
        body: "When a document changes, tell reviewers what changed and which version to use. Activity can show where attention has gone; confirm completion directly rather than treating a view as approval.",
      },
    ],
    checklistTitle: "Start the review with fewer loose ends",
    checklist: [
      "Agree on the review scope and the decision it supports.",
      "Check document versions, dates, and supporting context.",
      "Review recipient access and who can change sharing settings.",
      "Assign open requests and agree how answers will be delivered.",
    ],
    relatedGuideSlug: "sharing-checklist",
  },
];

export type MarketingGuide = {
  slug: string;
  title: string;
  summary: string;
  category: string;
  sections: {
    id: string;
    title: string;
    paragraphs: string[];
    checklist?: string[];
  }[];
};

export const GUIDES: MarketingGuide[] = [
  {
    slug: "fundraising-checklist",
    title: "Prepare a fundraising room people can navigate",
    summary:
      "A practical checklist for choosing your materials, reviewing access, and keeping investor requests moving.",
    category: "Fundraising",
    sections: [
      {
        id: "define-the-review",
        title: "Start with the conversation",
        paragraphs: [
          "Decide who will use this room and what they need to understand next. An introductory conversation rarely needs the same material as a detailed investment review. Choose the scope before uploading everything you have.",
          "Write a short note describing the company, the purpose of the room, and the period covered by the materials. Tell readers where to start and who can answer questions. Clear context helps people distinguish a missing document from a document that is outside the current review.",
        ],
      },
      {
        id: "build-the-index",
        title: "Build an index around investor questions",
        paragraphs: [
          "Group documents by the questions they answer. A useful starting index might cover the company and round, financial performance, customers and product, team, and corporate records. Adapt it to your business rather than treating every folder as a requirement.",
          "Use descriptive titles and consistent reporting periods. If two files answer different questions, make that difference visible in their names. Keep a preparation list for missing items and assign each one to a person who can finish it; an empty folder alone does not create accountability.",
        ],
        checklist: [
          "Name folders in language a new reader will understand.",
          "Make the starting document easy to find.",
          "Give each missing item an owner and an agreed next step.",
        ],
      },
      {
        id: "review-the-materials",
        title: "Check the story across documents",
        paragraphs: [
          "Open every file you plan to share. Check that it is readable, current, and intended for this audience. Confirm the figures repeated in your pitch, financial materials, and supporting documents refer to the same periods and definitions.",
          "Remove superseded versions from the shared set or label them clearly when they provide necessary history. Add context for estimates, forecasts, and incomplete periods. The goal is to make a reviewer understand what they are seeing without guessing which version or figure is authoritative.",
        ],
      },
      {
        id: "review-access",
        title: "Review the link before you send it",
        paragraphs: [
          "Check exactly which room or documents the link exposes. Review recipient requirements, expiration, and download settings where those controls are enabled for your plan and deployment. Test the link under the access conditions you intend the investor to use.",
          "Decide how you will handle later stages of the review. You may need to share additional material as the conversation develops. Keep a record of which link you sent to which audience so a later change does not become a guessing exercise.",
        ],
      },
      {
        id: "handle-requests",
        title: "Give requests a route to completion",
        paragraphs: [
          "Choose who receives investor questions and who checks the answers. Keep each request connected to the relevant document, assign a responsible person, and record when an answer has been delivered. Do not mark a task complete merely because a file was uploaded if the reviewer still needs an explanation.",
          "When you update material, explain what changed and where the current version lives. Use visitor activity to inform your follow-up, then ask what remains unclear. A document view is not confirmation that an investor has completed diligence or decided to invest.",
        ],
      },
      {
        id: "close-the-loop",
        title: "Keep the room current as the round changes",
        paragraphs: [
          "Revisit the room when the round moves to a new stage, reporting periods change, or people leave the review. Update the shared materials and review links that no longer serve their original purpose.",
          "If you revoke a link, check that it no longer grants future access. That change does not retrieve copies someone already downloaded. Close the preparation list with your team so outstanding requests, retained material, and the next owner are clear.",
        ],
      },
    ],
  },
  {
    slug: "sharing-checklist",
    title: "Check a document link before you share it",
    summary:
      "A recipient-first guide to link scope, access settings, verification, and what happens after the review.",
    category: "Document sharing",
    sections: [
      {
        id: "name-the-purpose",
        title: "Name the recipient and the purpose",
        paragraphs: [
          "Start with the person who needs the information and the decision they are trying to make. Decide whether they need one document, a collection, or a full room. Share the smallest useful set rather than asking the recipient to sort through unrelated material.",
          "Check that the intended recipient is still involved in the review. If a colleague or adviser will join them, decide how that person should receive access. A forwarded link and a deliberately granted invitation are different sharing choices.",
        ],
      },
      {
        id: "check-the-scope",
        title: "Check what the link actually opens",
        paragraphs: [
          "Confirm the room or document attached to the link, including any folders or files visible from that starting point. Do not rely on the link's label to tell you its scope. Open the destination and compare it with the material you intended to send.",
          "Check the document version, reporting period, and any supporting explanation. If the recipient needs a specific section or a comparison with an earlier version, explain that in the message rather than expecting them to infer it from a filename.",
        ],
        checklist: [
          "The destination contains the intended material.",
          "The shared version is current and readable.",
          "Related files are included only when they are needed.",
        ],
      },
      {
        id: "choose-access-settings",
        title: "Choose the access conditions",
        paragraphs: [
          "Review the controls available in your workspace. Depending on your plan and deployment, these can include email requirements, email verification, passwords, expiration, and download permissions. Choose each setting for a reason and make sure your team understands its effect.",
          "An email requirement can record the address supplied by a visitor. Verification adds a check that the visitor can access that inbox. Neither tells you why a person opened the link or guarantees that the material cannot be forwarded. If audience restrictions are available, check the allowed recipients as well as the verification setting.",
        ],
      },
      {
        id: "test-the-recipient-experience",
        title: "Test the recipient experience",
        paragraphs: [
          "Open the link as a test recipient under the intended access conditions. Check the prompts they will see, the files they can open, and whether the available download behavior matches your choice. Use an account or inbox you are authorized to test with.",
          "Repeat the check on a narrow screen if the recipient is likely to review on a phone. Look for readable document titles, a clear way back to the room, and an obvious response when access is denied or a link has expired. A link that works for its owner may still be confusing to a new visitor.",
        ],
      },
      {
        id: "send-with-context",
        title: "Send the link with a clear request",
        paragraphs: [
          "Say what you are sharing, what you want the recipient to review, and where to direct questions. Mention an expiry if it affects their ability to complete the work. If you changed an earlier document, summarize the change and identify the current version.",
          "Keep an internal record of the audience and the purpose of the link. Assign someone to handle access questions and outstanding requests. Clear ownership helps a recipient get an answer without forwarding material around to find the right person.",
        ],
      },
      {
        id: "review-and-close",
        title: "Review access when the work is finished",
        paragraphs: [
          "Use visitor activity as context for follow-up, not as proof of approval or completed review. Confirm the outcome directly with the recipient and close outstanding questions with the person responsible.",
          "Review the link when the project ends or its audience changes. Where revocation or expiry is available, use it to stop future access through that link and test the result. Revocation does not retrieve files already downloaded. If a recipient needs more time or additional material, make that a deliberate new sharing decision.",
        ],
      },
    ],
  },
];
