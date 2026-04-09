"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getMe, updateMe } from "@/lib/api/users";
import type { User } from "@/lib/api/users";

const schema = z.object({ first_name: z.string().min(1), last_name: z.string().min(1) });
type FormData = z.infer<typeof schema>;

export function ProfileForm({ locale: _locale, userId: _userId }: { locale: string; userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [saved, setSaved] = useState(false);
  const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });
  useEffect(() => {
    getMe().then((u) => { setUser(u); reset({ first_name: u.first_name, last_name: u.last_name }); });
  }, [reset]);
  async function onSubmit(data: FormData) {
    const updated = await updateMe(data);
    setUser(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }
  if (!user) return <div className="text-gray-400 text-sm">Loading...</div>;
  return (
    <div className="card p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {saved && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">Saved.</div>}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input value={user.email} disabled className="input" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
            <input {...register("first_name")} className="input" />
            {errors.first_name && <p className="mt-1 text-xs text-red-600">{errors.first_name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
            <input {...register("last_name")} className="input" />
            {errors.last_name && <p className="mt-1 text-xs text-red-600">{errors.last_name.message}</p>}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <input value={user.role.replace(/_/g," ")} disabled className="input capitalize" />
        </div>
        <button type="submit" disabled={isSubmitting} className="btn-primary">{isSubmitting ? "Saving..." : "Save profile"}</button>
      </form>
    </div>
  );
}
