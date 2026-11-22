"use client";

import { useMounted } from "@/hooks/use-mounted";

/** Defers rendering children until after client mount so client-only widgets skip SSR/prerender. */
export function ClientOnly({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const mounted = useMounted();
  if (!mounted) return <>{fallback}</>;
  return <>{children}</>;
}
