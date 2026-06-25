"use client";

import { PrivyProvider } from "@privy-io/react-auth";

export function BearcoPrivyProviderInner({
  appId,
  children,
}: {
  appId: string;
  children: React.ReactNode;
}) {
  return (
    <PrivyProvider
      appId={appId}
      config={{
        appearance: {
          accentColor: "#fe6a00",
          theme: "dark",
        },
        embeddedWallets: {
          ethereum: { createOnLogin: "off" },
          solana: { createOnLogin: "off" },
        },
        legal: {
          privacyPolicyUrl: "/privacy",
        },
        loginMethods: ["email", "twitter", "telegram", "discord"],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
