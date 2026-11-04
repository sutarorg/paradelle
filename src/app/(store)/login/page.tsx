import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getSessionUser } from "@/lib/auth";
import { Kicker } from "@/components/ui";
import { Reveal } from "@/components/reveal";
import { pageMetadata, SOCIAL_IMAGE_BY_PAGE } from "@/lib/seo";

export const metadata = pageMetadata({
  path: "/login",
  title: "Customer Login | Paradelle Chocolates",
  description:
    "Sign in to your Paradelle Chocolates account to manage your customer profile, access previous orders, review account details and track purchases.",
  keywords: [
    "Paradelle login",
    "customer account",
    "chocolate store login",
    "customer sign in",
    "shopping account India",
    "order history",
    "order tracking",
    "account access",
  ],
  image: SOCIAL_IMAGE_BY_PAGE.login,
});
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/account");

  return (
    <div className="mx-auto max-w-md px-4 pb-24 pt-16 sm:px-6">
      <Reveal>
        <div className="text-center">
          <Kicker className="justify-center">Welcome back</Kicker>
          <h1 className="font-display mt-3 text-4xl text-espresso">Sign in</h1>
          <p className="mt-3 text-[14px] text-espresso/60">Track orders, check out faster, keep your favourites close.</p>
        </div>
      </Reveal>
      <Reveal delay={120}>
        <div className="mt-9 rounded-3xl border hairline-gold bg-ivory p-7 shadow-[0_30px_60px_-45px_rgba(41,24,19,0.4)] sm:p-9">
          <AuthForm mode="login" />
        </div>
      </Reveal>
    </div>
  );
}
