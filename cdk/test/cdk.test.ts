import * as cdk from 'aws-cdk-lib';
import { performance } from 'perf_hooks';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { AstroSsrStack } from '../lib/cdk-stack';

Object.defineProperty(globalThis, 'performance', { value: performance, configurable: true });

test('deploys the SSR app behind an uncached HTTPS CloudFront distribution', () => {
	const app = new cdk.App();
	const stack = new AstroSsrStack(app, 'StaticSiteStack', {
		env: { account: '701450111621', region: 'eu-north-1' },
	});
	const template = Template.fromStack(stack);

	template.hasResourceProperties('AWS::ECS::TaskDefinition', {
		Cpu: '512',
		Memory: '1024',
		ExecutionRoleArn: Match.objectLike({
			'Fn::GetAtt': Match.anyValue(),
		}),
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
						ValueFrom: Match.anyValue(),
					},
					{
						Name: 'SPOTIFY_CLIENT_SECRET',
						ValueFrom: Match.anyValue(),
					},
					{
						Name: 'SPOTIFY_REFRESH_TOKEN',
						ValueFrom: Match.anyValue(),
					},
				]),
			}),
		]),
	});

	const rolePolicy = Object.values(template.findResources('AWS::IAM::Policy'))
		.find((resource) => resource.Properties.PolicyName.includes('ExecutionRoleDefaultPolicy'));
	expect(rolePolicy).toBeDefined();
	const rolePolicyJson = JSON.stringify(rolePolicy);
	expect(rolePolicyJson).toContain('secretsmanager:GetSecretValue');
	expect(rolePolicyJson).toContain('client-id-nMBcGL');
	expect(rolePolicyJson).toContain('client-secret-e1XdD2');
	expect(rolePolicyJson).toContain('refresh-token-T3nc2p');

	template.hasResource('AWS::ECS::Service', {
		DependsOn: Match.arrayWith([
			Match.stringLikeRegexp('ExecutionRoleDefaultPolicy'),
		]),
	});

	template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
		HealthCheckPath: '/api/health',
	});

	template.hasResourceProperties('AWS::CloudFront::Distribution', {
		DistributionConfig: {
			Origins: Match.arrayWith([
				Match.objectLike({
					CustomOriginConfig: Match.objectLike({
						OriginProtocolPolicy: 'http-only',
					}),
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
