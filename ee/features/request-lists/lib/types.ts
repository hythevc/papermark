export type ViewerRequestTask = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  category: string | null;
  dueDate: string | null;
  uploadFolderId: string | null;
  activities: {
    id: string;
    type: string;
    comment: string | null;
    fromStatus: string | null;
    toStatus: string | null;
    createdAt: string;
    actor: "You" | "Host";
  }[];
  uploads: { id: string; name: string; uploadedAt: string }[];
};

export type ViewerRequestListResponse = {
  enabled: boolean;
  readOnly?: boolean;
  teamId?: string;
  list: { id: string; name: string } | null;
  tasks: ViewerRequestTask[];
};
