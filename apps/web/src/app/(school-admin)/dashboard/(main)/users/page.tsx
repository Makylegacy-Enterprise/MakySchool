import { DashboardPage } from "@makyschool/ui/components/layout/DashboardPage";
import { UsersPageContent } from "@/components/users/UsersPageContent";

export default function UsersPage() {
  return (
    <DashboardPage
      eyebrow="School admin"
      title="Users"
      description="Manage staff accounts for your school"
      maxWidth="7xl"
    >
      <UsersPageContent />
    </DashboardPage>
  );
}
