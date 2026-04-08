interface FirebaseLookupUser {
  localId?: string;
}

interface FirebaseLookupResponse {
  users?: FirebaseLookupUser[];
  error?: {
    message?: string;
  };
}

export async function verifyFirebaseIdToken(idToken: string): Promise<string | null> {
  const apiKey =
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    "AIzaSyADgT9wFdca22Br1j--Q6RnJW3JCpgvr6Q";
  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as FirebaseLookupResponse;
    const uid = data.users?.[0]?.localId;

    return uid && uid.trim().length > 0 ? uid : null;
  } catch {
    return null;
  }
}
