import { UserRoleRow } from "@/components/admin/user-role-row";
import { requireAdmin } from "@/lib/admin";
import { getAllProfilesForAdmin } from "@/lib/queries";

export default async function AdminUsersPage() {
  const [admin, profiles] = await Promise.all([
    requireAdmin(),
    getAllProfilesForAdmin(),
  ]);

  return (
    <section className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">Members</h2>
        <p className="text-sm text-muted-foreground">
          Admins can moderate posts, manage the roster, and change roles. You
          cannot change your own role.
        </p>
      </div>

      <div className="space-y-3">
        {profiles.map((profile) => (
          <UserRoleRow
            key={profile.id}
            profile={profile}
            isSelf={profile.id === admin.id}
          />
        ))}
      </div>
    </section>
  );
}
