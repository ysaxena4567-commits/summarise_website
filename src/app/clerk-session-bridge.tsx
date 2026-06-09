"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { useEffect } from "react";

function buttonText(target: EventTarget | null) {
  if (!(target instanceof Element)) return "";
  const button = target.closest("button, a");
  return button?.textContent?.replace(/\s+/g, " ").trim().toLowerCase() || "";
}

export function ClerkSessionBridge() {
  const { signOut } = useClerk();
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

  useEffect(() => {
    const handleClick = async (event: MouseEvent) => {
      const text = buttonText(event.target);

      if (!isSignedIn && (text === "log in" || text === "continue with email")) {
        event.preventDefault();
        event.stopPropagation();
        window.location.assign("/sign-in");
        return;
      }

      if (isSignedIn && text.startsWith("log out")) {
        event.preventDefault();
        event.stopPropagation();
        await signOut({ redirectUrl: "/" });
      }
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [isSignedIn, signOut]);

  return null;
}
