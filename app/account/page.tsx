import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

// getUser() revalidates against the Supabase Auth server before this
// renders anything -- an unauthenticated visitor never receives this
// page's markup, they're redirected before it's produced.
export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <main>
      <h1>Account</h1>
      <p>Signed in as {user.email}</p>
      <form action={signOut}>
        <button type="submit">Sign out</button>
      </form>
    </main>
  );
}
