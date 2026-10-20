import type { APIRoute } from 'astro';
import { randomBytes } from 'node:crypto';
import { getPublicOrigin } from '../../../utils/public-origin';
import { getSpotifyEnvironment } from '../../../utils/spotify-env';

export const GET: APIRoute = async ({ request, url }) => {
	const { clientId } = getSpotifyEnvironment();
	if (!clientId) {
		return new Response('Spotify client ID is not configured.', { status: 503 });
	}

	const publicOrigin = getPublicOrigin(request, url);
	const state = randomBytes(32).toString('hex');
	const callbackUrl = new URL('/api/spotify/callback', publicOrigin).href;
	const authorizeUrl = new URL('https://accounts.spotify.com/authorize');
	authorizeUrl.search = new URLSearchParams({
		client_id: clientId,
		response_type: 'code',
		redirect_uri: callbackUrl,
		scope: 'user-top-read user-read-recently-played',
		state,
		show_dialog: 'true',
	}).toString();

	const headers = new Headers({
		Location: authorizeUrl.href,
		'Cache-Control': 'no-store',
	});
	headers.append(
		'Set-Cookie',
		`spotify_oauth_state=${state}; HttpOnly; SameSite=Lax; Path=/api/spotify/callback; Max-Age=600${publicOrigin.startsWith('https://') ? '; Secure' : ''}`,
	);
	return new Response(null, { status: 302, headers });
};
