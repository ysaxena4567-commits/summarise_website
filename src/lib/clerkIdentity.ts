import { auth, currentUser } from "@clerk/nextjs/server";

export type ClerkIdentity = {
  key: string;
  userId: string;
  email: string;
  emailVerified: boolean;
  name?: string;
};

export async function getClerkIdentity(): Promise<ClerkIdentity | null> {
  const { userId } = await auth();

  if (!userId) return null;

  const user = await currentUser();
  const primaryEmail = user?.primaryEmailAddress;
  const email = primaryEmail?.emailAddress?.trim().toLowerCase() || "";

  if (!user || !email) return null;

  return {
    key: `clerk:${userId}`,
    userId,
    email,
    emailVerified: primaryEmail?.verification?.status === "verified",
    name: user.fullName || user.firstName || undefined,
  };
}

export async function requireVerifiedClerkIdentity() {
  const identity = await getClerkIdentity();

  if (!identity?.email) {
    return {
      identity: null,
      error: "Please sign in with Clerk to continue.",
      status: 401,
    };
  }

  if (!identity.emailVerified) {
    return {
      identity: null,
      error: "Please verify your email address before saving account, payment, or subscription data.",
      status: 403,
    };
  }

  return {
    identity,
    error: "",
    status: 200,
  };
}
