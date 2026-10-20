import { describe, expect, it } from 'vitest';
import { getPublicOrigin } from './public-origin';

describe('getPublicOrigin', () => {
	it('uses the public host and protocol forwarded by CloudFront', () => {
		const request = new Request('http://internal-alb.local/api/spotify/authorize', {
			headers: {
				host: 'd1234567890.cloudfront.net',
				'cloudfront-forwarded-proto': 'https',
			},
		});

		expect(getPublicOrigin(request, new URL(request.url))).toBe('https://d1234567890.cloudfront.net');
	});

	it('uses the request origin outside CloudFront', () => {
		const request = new Request('http://127.0.0.1:4321/api/spotify/authorize');

		expect(getPublicOrigin(request, new URL(request.url))).toBe('http://127.0.0.1:4321');
	});
});
