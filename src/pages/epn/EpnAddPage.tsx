import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

type EpnBucket = "idfc" | "other_channel_partner" | "other_epn";

type EpnCreatePayload = {
  name: string;
  bucket: EpnBucket;
  category?: string | null;
  stage?: "outreach" | "active" | "rainmaking";

  // New Fields
  pocName?: string | null;
  designation?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  linkedin?: string | null;
  zone?: string | null;
  city?: string | null;
  state?: string | null;
};

const BUCKET_LABELS: Record<EpnBucket, string> = {
  idfc: "IDFC",
  other_channel_partner: "Other Channel Partners",
  other_epn: "Other EPN",
};

const CATEGORY_OPTIONS = [
  { value: "", label: "— Select —" },
  { value: "channel_partner", label: "Channel Partner" },
  { value: "agency", label: "Agency" },
  { value: "sector_expert", label: "Sector Expert" },
  { value: "loan", label: "Loan" },
  { value: "law_firm", label: "Law Firm" },
  { value: "ca_firm", label: "CA Firm" },
];

// Helper to map URL slug -> DB bucket
const URL_BUCKET_TO_DB: Record<string, EpnBucket> = {
  idfc: "idfc",
  "other-channel-partners": "other_channel_partner",
  "other-epn": "other_epn",
  other_channel_partner: "other_channel_partner",
  other_epn: "other_epn",
};

function getQueryParam(key: string) {
  const params = new URLSearchParams(window.location.search);
  return params.get(key) || "";
}

export default function EpnAddPage() {
  const [, setLocation] = useLocation();

  // 1. Detect if we are locked to a bucket
  const bucketParam = getQueryParam("bucket").trim();
  const lockedBucketDb = bucketParam ? (URL_BUCKET_TO_DB[bucketParam] as EpnBucket) : undefined;

  // 2. Determine redirect URL
  const redirectBack = useMemo(() => {
    if (!bucketParam) return "/epn/universe";
    if (bucketParam === "idfc") return "/epn/idfc";
    if (bucketParam === "other-channel-partners" || bucketParam === "other_channel_partner") return "/epn/other-channel-partners";
    if (bucketParam === "other-epn" || bucketParam === "other_epn") return "/epn/other-epn";
    return "/epn/universe";
  }, [bucketParam]);

  // 3. Form State
  const [form, setForm] = useState<EpnCreatePayload>({
    name: "",
    bucket: lockedBucketDb ?? "other_epn",
    category: null,
    stage: "outreach",

    pocName: "",
    designation: "",
    phoneNumber: "",
    email: "",
    linkedin: "",
    zone: "",
    city: "",
    state: "",
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: EpnCreatePayload = {
        ...form,
        name: form.name.trim(),
        // ✅ AUTO-SYNC: POC Name is the same as Partner Name
        pocName: form.name.trim(),
        category: form.category || null,
        designation: form.designation?.trim() || null,
        phoneNumber: form.phoneNumber?.trim() || null,
        email: form.email?.trim() || null,
        linkedin: form.linkedin?.trim() || null,
        zone: form.zone?.trim() || null,
        city: form.city?.trim() || null,
        state: form.state?.trim() || null,
      };

      const res = await apiRequest("POST", "/epn", payload);
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/epn/universe"] });
      await queryClient.invalidateQueries({ queryKey: [`/epn?bucket=${form.bucket}`] });
      setLocation(redirectBack);
    },
  });

  const set = (k: keyof EpnCreatePayload, v: any) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="p-6 space-y-4 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold">Add EPN Partner</h1>
        <p className="text-muted-foreground">
          Fill in the details below. This record will be added to the Master EPN Universe.
        </p>
      </div>

      <div className="border rounded-lg p-5 space-y-6 bg-card">
        {/* SECTION 1: MAIN INFO */}
        <div className="space-y-4">
          <div className="font-medium border-b pb-2">Partner Details</div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Partner Name *
              </label>
              <input
                className="w-full border rounded-md px-3 py-2 bg-background"
                placeholder="Enter partner name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                EPN Type (Bucket)
              </label>
              <select
                className="w-full border rounded-md px-3 py-2 bg-background disabled:opacity-70 disabled:bg-muted"
                value={form.bucket}
                onChange={(e) => set("bucket", e.target.value as EpnBucket)}
                disabled={!!lockedBucketDb}
              >
                <option value="idfc">{BUCKET_LABELS.idfc}</option>
                <option value="other_channel_partner">{BUCKET_LABELS.other_channel_partner}</option>
                <option value="other_epn">{BUCKET_LABELS.other_epn}</option>
              </select>
              {lockedBucketDb && (
                <div className="text-[10px] text-muted-foreground mt-1">
                  Locked to current universe
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Category
              </label>
              <select
                className="w-full border rounded-md px-3 py-2 bg-background"
                value={form.category ?? ""}
                onChange={(e) => set("category", e.target.value || null)}
              >
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 2: CONTACT DETAILS (Removed POC Name Input) */}
        <div className="space-y-4">
          <div className="font-medium border-b pb-2">Contact Details</div>

          {/* Row 1: Designation | Phone | Email */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Designation
              </label>
              <input
                className="w-full border rounded-md px-3 py-2 bg-background"
                placeholder="e.g. Relationship Manager"
                value={form.designation ?? ""}
                onChange={(e) => set("designation", e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Phone Number
              </label>
              <input
                className="w-full border rounded-md px-3 py-2 bg-background"
                placeholder="+91..."
                value={form.phoneNumber ?? ""}
                onChange={(e) => set("phoneNumber", e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Email
              </label>
              <input
                className="w-full border rounded-md px-3 py-2 bg-background"
                placeholder="email@example.com"
                value={form.email ?? ""}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
          </div>

          {/* Row 2: LinkedIn (Full Width or Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                LinkedIn Profile
              </label>
              <input
                className="w-full border rounded-md px-3 py-2 bg-background"
                placeholder="https://linkedin.com/in/..."
                value={form.linkedin ?? ""}
                onChange={(e) => set("linkedin", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: LOCATION */}
        <div className="space-y-4">
          <div className="font-medium border-b pb-2">Location</div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Zone
              </label>
              <input
                className="w-full border rounded-md px-3 py-2 bg-background"
                placeholder="e.g. North, South"
                value={form.zone ?? ""}
                onChange={(e) => set("zone", e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                City
              </label>
              <input
                className="w-full border rounded-md px-3 py-2 bg-background"
                placeholder="e.g. Mumbai"
                value={form.city ?? ""}
                onChange={(e) => set("city", e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                State
              </label>
              <input
                className="w-full border rounded-md px-3 py-2 bg-background"
                placeholder="e.g. Maharashtra"
                value={form.state ?? ""}
                onChange={(e) => set("state", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex items-center gap-3 pt-4 border-t">
          <button
            className="px-6 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            disabled={!form.name.trim() || createMutation.isPending}
            onClick={() => createMutation.mutate()}
          >
            {createMutation.isPending ? "Saving..." : "Save Partner"}
          </button>

          <button
            className="px-6 py-2 rounded-md border bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
            onClick={() => setLocation(redirectBack)}
            type="button"
          >
            Cancel
          </button>

          {createMutation.isError ? (
            <div className="text-sm text-red-600">
              {(createMutation.error as any)?.message ?? "Failed to save partner"}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}