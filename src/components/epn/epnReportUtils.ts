export const RELATIONSHIP_STATUS_META: Record<
  string,
  { label: string; badgeClass: string }
> = {
  yet_to_contact: {
    label: "Yet to contact",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
  },
  positive: {
    label: "Positive",
    badgeClass: "bg-green-100 text-green-800 border-green-200",
  },
  hold: {
    label: "Hold",
    badgeClass: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  no_response: {
    label: "No Response",
    badgeClass: "bg-gray-100 text-gray-800 border-gray-200",
  },
  rejected: {
    label: "Rejected",
    badgeClass: "bg-red-100 text-red-800 border-red-200",
  },
  dropped: {
    label: "Dropped",
    badgeClass: "bg-red-600 text-white border-red-600",
  },
};

export const RELATIONSHIP_STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "yet_to_contact", label: "Yet to contact" },
  { value: "positive", label: "Positive" },
  { value: "hold", label: "Hold" },
  { value: "no_response", label: "No Response" },
  { value: "rejected", label: "Rejected" },
  { value: "dropped", label: "Dropped" },
];

export const LEAD_STAGE_FILTER_OPTIONS = [
  { value: "all", label: "All Lead Stages" },
  { value: "outreach", label: "Outreach" },
  { value: "pitching", label: "Pitching" },
  { value: "mandates", label: "Mandates" },
  { value: "hold", label: "Hold" },
  { value: "dropped", label: "Dropped" },
  { value: "rejected", label: "Rejected" },
];

export const BUCKET_META: Record<string, string> = {
  all: "All Buckets",
  idfc: "IDFC",
  other_channel_partner: "Other Channel Partner",
  other_epn: "Other EPN",
};

export function getRelationshipStatusLabel(value?: string | null) {
  return RELATIONSHIP_STATUS_META[value || "yet_to_contact"]?.label || "Yet to contact";
}

export function getRelationshipStatusClass(value?: string | null) {
  return (
    RELATIONSHIP_STATUS_META[value || "yet_to_contact"]?.badgeClass ||
    RELATIONSHIP_STATUS_META.yet_to_contact.badgeClass
  );
}

export function getBucketLabel(value?: string | null) {
  return BUCKET_META[value || "other_epn"] || "Other EPN";
}

export function formatStageLabel(value?: string | null) {
  if (!value) return "Not set";

  if (value === "yet_to_contact") return "Yet to contact";
  if (value === "no_response") return "No Response";
  if (value === "other_channel_partner") return "Other Channel Partner";
  if (value === "other_epn") return "Other EPN";

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}