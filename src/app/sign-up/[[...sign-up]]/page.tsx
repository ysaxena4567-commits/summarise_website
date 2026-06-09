import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#28282b] px-4 py-12 text-white">
      <SignUp
        appearance={{
          variables: {
            colorPrimary: "#c5b358",
            colorBackground: "#18181b",
            colorText: "#f8f7f0",
            colorInputBackground: "#0f0f11",
            colorInputText: "#f8f7f0",
            borderRadius: "0.5rem",
          },
        }}
      />
    </main>
  );
}
