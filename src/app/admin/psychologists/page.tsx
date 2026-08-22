import { Stethoscope } from "lucide-react";

import { PsychologistFormDialog } from "@/components/admin/psychologist-form-dialog";
import { PsychologistRow } from "@/components/admin/psychologist-row";
import { getAllPsychologistsForAdmin } from "@/lib/queries";

export default async function AdminPsychologistsPage() {
  const psychologists = await getAllPsychologistsForAdmin();

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">
            Psychologist roster
          </h2>
          <p className="text-sm text-muted-foreground">
            Only listed psychologists appear in the public directory. Unlisting
            keeps the record here.
          </p>
        </div>
        <PsychologistFormDialog />
      </div>

      {psychologists.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <Stethoscope className="mx-auto size-5 text-muted-foreground" aria-hidden />
          <p className="mt-3 text-sm font-medium">No psychologists yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add the first one and it will show on /psychologists straight away.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {psychologists.map((psychologist) => (
            <PsychologistRow key={psychologist.id} psychologist={psychologist} />
          ))}
        </div>
      )}
    </section>
  );
}
