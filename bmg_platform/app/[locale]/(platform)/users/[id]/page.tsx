import { requireRole } from "@/lib/auth/guards";
import { UserDetail } from "@/components/users/UserDetail";

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export default async function UserDetailPage({ params }: Props) {
  const { locale, id } = await params;
  await requireRole(locale, ["super_admin", "admin_client", "hr", "manager"]);
  return <UserDetail locale={locale} userId={id} />;
}
