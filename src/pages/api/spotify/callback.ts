import type { APIRoute } from 'astro';
import { getPublicOrigin } from '../../../utils/public-origin';
import { getSpotifyEnvironment } from '../../../utils/spotify-env';

function escapeHtml(value: string) {
	return value.replace(/[&<>"']/g, (character) => {
		const entities: Record<string, string> = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#39;',
		};
		return entities[character];
	});
}

export const GET: APIRoute = async ({ request, url }) => {
	const publicOrigin = getPublicOrigin(request, url);
	const headers = new Headers({
		'Set-Cookie': `spotify_oauth_state=; HttpOnly; SameSite=Lax; Path=/api/spotify/callback; Max-Age=0${publicOrigin.startsWith('https://') ? '; Secure' : ''}`,
	});
	const fail = (message: string, status = 400) =>
		new Response(message, {
			status,
			headers: {
				...Object.fromEntries(headers.entries()),
				'Content-Type': 'text/plain; charset=utf-8',
				'Cache-Control': 'no-store',
			},
		});

	const code = url.searchParams.get('code');
	const returnedState = url.searchParams.get('state');
	const oauthError = url.searchParams.get('error');
	const cookie = request.headers.get('Cookie') ?? '';
	const expectedState = cookie.match(/(?:^|;\s*)spotify_oauth_state=([a-f0-9]+)/)?.[1];
	if (oauthError) return fail('Spotify authorization was cancelled or denied.');
	if (!code || !returnedState || !expectedState || returnedState !== expectedState) {
		return fail('Spotify authorization could not be verified. Start setup again.');
	}

	const { clientId, clientSecret } = getSpotifyEnvironment();
	if (!clientId || !clientSecret) {
		return fail('Spotify client credentials are not configured on the server.', 503);
	}

	try {
		const response = await fetch('https://accounts.spotify.com/api/token', {
			method: 'POST',
			headers: {
				Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: new URLSearchParams({
				grant_type: 'authorization_code',
				code,
				redirect_uri: new URL('/api/spotify/callback', publicOrigin).href,
			}),
		});
		if (!response.ok) {
			console.error(`Spotify authorization-code exchange failed (HTTP ${response.status}).`);
			return fail('Spotify could not complete authorization. Check the app redirect URI and try again.', 502);
		}
		const result = (await response.json()) as { refresh_token?: string };
		if (!result.refresh_token) {
			return fail('Spotify did not return a refresh token. Revoke this app and authorize it again.', 502);
		}

		const token = escapeHtml(result.refresh_token);
		return new Response(
			`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Spotify setup</title><style>body{max-width:45rem;margin:3rem auto;padding:0 1rem;font:1rem/1.6 system-ui;background:#242424;color:#eee}textarea{box-sizing:border-box;width:100%;min-height:7rem;padding:.75rem}</style><h1>Spotify authorization complete</h1><p>For ECS, save this refresh token as the value of <code>proper-parallax/spotify/refresh-token</code> in AWS Secrets Manager. For local development, set it as <code>SPOTIFY_REFRESH_TOKEN</code> in your server environment. Do not share it or add it to source control.</p><textarea readonly>${token}</textarea><p>You can close this page after saving the token securely.</p></html>`,
			{
				status: 200,
				headers: {
					...Object.fromEntries(headers.entries()),
					'Content-Type': 'text/html; charset=utf-8',
					'Cache-Control': 'no-store',
					'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'",
					'Referrer-Policy': 'no-referrer',
					'X-Content-Type-Options': 'nosniff',
				},
			},
		);
	} catch (error) {
		console.error('Spotify authorization callback failed:', error);
		return fail('Spotify authorization failed unexpectedly. Try setup again.', 502);
	}
};
