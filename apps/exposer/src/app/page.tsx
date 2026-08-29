import { HandleOnboarding } from "@/components/handle-onboarding";
import { SignInLanding } from "@/components/sign-in-landing";
import { getSessionUser } from "@/lib/user";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const sessionUser = await getSessionUser();

  // Anonymous visitor → sign-in landing.
  if (!sessionUser) {
    return <SignInLanding />;
  }

  // Signed in with a handle → their portfolio (built in ticket 07).
  if (sessionUser.handle) {
    redirect(`/${sessionUser.handle}`);
  }

  // Signed in without a handle → onboarding.
  return <HandleOnboarding name={sessionUser.name} />;
}
