"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase-client";

export function useAuthUser() {
  const [user, setUser] = useState<User | null>(firebaseAuth?.currentUser ?? null);
  const [loading, setLoading] = useState(Boolean(firebaseAuth));

  useEffect(() => {
    if (!firebaseAuth) {
      return;
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (!firebaseAuth) {
    return { user: null, loading: false };
  }

  return { user, loading };
}

export async function authHeader(user: User | null): Promise<Record<string, string>> {
  if (!user || !firebaseAuth) {
    return {};
  }

  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
  };
}
