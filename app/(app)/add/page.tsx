"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AddPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/home");
  }, [router]);
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-4">
      <p className="text-muted-foreground">Redirecting...</p>
    </div>
  );
}
