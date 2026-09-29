import Link from "next/link";
import { CalendarCheck, FileText, Flag, Stethoscope, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminOverview } from "@/lib/queries";

export default async function AdminOverviewPage() {
  const overview = await getAdminOverview();

  const cards = [
    {
      label: "Awaiting payment",
      value: overview.pendingBookings,
      href: "/admin/bookings?status=pending",
      cta: "Booking queue",
      icon: CalendarCheck,
    },
    {
      label: "Open reports",
      value: overview.openReports,
      href: "/admin/reports",
      cta: "Review queue",
      icon: Flag,
    },
    {
      label: "Posts",
      value: overview.posts,
      href: "/admin/posts",
      cta: "Manage posts",
      icon: FileText,
    },
    {
      label: "Psychologists",
      value: overview.psychologists,
      href: "/admin/psychologists",
      cta: "Manage roster",
      icon: Stethoscope,
    },
    {
      label: "Members",
      value: overview.users,
      href: "/admin/users",
      cta: "Manage roles",
      icon: Users,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(({ label, value, href, cta, icon: Icon }) => (
        <Card key={label} className="justify-between">
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {label}
            </CardTitle>
            <Icon className="size-4 text-muted-foreground" aria-hidden />
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-4xl font-semibold tabular-nums">{value}</p>
            <Link
              href={href}
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {cta} →
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
