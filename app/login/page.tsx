import { signIn } from "@/lib/auth";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">GetItDone</h1>
      <p className="text-gray-500 text-sm">Manager sign-in</p>
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/dashboard" });
        }}
      >
        <button
          type="submit"
          className="rounded-lg bg-black text-white px-5 py-2.5 text-sm font-medium"
        >
          Continue with Google
        </button>
      </form>
    </main>
  );
}
