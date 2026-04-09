import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

interface Props { params: Promise<{ locale: string }> }

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  const session = await getSession();
  redirect(session ? `/${locale}/dashboard` : `/${locale}/login`);
}
