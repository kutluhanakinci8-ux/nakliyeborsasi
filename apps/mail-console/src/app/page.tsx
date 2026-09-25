"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConsoleSession } from "@/lib/session";

export default function HomePage() {
  const router = useRouter();
  const { accessToken } = useConsoleSession();

  useEffect(() => {
    router.replace(accessToken ? "/dashboard" : "/login");
  }, [accessToken, router]);

  return null;
}
