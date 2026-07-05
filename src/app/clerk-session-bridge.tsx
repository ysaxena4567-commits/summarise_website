"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";

export function ClerkSessionBridge() {
  const { isLoaded, isSignedIn, user } = useUser();

  useEffect(() => {
    if (!isLoaded) return;

    const email = user?.primaryEmailAddress?.emailAddress?.trim().toLowerCase();

    if (isSignedIn && email) {
      window.localStorage.setItem(
        "justflamsit-user",
        JSON.stringify({
          userId: user.id,
          email,
          provider: "clerk",
          name: user.fullName || user.firstName || undefined,
          emailVerified: user.primaryEmailAddress?.verification?.status === "verified",
        }),
      );
      return;
    }

    window.localStorage.removeItem("justflamsit-user");
  }, [isLoaded, isSignedIn, user]);

  return null;
}
