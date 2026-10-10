import type { APIRoute } from 'astro';
import { getSpotifyEnvironment } from '../../../utils/spotify-env';

interface SpotifyArtist {
	name: string;
	images?: { url: string }[];
	external_urls?: { spotify?: string };
}

interface SpotifyTrack {
	name: string;
	artists: { name: string }[];
	album?: { images?: { url: string }[] };
	external_urls?: { spotify?: string };
	duration_ms: number;
}

interface SpotifyRecentPlay {
	played_at: string;
	track: { duration_ms: number };
}

interface SpotifyItems<T> {
	items: T[];
}

interface CachedStats {
	expiresAt: number;
	payload: {
		artists: { name: string; imageUrl?: string; url?: string }[];
		tracks: { name: string; subtitle: string; imageUrl?: string; url?: string }[];
		weeklySummary: { tracksPlayed: number; estimatedMinutes: number };
		fetchedAt: string;
	};
}

let accessToken: { value: string; expiresAt: number } | undefined;
let cachedStats: CachedStats | undefined;

function jsonResponse(status: number, payload: Record<string, unknown>, cache = 'no-store') {
	return new Response(JSON.stringify(payload), {
		status,
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Cache-Control': cache,
		},
	});
}

async function getAccessToken(clientId: string, clientSecret: string, refreshToken: string) {
	if (accessToken && accessToken.expiresAt > Date.now() + 60_000) return accessToken.value;

	const response = await fetch('https://accounts.spotify.com/api/token', {
		method: 'POST',
		headers: {
			Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: new URLSearchParams({
			grant_type: 'refresh_token',
			refresh_token: refreshToken,
		}),
	});
	if (!response.ok) {
		throw new Error(`Spotify token refresh failed (HTTP ${response.status}).`);
	}
	const result = (await response.json()) as { access_token: string; expires_in: number };
	if (!result.access_token || typeof result.expires_in !== 'number') {
		throw new Error('Spotify returned an invalid token response.');
	}

	accessToken = {
		value: result.access_token,
		expiresAt: Date.now() + result.expires_in * 1000,
	};
	return accessToken.value;
}

async function getTopItems<T>(kind: 'artists' | 'tracks', token: string): Promise<T[]> {
	const response = await fetch(
		`https://api.spotify.com/v1/me/top/${kind}?limit=10&time_range=short_term`,
		{ headers: { Authorization: `Bearer ${token}` } },
	);
	if (!response.ok) {
		throw new Error(`Spotify top ${kind} request failed (HTTP ${response.status}).`);
	}
	const result = (await response.json()) as SpotifyItems<T>;
	if (!Array.isArray(result.items)) throw new Error(`Spotify returned invalid ${kind} data.`);
	return result.items;
}

async function spotifyError(response: Response, request: string) {
	let detail = '';
	try {
		const body = (await response.json()) as {
			error?: { message?: string };
			message?: string;
		};
		detail = body.error?.message ?? body.message ?? '';
	} catch {
		detail = '';
	}
	return new Error(
		`Spotify ${request} request failed (HTTP ${response.status})${detail ? `: ${detail}` : '.'}`,
	);
}

async function getWeeklySummary(token: string) {
	const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
	const firstPage = new URL('https://api.spotify.com/v1/me/player/recently-played');
	firstPage.search = new URLSearchParams({ limit: '50', after: String(weekAgo) }).toString();
	let nextUrl: string | null = firstPage.href;
	let tracksPlayed = 0;
	let totalDurationMs = 0;

	while (nextUrl) {
		const pageUrl = new URL(nextUrl);
		if (pageUrl.origin !== 'https://api.spotify.com') {
			throw new Error('Spotify returned an unexpected recent-plays page URL.');
		}

		const response = await fetch(pageUrl, {
			headers: { Authorization: `Bearer ${token}` },
		});
		if (!response.ok) {
			throw await spotifyError(response, 'recent plays');
		}
		const page = (await response.json()) as {
			items: SpotifyRecentPlay[];
			next: string | null;
		};
		if (!Array.isArray(page.items)) throw new Error('Spotify returned invalid recent-plays data.');

		for (const play of page.items) {
			const playedAt = Date.parse(play.played_at);
			if (Number.isFinite(playedAt) && playedAt >= weekAgo && playedAt <= Date.now()) {
				tracksPlayed += 1;
				totalDurationMs += play.track.duration_ms;
			}
		}
		nextUrl = page.next;
	}

	return {
		tracksPlayed,
		estimatedMinutes: Math.round(totalDurationMs / 60_000),
	};
}

export const GET: APIRoute = async () => {
	if (cachedStats && cachedStats.expiresAt > Date.now()) {
		return jsonResponse(200, cachedStats.payload, 'public, max-age=300, s-maxage=300');
	}

	const { clientId, clientSecret, refreshToken } = getSpotifyEnvironment();
	if (!clientId || !clientSecret || !refreshToken) {
		return jsonResponse(503, { error: 'Spotify listening stats are not configured.' });
	}

	try {
		const token = await getAccessToken(clientId, clientSecret, refreshToken);
		const [artists, tracks, weeklySummary] = await Promise.all([
			getTopItems<SpotifyArtist>('artists', token),
			getTopItems<SpotifyTrack>('tracks', token),
			getWeeklySummary(token),
		]);
		const payload = {
			artists: artists.map((artist) => ({
				name: artist.name,
				imageUrl: artist.images?.[0]?.url,
				url: artist.external_urls?.spotify,
			})),
			tracks: tracks.map((track) => ({
				name: track.name,
				subtitle: track.artists.map((artist) => artist.name).join(', '),
				imageUrl: track.album?.images?.[0]?.url,
				url: track.external_urls?.spotify,
			})),
			weeklySummary,
			fetchedAt: new Date().toISOString(),
		};
		cachedStats = { payload, expiresAt: Date.now() + 5 * 60_000 };
		return jsonResponse(200, payload, 'public, max-age=300, s-maxage=300');
	} catch (error) {
		console.error('Failed to load public Spotify listening stats:', error);
		return jsonResponse(502, {
			error:
				error instanceof Error
					? error.message
					: 'Unable to load Spotify listening stats.',
		});
	}
};
