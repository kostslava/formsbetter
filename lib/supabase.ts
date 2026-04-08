import { createClient } from "@supabase/supabase-js";

const FALLBACK_URL = "https://placeholder.supabase.co";
const FALLBACK_ANON_KEY = "public-anon-placeholder";

function isHttpUrl(value: string | undefined): value is string {
	if (!value) {
		return false;
	}

	try {
		const url = new URL(value);
		return url.protocol === "http:" || url.protocol === "https:";
	} catch {
		return false;
	}
}

export const supabase = createClient(
	isHttpUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
		? process.env.NEXT_PUBLIC_SUPABASE_URL
		: FALLBACK_URL,
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? FALLBACK_ANON_KEY
);

export function createSupabaseServiceClient() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!isHttpUrl(url) || !serviceKey) {
		throw new Error(
			"Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
		);
	}

	return createClient(url, serviceKey, {
		auth: {
			persistSession: false,
			autoRefreshToken: false,
		},
	});
}
