import { getSession } from "@/lib/auth/session";
import { ProfileForm } from "@/components/settings/ProfileForm";

interface Props { params: Promise<{ locale: string }> }

export default async function ProfilePage({ params }: Props) {
  const { locale } = await params;
  const session = await getSession();
  if (!session) return null;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Profile settings</h1>
      <ProfileForm locale={locale} userId={session.id} />
    </div>
  );
}
