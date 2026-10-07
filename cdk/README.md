# Deploy the Astro SSR application

The app runs in an Amazon ECS Fargate container behind an Application Load
Balancer. CloudFront provides the HTTPS URL and forwards requests to the SSR
server without caching responses. The container's `/api/health` endpoint is
used for load balancer health checks, and application logs are sent to
CloudWatch Logs.

## Deploy locally

Requirements:

- Node.js 22 or later
- Docker running locally
- AWS CLI credentials for the account and region configured in `bin/cdk.ts`
- CDK bootstrap completed in that account and region

From the repository root:

```sh
npm ci
npm run build
cd cdk
npm ci
npx cdk deploy
```

CDK builds and publishes the Docker image during deployment. When deployment
finishes, open the `SiteUrl` CloudFormation output. The previous S3 bucket
endpoint is not the application URL.

The Fargate task and public load balancer incur ongoing AWS charges. Review
the synthesized changes and expected costs before deploying.
