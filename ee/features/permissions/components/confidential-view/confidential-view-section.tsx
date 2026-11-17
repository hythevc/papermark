import type { Dispatch, SetStateAction } from "react";

import type { DEFAULT_LINK_TYPE } from "@/components/links/link-sheet";
import LinkItem from "@/components/links/link-sheet/link-item";
import type { LinkUpgradeOptions } from "@/components/links/link-sheet/link-options";

export default function ConfidentialViewSection({
  data,
  setData,
  isAllowed,
  handleUpgradeStateChange,
}: {
  data: DEFAULT_LINK_TYPE;
  setData: Dispatch<SetStateAction<DEFAULT_LINK_TYPE>>;
  isAllowed: boolean;
  handleUpgradeStateChange: (options: LinkUpgradeOptions) => void;
}) {
  return (
    <div className="pb-5">
      <LinkItem
        title="Confidential reading mask"
        tooltipContent="Show a small reading window and cover the rest of the document. This mask cannot prevent screenshots or copying."
        enabled={data.enableConfidentialView}
        action={() => {
          if (!isAllowed) return;
          setData((current) => ({
            ...current,
            enableConfidentialView: !current.enableConfidentialView,
          }));
        }}
        isAllowed={isAllowed}
        requiredPlan="business"
        upgradeAction={() =>
          handleUpgradeStateChange({
            state: true,
            trigger: "link_sheet_confidential_view_section",
            plan: "Business",
            highlightItem: ["confidential"],
          })
        }
      />
      {data.enableConfidentialView && (
        <p className="mt-2 text-sm text-muted-foreground">
          Visitors move a reading window with a pointer, touch, or arrow keys.
          The document is covered when they leave the viewer. Screenshots and
          copying remain possible.
        </p>
      )}
    </div>
  );
}
