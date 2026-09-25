"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMailSession } from "@/lib/session";

export default function HomePage() {
  const router = useRouter();
  const { accessToken } = useMailSession();

  useEffect(() => {
    router.replace(accessToken ? "/mail" : "/login");
  }, [accessToken, router]);

  return null;
}
