"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { useEffect } from "react";

function buttonText(target: EventTarget | null) {
  if (!(target instanceof Element)) return "";
  const button = target.closest("button, a");
  return button?.textContent?.replace(/\s+/g, " ").trim().toLowerCase() || "";
}

function shouldUseClerk(text: string) {
  return (
    text === "log in" ||
    text === "sign up" ||
    text === "continue with email" ||
    text === "continue with google" ||
    text === "start summarizing free" ||
    text.includes("google") ||
    text.includes("create your free justflamsit account")
  );
}

function legacyAuthModalVisible() {
  return Boolean(
    Array.from(document.querySelectorAll("h1,h2,p,button,label")).some((node) => {
      const text = node.textContent?.replace(/\s+/g, " ").trim().toLowerCase() || "";
      return (
        text.includes("create your free justflamsit account") ||
        text.includes("continue with email") ||
        text.includes("your usage and pro plan are synced to this email")
      );
    }),
  );
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
    if (!isLoaded || isSignedIn) return;

    const redirectLegacyModal = () => {
      if (legacyAuthModalVisible()) {
        window.location.assign("/sign-in");
      }
    };

    redirectLegacyModal();
    const observer = new MutationObserver(redirectLegacyModal);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    const handleClick = async (event: MouseEvent) => {
      const text = buttonText(event.target);

      if (!isSignedIn && shouldUseClerk(text)) {
        event.preventDefault();
        event.stopPropagation();
        window.location.assign(text === "sign up" ? "/sign-up" : "/sign-in");
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
