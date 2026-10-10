export function getSpotifyEnvironment() {
	return {
		clientId: process.env.SPOTIFY_CLIENT_ID || import.meta.env.SPOTIFY_CLIENT_ID,
		clientSecret: process.env.SPOTIFY_CLIENT_SECRET || import.meta.env.SPOTIFY_CLIENT_SECRET,
		refreshToken: process.env.SPOTIFY_REFRESH_TOKEN || import.meta.env.SPOTIFY_REFRESH_TOKEN,
	};
}
