import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="paper-green-bg min-h-screen">
      <header className="flex items-center justify-between bg-white/80 backdrop-blur border-b border-black/5 px-4 py-3">
        <Link href="/dashboard" className="font-semibold text-[#23301f]">GetItDone</Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-[#5b6b53]">{session.user.email}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button className="text-[#5b6b53] underline">Sign out</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-2xl p-4">{children}</main>
    </div>
  );
}
