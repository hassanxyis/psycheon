import { ShieldCheck } from "lucide-react";

import { ReportCard } from "@/components/admin/report-card";
import { getOpenReports } from "@/lib/queries";

export default async function AdminReportsPage() {
  const reports = await getOpenReports();

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">Moderation queue</h2>
        <p className="text-sm text-muted-foreground">
          Open and in-review reports. Hiding a post is reversible; deleting a
          comment is not.
        </p>
      </div>

      {reports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <ShieldCheck className="mx-auto size-5 text-muted-foreground" aria-hidden />
          <p className="mt-3 text-sm font-medium">Nothing waiting for review.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            New reports from the community will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      )}
    </section>
  );
}
