import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { AvailabilityEditor } from "@/components/admin/availability-editor";
import {
  getAvailabilityForPsychologist,
  getPsychologistForAdmin,
} from "@/lib/queries";

export default async function AdminAvailabilityPage(
  props: PageProps<"/admin/psychologists/[id]/availability">,
) {
  const { id } = await props.params;

  // Deliberately the admin lookup, not getPsychologistById -- an unlisted
  // psychologist still needs their schedule editable.
  const psychologist = await getPsychologistForAdmin(id);
  if (!psychologist) notFound();

  const slots = await getAvailabilityForPsychologist(id);

  return (
    <section className="space-y-5">
      <Link
        href="/admin/psychologists"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to the roster
      </Link>

      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">
          {psychologist.name} — weekly schedule
        </h2>
        <p className="text-sm text-muted-foreground">
          These hours repeat every week and are what members can book. Each
          window is divided into {psychologist.session_minutes}-minute slots —
          change that on the roster if it is wrong.
        </p>
      </div>

      <AvailabilityEditor psychologistId={id} slots={slots} />
    </section>
  );
}
