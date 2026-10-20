import * as cdk from 'aws-cdk-lib';
import { performance } from 'perf_hooks';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { AstroSsrStack } from '../lib/cdk-stack';

Object.defineProperty(globalThis, 'performance', { value: performance, configurable: true });

test('deploys the SSR app behind an uncached HTTPS CloudFront distribution', () => {
	const app = new cdk.App();
	const stack = new AstroSsrStack(app, 'StaticSiteStack');
	const template = Template.fromStack(stack);

	template.hasResourceProperties('AWS::ECS::TaskDefinition', {
		Cpu: '512',
		Memory: '1024',
		ContainerDefinitions: Match.arrayWith([
			Match.objectLike({
				PortMappings: Match.arrayWith([
					Match.objectLike({ ContainerPort: 4321 }),
				]),
				Environment: Match.arrayWith([
					{ Name: 'HOST', Value: '0.0.0.0' },
					{ Name: 'PORT', Value: '4321' },
				]),
				Secrets: Match.arrayWith([
					{
						Name: 'SPOTIFY_CLIENT_ID',
						ValueFrom:
							'arn:aws:secretsmanager:us-east-1:701450111621:secret:proper-parallax/spotify/client-id-NgQaVY',
					},
					{
						Name: 'SPOTIFY_CLIENT_SECRET',
						ValueFrom:
							'arn:aws:secretsmanager:us-east-1:701450111621:secret:proper-parallax/spotify/client-secret-eAmQfC',
					},
					{
						Name: 'SPOTIFY_REFRESH_TOKEN',
						ValueFrom:
							'arn:aws:secretsmanager:us-east-1:701450111621:secret:proper-parallax/spotify/refresh-token-2w6xvP',
					},
				]),
			}),
		]),
	});

	template.hasResourceProperties('AWS::IAM::Policy', {
		PolicyDocument: Match.objectLike({
			Statement: Match.arrayWith([
				Match.objectLike({
					Action: Match.arrayWith(['secretsmanager:GetSecretValue']),
					Resource:
						'arn:aws:secretsmanager:us-east-1:701450111621:secret:proper-parallax/spotify/client-id-NgQaVY',
				}),
				Match.objectLike({
					Action: Match.arrayWith(['secretsmanager:GetSecretValue']),
					Resource:
						'arn:aws:secretsmanager:us-east-1:701450111621:secret:proper-parallax/spotify/client-secret-eAmQfC',
				}),
				Match.objectLike({
					Action: Match.arrayWith(['secretsmanager:GetSecretValue']),
					Resource:
						'arn:aws:secretsmanager:us-east-1:701450111621:secret:proper-parallax/spotify/refresh-token-2w6xvP',
				}),
			]),
		}),
	});

	template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
		HealthCheckPath: '/api/health',
	});

	template.hasResource('AWS::ECS::Service', {
		DependsOn: Match.arrayWith([
			Match.stringLikeRegexp('WebServiceTaskDefExecutionRoleDefaultPolicy'),
		]),
	});

	template.hasResourceProperties('AWS::CloudFront::Distribution', {
		DistributionConfig: {
			Origins: Match.arrayWith([
				Match.objectLike({
					CustomOriginConfig: Match.anyValue(),
				}),
			]),
			DefaultCacheBehavior: {
				ViewerProtocolPolicy: 'redirect-to-https',
				CachePolicyId: Match.anyValue(),
				OriginRequestPolicyId: '33f36d7e-f396-46d9-90e0-52428a34d9dc',
				AllowedMethods: Match.arrayWith(['GET', 'HEAD', 'OPTIONS', 'PUT', 'PATCH', 'POST', 'DELETE']),
			},
		},
	});

	template.hasOutput('SiteUrl', {
		Description: 'Open this CloudFront URL to view the SSR application.',
		Value: Match.anyValue(),
	});
});
