export function getPublicOrigin(request: Request, fallbackUrl: URL): string {
	const protocol = request.headers
		.get('cloudfront-forwarded-proto')
		?.split(',')[0]
		.trim()
		.toLowerCase();
	const host = request.headers.get('host');

	if ((protocol === 'https' || protocol === 'http') && host) {
		return new URL(`${protocol}://${host}`).origin;
	}

	return fallbackUrl.origin;
}
