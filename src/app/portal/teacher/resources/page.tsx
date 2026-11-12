"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HardDrive } from "lucide-react";
import { useTeacher } from "@/lib/portal/store";
import { connectStorage, storageStatus } from "@/lib/portal/storage";
import { Btn, PageHeader, Picker } from "@/components/portal/ui";
import { FileBrowser } from "@/components/portal/resources";

const RESULT: Record<string, string> = {
  connected: "File storage connected",
  cancelled: "Storage connection cancelled",
  expired: "That took too long. Please connect again.",
  error: "Storage couldn't be connected. Please try again.",
};

function Resources() {
  const { db, toast } = useTeacher();
  const router = useRouter();
  const params = useSearchParams();
  const cohorts = [...db.cohorts].sort((a, b) => a.name.localeCompare(b.name));
  const [cohortId, setCohortId] = useState(cohorts[0]?.id ?? "");
  const [storage, setStorage] = useState<{ connected: boolean; account: string | null } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    storageStatus()
      .then(setStorage)
      .catch(() => setStorage({ connected: false, account: null }));
  }, []);

  // back from the one-time storage connection
  useEffect(() => {
    const r = params.get("storage");
    if (!r) return;
    toast(RESULT[r] ?? RESULT.error);
    router.replace("/portal/teacher/resources/", { scroll: false });
  }, [params, router, toast]);

  const cohort = db.cohorts.find((c) => c.id === cohortId) ?? cohorts[0];
  if (!cohort) return <PageHeader title="Resources" />;

  return (
    <>
      <PageHeader
        title="Resources"
        actions={<Picker label="Student" value={cohort.id} onChange={setCohortId} options={cohorts.map((c) => ({ value: c.id, label: c.name }))} />}
      />

      {storage && !storage.connected && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-navy-deep p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-gold text-navy-deep">
              <HardDrive size={18} />
            </span>
            <div>
              <p className="text-[15px] font-semibold text-white">Connect file storage</p>
              <p className="text-[13px] text-white/80">One time only, with the Google account that holds your storage.</p>
            </div>
          </div>
          <Btn
            variant="gold"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await connectStorage();
              } catch (e) {
                setBusy(false);
                toast(e instanceof Error ? e.message : "Couldn't start the connection");
              }
            }}
          >
            {busy ? "Opening…" : "Connect"}
          </Btn>
        </div>
      )}

      <FileBrowser cohortId={cohort.id} rootLabel={cohort.name} teacher />
    </>
  );
}

export default function TeacherResources() {
  return (
    <Suspense>
      <Resources />
    </Suspense>
  );
}
