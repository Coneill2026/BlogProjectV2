import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as path from 'path';

export class AstroSsrStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
      ],
    });

    const spotifySecrets = {
      SPOTIFY_CLIENT_ID: ecs.Secret.fromSecretsManager(
        secretsmanager.Secret.fromSecretNameV2(
          this,
          'SpotifyClientId',
          'proper-parallax/spotify/client-id',
        ),
      ),
      SPOTIFY_CLIENT_SECRET: ecs.Secret.fromSecretsManager(
        secretsmanager.Secret.fromSecretNameV2(
          this,
          'SpotifyClientSecret',
          'proper-parallax/spotify/client-secret',
        ),
      ),
      SPOTIFY_REFRESH_TOKEN: ecs.Secret.fromSecretsManager(
        secretsmanager.Secret.fromSecretNameV2(
          this,
          'SpotifyRefreshToken',
          'proper-parallax/spotify/refresh-token',
        ),
      ),
    };

    const app = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'WebService', {
      vpc,
      publicLoadBalancer: true,
      assignPublicIp: true,
      healthCheckGracePeriod: cdk.Duration.seconds(60),
      taskSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      cpu: 512,
      memoryLimitMiB: 1024,
      desiredCount: 1,
      minHealthyPercent: 100,
      circuitBreaker: { rollback: true },
      taskImageOptions: {
        image: ecs.ContainerImage.fromAsset(path.resolve(__dirname, '../..')),
        containerPort: 4321,
        environment: {
          HOST: '0.0.0.0',
          NODE_ENV: 'production',
          PORT: '4321',
        },
        secrets: spotifySecrets,
        logDriver: ecs.LogDrivers.awsLogs({ streamPrefix: 'proper-parallax' }),
      },
    });

    app.targetGroup.configureHealthCheck({
      path: '/api/health',
      healthyHttpCodes: '200',
    });
    const distribution = new cloudfront.Distribution(this, 'SiteDistribution', {
      defaultBehavior: {
        origin: new origins.HttpOrigin(app.loadBalancer.loadBalancerDnsName),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_AND_CLOUDFRONT_2022,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      },
    });

    new cdk.CfnOutput(this, 'SiteUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'Open this CloudFront URL to view the SSR application.',
    });
  }
}
