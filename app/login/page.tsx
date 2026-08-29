import { signIn } from "@/lib/auth";
import AuthForm from "./AuthForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">GetItDone</h1>
      <p className="text-gray-500 text-sm -mt-4">Manager sign-in</p>

      <AuthForm />

      <div className="flex items-center gap-3 w-full max-w-xs text-xs text-gray-400">
        <div className="h-px flex-1 bg-gray-200" />
        or
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/dashboard" });
        }}
        className="w-full max-w-xs"
      >
        <button
          type="submit"
          className="w-full rounded-lg border px-5 py-2.5 text-sm font-medium"
        >
          Continue with Google
        </button>
      </form>
    </main>
  );
}
