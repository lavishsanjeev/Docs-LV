import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Sidebar, MobileSidebar } from "@/components/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Check if user has paid
  if (!user.publicMetadata?.hasPaid) {
    redirect("/payment");
  }

  const props = {
    userName: user.fullName || user.firstName || "User",
    userEmail: user.primaryEmailAddress?.emailAddress || "",
    userImage: user.imageUrl,
    hasSupabase: !!user.publicMetadata?.hasSupabase,
  };

  return (
    <div className="flex h-screen overflow-hidden flex-col md:flex-row">
      <Sidebar {...props} />
      <MobileSidebar {...props} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
