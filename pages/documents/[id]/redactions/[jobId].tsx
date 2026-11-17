import { useRouter } from "next/router";

import { RedactionWorkspace } from "@/ee/features/redaction/components/redaction-workspace";

import { useDocumentOverview } from "@/lib/swr/use-document-overview";

import AppLayout from "@/components/layouts/app";
import LoadingSpinner from "@/components/ui/loading-spinner";

/**
 * Full-page redaction workspace.
 *
 * Manual regions persist on the job. Applying creates a bounded, flattened PDF
 * synchronously; this deployment does not claim AI detection or background runs.
 */
export default function DocumentRedactionJobPage() {
  const router = useRouter();
  const { id, jobId } = router.query as { id?: string; jobId?: string };
  const { document: prismaDocument, loading } = useDocumentOverview();

  if (!id || !jobId || loading || !prismaDocument) {
    return (
      <AppLayout>
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <LoadingSpinner className="h-10 w-10" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <RedactionWorkspace
        documentId={id}
        documentName={prismaDocument.name}
        jobId={jobId}
      />
    </AppLayout>
  );
}
