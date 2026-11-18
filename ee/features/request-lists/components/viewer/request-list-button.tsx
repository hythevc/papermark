import { ClipboardList } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

import { VIEWER_TOGGLE_REQUEST_LIST_EVENT } from "../../lib/events";

export function RequestListButton({ className }: { className?: string }) {
  const { t } = useTranslation("dataroom");
  return (
    <Button
      type="button"
      variant="outline"
      className={`min-h-11 ${className ?? ""}`}
      onClick={() =>
        window.dispatchEvent(new Event(VIEWER_TOGGLE_REQUEST_LIST_EVENT))
      }
    >
      <ClipboardList className="h-4 w-4" aria-hidden="true" />
      {t("requestList.trigger", "Request List")}
    </Button>
  );
}
