import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Download,
  Eye,
  FileText,
} from "lucide-react";
import {
  useLeadPitching,
  type LeadPitchingDetails,
  type PitchingFileType,
  type SavePitchingPayload,
} from "@/components/managepitching/useLeadPitching";

interface PitchingManagementFormProps {
  leadId: number;
  initialData: any;
  onClose: () => void;
}


type AssignableUser = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
};

function getAssignableUserLabel(user?: AssignableUser | null) {
  if (!user) return "Unassigned";
  const full = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  return full || user.email || "Unknown User";
}


function formatDateOnly(value?: string | null) {
  if (!value) return "No date selected";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date selected";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value?: string | null) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function statusClasses(isDone: boolean) {
  return isDone
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-rose-200 bg-rose-50 text-rose-700";
}

type MilestoneRowProps = {
  title: string;
  subtitle?: string;
  statusDone: boolean;
  statusDoneLabel: string;
  statusPendingLabel: string;
  actionNode: React.ReactNode;

  nextActionText?: string | null;
  nextActionAt?: string | null;
  taskAssignedTo?: string | null;
  remarks?: string | null;

  nextActionTextKey: keyof SavePitchingPayload;
  nextActionAtKey: keyof SavePitchingPayload;
  taskAssignedToKey: keyof SavePitchingPayload;
  remarksKey: keyof SavePitchingPayload;

  assignableUsers: AssignableUser[];

  isSaving: boolean;
  onSave: (payload: SavePitchingPayload) => void;
};

function MilestoneRow({
  title,
  subtitle,
  statusDone,
  statusDoneLabel,
  statusPendingLabel,
  actionNode,
  nextActionText,
  nextActionAt,
  taskAssignedTo,
  remarks,
  nextActionTextKey,
  nextActionAtKey,
  taskAssignedToKey,
  remarksKey,
  assignableUsers,
  isSaving,
  onSave,
}: MilestoneRowProps) {
  const [nextActionTextDraft, setNextActionTextDraft] = useState(
    nextActionText ?? ""
  );
  const [nextActionAtDraft, setNextActionAtDraft] = useState(
    nextActionAt ? new Date(nextActionAt).toISOString().slice(0, 10) : ""
  );
  const [taskAssignedToDraft, setTaskAssignedToDraft] = useState(
    taskAssignedTo ?? ""
  );
  const [remarksDraft, setRemarksDraft] = useState(remarks ?? "");

  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNextActionTextDraft(nextActionText ?? "");
  }, [nextActionText]);

  useEffect(() => {
    setNextActionAtDraft(
      nextActionAt ? new Date(nextActionAt).toISOString().slice(0, 10) : ""
    );
  }, [nextActionAt]);

  useEffect(() => {
    setTaskAssignedToDraft(taskAssignedTo ?? "");
  }, [taskAssignedTo]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (nextActionTextDraft !== (nextActionText ?? "")) {
        onSave({
          [nextActionTextKey]: nextActionTextDraft,
        });
      }
    }, 800);

    return () => window.clearTimeout(timeout);
  }, [nextActionTextDraft, nextActionText, nextActionTextKey, onSave]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (taskAssignedToDraft !== (taskAssignedTo ?? "")) {
        onSave({
          [taskAssignedToKey]: taskAssignedToDraft || null,
        });
      }
    }, 800);

    return () => window.clearTimeout(timeout);
  }, [taskAssignedToDraft, taskAssignedTo, taskAssignedToKey, onSave]);

return (
  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-[120px_minmax(0,235px)_minmax(0,1fr)] xl:items-start">
      {/* TITLE + STATUS */}
      <div className="min-w-0 pt-1">
        <div className="truncate text-[15px] font-semibold text-slate-900">
          {title}
        </div>

        <div className="mt-2">
          <div
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusClasses(
              statusDone
            )}`}
          >
            {statusDone ? statusDoneLabel : statusPendingLabel}
          </div>
        </div>
      </div>

      {/* ACTION */}
      <div className="min-w-0">
        {actionNode}
      </div>

      {/* RIGHT STACK: NEXT ACTION + REMARKS */}
      <div className="min-w-0 space-y-2">
        <div>
          <div className="relative rounded-lg border border-slate-200 bg-white px-3 py-2">
            <input
              type="text"
              value={nextActionTextDraft}
              onChange={(e) => setNextActionTextDraft(e.target.value)}
              placeholder="Next action..."
              className="w-full bg-transparent pr-9 text-sm outline-none"
            />

            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
              onClick={() => {
                const input = dateInputRef.current;
                if (!input) return;

                if ((input as any).showPicker) {
                  (input as any).showPicker();
                } else {
                  input.click();
                }
              }}
            >
              <Calendar className="h-4 w-4" />
            </button>

            <input
              ref={dateInputRef}
              type="date"
              value={nextActionAtDraft}
              className="absolute h-0 w-0 opacity-0 pointer-events-none"
              onChange={(e) => {
                const nextDate = e.target.value;
                setNextActionAtDraft(nextDate);
                onSave({
                  [nextActionAtKey]: nextDate || null,
                });
              }}
            />
          </div>

          <div className="mt-1 text-[10px] leading-none text-slate-500">
            {nextActionAtDraft
              ? `Due: ${formatDateOnly(nextActionAtDraft)}`
              : "No date selected"}
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Assigned To
          </div>

          <select
            value={taskAssignedToDraft || "__unassigned"}
            onChange={(e) => {
              const value = e.target.value;
              setTaskAssignedToDraft(value === "__unassigned" ? "" : value);
            }}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary"
          >
            <option value="__unassigned">Unassigned</option>
            {assignableUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {getAssignableUserLabel(user)}
              </option>
            ))}
          </select>

          <Badge variant="outline" className="w-fit text-[10px]">
            {taskAssignedToDraft
              ? getAssignableUserLabel(
                  assignableUsers.find((u) => u.id === taskAssignedToDraft)
                )
              : "Unassigned"}
          </Badge>
        </div>

        <div>
          <Textarea
            value={remarksDraft}
            onChange={(e) => setRemarksDraft(e.target.value)}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${el.scrollHeight}px`;
            }}
            rows={1}
            placeholder="Remarks"
            className="min-h-[42px] max-h-28 resize-none overflow-auto rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          />

          {isSaving ? (
            <div className="mt-1 text-[10px] text-slate-400">Autosaving...</div>
          ) : null}
        </div>
      </div>
    </div>
  </div>
);
}


function PdfUploadAction({
  type,
  fileName,
  isUploading,
  onUpload,
  onPreview,
  onDownload,
}: {
  type: PitchingFileType;
  fileName?: string | null;
  isUploading: boolean;
  onUpload: (file: File, type: PitchingFileType) => void;
  onPreview: (type: PitchingFileType) => void;
  onDownload: (type: PitchingFileType, filename?: string | null) => void;
}) {
return (
  <div className="min-w-0 space-y-2">
    <Input
      type="file"
      accept=".pdf"
      disabled={isUploading}
      className="h-10 rounded-lg border-slate-200 text-sm file:mr-2 file:rounded-md file:border-0 file:bg-slate-100 file:px-2.5 file:py-1.5 file:text-xs file:font-medium hover:file:bg-slate-200"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        onUpload(file, type);
        e.target.value = "";
      }}
    />

    <div className="min-h-[18px] text-xs text-slate-600">
      {fileName ? (
        <div className="flex items-center gap-1 truncate">
          <FileText className="h-3.5 w-3.5 shrink-0 text-slate-500" />
          <span className="truncate">{fileName}</span>
        </div>
      ) : (
        <span className="text-slate-400">No file uploaded</span>
      )}
    </div>

    {fileName ? (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 hover:bg-sky-100"
          onClick={() => onPreview(type)}
        >
          <Eye className="h-3.5 w-3.5" />
          Preview
        </button>

        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
          onClick={() => onDownload(type, fileName)}
        >
          <Download className="h-3.5 w-3.5" />
          Download
        </button>
      </div>
    ) : null}
  </div>
);
}

function MeetingScheduleAction({
  value,
  placeholder,
  onSave,
}: {
  value?: string | null;
  placeholder: string;
  onSave: (payload: SavePitchingPayload) => void;
}) {
  const [draft, setDraft] = useState(
    value ? new Date(value).toISOString().slice(0, 16) : ""
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value ? new Date(value).toISOString().slice(0, 16) : "");
  }, [value]);

  return (
    <div className="min-w-0">
      <div className="relative rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
        <button
          type="button"
          className="w-full pr-9 text-left text-sm text-slate-700"
          onClick={() => {
            const input = inputRef.current;
            if (!input) return;

            if ((input as any).showPicker) {
              (input as any).showPicker();
            } else {
              input.click();
            }
          }}
        >
          {draft ? formatDateTime(draft) : placeholder}
        </button>

        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
          onClick={() => {
            const input = inputRef.current;
            if (!input) return;

            if ((input as any).showPicker) {
              (input as any).showPicker();
            } else {
              input.click();
            }
          }}
        >
          <Calendar className="h-4 w-4" />
        </button>

        <input
          ref={inputRef}
          type="datetime-local"
          value={draft}
          className="absolute h-0 w-0 opacity-0 pointer-events-none"
          onChange={(e) => {
            const nextValue = e.target.value;
            setDraft(nextValue);
            onSave({ meeting1Date: nextValue });
          }}
        />
      </div>

      <div className="mt-0 text-[10px] leading-none text-slate-500">
        {draft ? formatDateTime(draft) : "Not scheduled"}
      </div>
    </div>
  );
}

function MeetingScheduleAction2({
  value,
  placeholder,
  onSave,
}: {
  value?: string | null;
  placeholder: string;
  onSave: (payload: SavePitchingPayload) => void;
}) {
  const [draft, setDraft] = useState(
    value ? new Date(value).toISOString().slice(0, 16) : ""
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value ? new Date(value).toISOString().slice(0, 16) : "");
  }, [value]);

  return (
    <div className="min-w-0">
      <div className="relative rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
        <button
          type="button"
          className="w-full pr-9 text-left text-sm text-slate-700"
          onClick={() => {
            const input = inputRef.current;
            if (!input) return;

            if ((input as any).showPicker) {
              (input as any).showPicker();
            } else {
              input.click();
            }
          }}
        >
          {draft ? formatDateTime(draft) : placeholder}
        </button>

        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
          onClick={() => {
            const input = inputRef.current;
            if (!input) return;

            if ((input as any).showPicker) {
              (input as any).showPicker();
            } else {
              input.click();
            }
          }}
        >
          <Calendar className="h-4 w-4" />
        </button>

        <input
          ref={inputRef}
          type="datetime-local"
          value={draft}
          className="absolute h-0 w-0 opacity-0 pointer-events-none"
          onChange={(e) => {
            const nextValue = e.target.value;
            setDraft(nextValue);
            onSave({ meeting2Date: nextValue });
          }}
        />
      </div>

      <div className="mt-0 text-[10px] leading-none text-slate-500">
        {draft ? formatDateTime(draft) : "Not scheduled"}
      </div>
    </div>
  );
}

function ToggleAction({
  checked,
  title,
  description,
  fieldKey,
  onSave,
}: {
  checked: boolean;
  title: string;
  description: string;
  fieldKey: "loeSigned" | "mandateSigned";
  onSave: (payload: SavePitchingPayload) => void;
}) {
return (
  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5">
    <div className="pr-3 text-sm font-semibold text-slate-900">{title}</div>

    <Switch
      className="border border-slate-300 data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-slate-300 [&>span]:bg-white [&>span]:border [&>span]:border-slate-300 [&>span]:shadow-sm"
      checked={checked}
      onCheckedChange={(nextChecked) =>
        onSave({ [fieldKey]: nextChecked })
      }
    />
  </div>
);
}

function InvestorCheckCard({
  value,
  isSaving,
  onSave,
}: {
  value?: string | null;
  isSaving: boolean;
  onSave: (payload: SavePitchingPayload) => void;
}) {
  const [draft, setDraft] = useState(value ?? "");

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (draft !== (value ?? "")) {
        onSave({ investorCheckNotes: draft });
      }
    }, 800);

    return () => window.clearTimeout(timeout);
  }, [draft, value, onSave]);

  const hasNotes = draft.trim().length > 0;

return (
  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <div className="text-sm font-semibold text-slate-900">
        Investor Check Notes
      </div>

      <Badge
        variant="outline"
        className={hasNotes ? statusClasses(true) : statusClasses(false)}
      >
        {hasNotes ? "Notes added" : "Not added yet"}
      </Badge>
    </div>

    <Textarea
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      placeholder="Add notes about investor background checks or feedback..."
      className="min-h-[88px] rounded-lg border-slate-200 bg-white text-sm"
    />

    {isSaving ? (
      <div className="mt-2 text-[10px] text-slate-400">Autosaving...</div>
    ) : null}
  </div>
);
}

export default function PitchingManagementForm({
  leadId,
  initialData,
  onClose: _onClose,
}: PitchingManagementFormProps) {
  const {
    details,
    isSaving,
    isUploading,
    savePitchingDetails,
    uploadPitchingFile,
    previewPitchingFile,
    downloadPitchingFile,
  } = useLeadPitching(leadId);

  const pitchingData: LeadPitchingDetails = useMemo(
    () => ({ ...(initialData || {}), ...(details || {}) }),
    [initialData, details]
  );

  const { data: assignableUsers = [] } = useQuery<AssignableUser[]>({
    queryKey: ["assignable-task-users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/users");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const saveSilent = (payload: SavePitchingPayload) => {
    savePitchingDetails(payload, { silent: true });
  };

const handleUpload = (file: File, type: PitchingFileType) => {
  uploadPitchingFile({ file, type });
};

return (
  <div className="space-y-3 py-1">
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-2.5">
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-900">
            Live milestone workspace
          </div>
          <div className="text-xs text-slate-500">
            Compact row layout with autosave enabled.
          </div>
        </div>

        <Badge
          variant="outline"
          className="border-slate-200 bg-white text-slate-600"
        >
          {isSaving ? "Autosaving..." : "Autosave on"}
        </Badge>
      </div>
    </div>

    <MilestoneRow
      title="PDM"
      subtitle="Upload the PDF and keep preview / download available below."
      statusDone={!!pitchingData.pdmPath}
      statusDoneLabel="Uploaded"
      statusPendingLabel="Not uploaded yet"
      actionNode={
        <PdfUploadAction
          type="pdm"
          fileName={pitchingData.pdmName}
          isUploading={isUploading}
          onUpload={handleUpload}
          onPreview={previewPitchingFile}
          onDownload={downloadPitchingFile}
        />
      }
      nextActionText={pitchingData.pdmNextActionText}
      nextActionAt={pitchingData.pdmNextActionAt}
      taskAssignedTo={pitchingData.pdmTaskAssignedTo}
      remarks={pitchingData.pdmRemarks}
      nextActionTextKey="pdmNextActionText"
      nextActionAtKey="pdmNextActionAt"
      taskAssignedToKey="pdmTaskAssignedTo"
      remarksKey="pdmRemarks"
      assignableUsers={assignableUsers}
      isSaving={isSaving}
      onSave={saveSilent}
    />

    <MilestoneRow
      title="Meeting 1"
      subtitle="Schedule date and time from the calendar icon."
      statusDone={!!pitchingData.meeting1Date}
      statusDoneLabel="Scheduled"
      statusPendingLabel="Not scheduled"
      actionNode={
        <MeetingScheduleAction
          value={pitchingData.meeting1Date}
          placeholder="Schedule Meeting 1"
          onSave={saveSilent}
        />
      }
      nextActionText={pitchingData.meeting1NextActionText}
      nextActionAt={pitchingData.meeting1NextActionAt}
      taskAssignedTo={pitchingData.meeting1TaskAssignedTo}
      remarks={pitchingData.meeting1Remarks ?? pitchingData.meeting1Notes}
      nextActionTextKey="meeting1NextActionText"
      nextActionAtKey="meeting1NextActionAt"
      taskAssignedToKey="meeting1TaskAssignedTo"
      remarksKey="meeting1Remarks"
      assignableUsers={assignableUsers}
      isSaving={isSaving}
      onSave={(payload) => {
        if ("meeting1Remarks" in payload) {
          saveSilent({
            ...payload,
            meeting1Notes: payload.meeting1Remarks as string,
          });
          return;
        }

        saveSilent(payload);
      }}
    />

    <MilestoneRow
      title="Meeting 2"
      subtitle="Schedule date and time from the calendar icon."
      statusDone={!!pitchingData.meeting2Date}
      statusDoneLabel="Scheduled"
      statusPendingLabel="Not scheduled"
      actionNode={
        <MeetingScheduleAction2
          value={pitchingData.meeting2Date}
          placeholder="Schedule Meeting 2"
          onSave={saveSilent}
        />
      }
      nextActionText={pitchingData.meeting2NextActionText}
      nextActionAt={pitchingData.meeting2NextActionAt}
      taskAssignedTo={pitchingData.meeting2TaskAssignedTo}
      remarks={pitchingData.meeting2Remarks ?? pitchingData.meeting2Notes}
      nextActionTextKey="meeting2NextActionText"
      nextActionAtKey="meeting2NextActionAt"
      taskAssignedToKey="meeting2TaskAssignedTo"
      remarksKey="meeting2Remarks"
      assignableUsers={assignableUsers}
      isSaving={isSaving}
      onSave={(payload) => {
        if ("meeting2Remarks" in payload) {
          saveSilent({
            ...payload,
            meeting2Notes: payload.meeting2Remarks as string,
          });
          return;
        }

        saveSilent(payload);
      }}
    />


    <MilestoneRow
      title="LOE"
      subtitle="Use the current toggle-style action."
      statusDone={!!pitchingData.loeSigned}
      statusDoneLabel="Completed"
      statusPendingLabel="Not completed"
      actionNode={
        <ToggleAction
          checked={!!pitchingData.loeSigned}
          title="LOE Signed"
          description="Has the Letter of Engagement been signed?"
          fieldKey="loeSigned"
          onSave={saveSilent}
        />
      }
      nextActionText={pitchingData.loeNextActionText}
      nextActionAt={pitchingData.loeNextActionAt}
      taskAssignedTo={pitchingData.loeTaskAssignedTo}
      remarks={pitchingData.loeRemarks}
      nextActionTextKey="loeNextActionText"
      nextActionAtKey="loeNextActionAt"
      taskAssignedToKey="loeTaskAssignedTo"
      remarksKey="loeRemarks"
      assignableUsers={assignableUsers}
      isSaving={isSaving}
      onSave={saveSilent}
    />

    <MilestoneRow
      title="Mandate"
      subtitle="Use the current toggle-style action."
      statusDone={!!pitchingData.mandateSigned}
      statusDoneLabel="Completed"
      statusPendingLabel="Not completed"
      actionNode={
        <ToggleAction
          checked={!!pitchingData.mandateSigned}
          title="Mandate Signed"
          description="Is the mandate officially secured?"
          fieldKey="mandateSigned"
          onSave={saveSilent}
        />
      }
      nextActionText={pitchingData.mandateNextActionText}
      nextActionAt={pitchingData.mandateNextActionAt}
      taskAssignedTo={pitchingData.mandateTaskAssignedTo}
      remarks={pitchingData.mandateRemarks}
      nextActionTextKey="mandateNextActionText"
      nextActionAtKey="mandateNextActionAt"
      taskAssignedToKey="mandateTaskAssignedTo"
      remarksKey="mandateRemarks"
      assignableUsers={assignableUsers}
      isSaving={isSaving}
      onSave={saveSilent}
    />

    <InvestorCheckCard
      value={pitchingData.investorCheckNotes}
      isSaving={isSaving}
      onSave={saveSilent}
    />
  </div>
);
}
