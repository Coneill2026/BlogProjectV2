import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { StaticSiteStack } from '../lib/cdk-stack';

test('CloudFront rewrites directory routes to their index pages', () => {
	const app = new cdk.App();
	const stack = new StaticSiteStack(app, 'StaticSiteStack');
	const template = Template.fromStack(stack);

	template.hasResourceProperties('AWS::CloudFront::Distribution', {
		DistributionConfig: {
			DefaultCacheBehavior: {
				FunctionAssociations: Match.arrayWith([
					{
						EventType: 'viewer-request',
						FunctionARN: Match.anyValue(),
					},
				]),
			},
		},
	});
});
