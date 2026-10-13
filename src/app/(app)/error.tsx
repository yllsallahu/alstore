"use client";

import { ErrorPanel } from "@/components/error-panel";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorPanel digest={error.digest} onRetry={reset} />;
}
