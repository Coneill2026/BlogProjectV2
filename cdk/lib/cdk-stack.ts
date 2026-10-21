import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
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

    const spotifyClientIdSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      'SpotifyClientId',
      'proper-parallax/spotify/client-id',
    );
    const spotifyClientSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      'SpotifyClientSecret',
      'proper-parallax/spotify/client-secret',
    );
    const spotifyRefreshToken = secretsmanager.Secret.fromSecretNameV2(
      this,
      'SpotifyRefreshToken',
      'proper-parallax/spotify/refresh-token',
    );
    const spotifySecrets = {
      SPOTIFY_CLIENT_ID: ecs.Secret.fromSecretsManager(spotifyClientIdSecret),
      SPOTIFY_CLIENT_SECRET: ecs.Secret.fromSecretsManager(spotifyClientSecret),
      SPOTIFY_REFRESH_TOKEN: ecs.Secret.fromSecretsManager(spotifyRefreshToken),
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
        image: ecs.ContainerImage.fromAsset(path.resolve(__dirname, '../..'), {
          exclude: ['cdk/cdk.out', 'cdk/cdk.out/**'],
        }),
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

    const executionRole = app.taskDefinition.executionRole;
    if (!executionRole) {
      throw new Error('The ECS task definition must have an execution role.');
    }

    const executionRolePolicy = executionRole.node.tryFindChild('DefaultPolicy')?.node.defaultChild;
    if (!executionRolePolicy) {
      throw new Error('The ECS task execution role must have its generated policy.');
    }

    app.service.node.addDependency(executionRolePolicy);

    executionRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ['secretsmanager:GetSecretValue'],
        resources: [
          'arn:aws:secretsmanager:eu-north-1:701450111621:secret:proper-parallax/spotify/client-id*',
          'arn:aws:secretsmanager:eu-north-1:701450111621:secret:proper-parallax/spotify/client-secret*',
          'arn:aws:secretsmanager:eu-north-1:701450111621:secret:proper-parallax/spotify/refresh-token*',
        ],
      }),
    );

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
