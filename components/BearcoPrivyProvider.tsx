"use client";

import dynamic from "next/dynamic";

const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim();

const BearcoPrivyProviderInner = dynamic(
  () =>
    import("@/components/BearcoPrivyProviderInner").then(
      (mod) => mod.BearcoPrivyProviderInner,
    ),
  { ssr: false },
);

export function isBearcoPrivyEnabled(): boolean {
  return Boolean(privyAppId);
}

export function BearcoPrivyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!privyAppId) return children;

  return (
    <BearcoPrivyProviderInner appId={privyAppId}>
      {children}
    </BearcoPrivyProviderInner>
  );
}
