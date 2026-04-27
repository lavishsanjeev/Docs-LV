import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { SupabaseSetupForm } from "@/components/supabase-setup-form";
import { Settings } from "lucide-react";

export default async function SettingsPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const hasSupabase = !!user.publicMetadata?.hasSupabase;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your Supabase connection and preferences
        </p>
      </div>

      <SupabaseSetupForm initialConnected={hasSupabase} />
    </div>
  );
}
