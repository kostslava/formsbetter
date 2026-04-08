const CREATOR_TOKEN_KEY = "formsbetter_creator_token";

function newToken(): string {
  return `${crypto.randomUUID()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateCreatorToken(): string {
  const existing = window.localStorage.getItem(CREATOR_TOKEN_KEY);
  if (existing) {
    return existing;
  }

  const token = newToken();
  window.localStorage.setItem(CREATOR_TOKEN_KEY, token);
  return token;
}

export function setCreatorToken(token: string): void {
  window.localStorage.setItem(CREATOR_TOKEN_KEY, token);
}
