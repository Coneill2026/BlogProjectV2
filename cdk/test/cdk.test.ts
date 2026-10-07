import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { AstroSsrStack } from '../lib/cdk-stack';

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
			}),
		]),
	});

	template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
		HealthCheckPath: '/api/health',
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
				OriginRequestPolicyId: Match.anyValue(),
				AllowedMethods: Match.arrayWith(['GET', 'HEAD', 'OPTIONS', 'PUT', 'PATCH', 'POST', 'DELETE']),
			},
		},
	});

	template.hasOutput('SiteUrl', {
		Description: 'Open this CloudFront URL to view the SSR application.',
		Value: Match.anyValue(),
	});
});
