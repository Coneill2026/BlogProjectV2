# Deploy the Astro SSR application

The app runs in an Amazon ECS Fargate container behind an Application Load
Balancer. CloudFront provides the HTTPS URL and forwards requests to the SSR
server without caching responses. The container's `/api/health` endpoint is
used for load balancer health checks, and application logs are sent to
CloudWatch Logs.

The ECS task reads `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, and
`SPOTIFY_REFRESH_TOKEN` from AWS Secrets Manager. Before deployment, create
three secrets in the stack's AWS account and `eu-north-1` region with these
exact names:

- `proper-parallax/spotify/client-id`
- `proper-parallax/spotify/client-secret`
- `proper-parallax/spotify/refresh-token`

Create each as a plaintext secret containing only its corresponding Spotify
value. Do not put secret values in CDK context, GitHub variables, or source
control. For the first deployment, the refresh token can be a temporary
placeholder; the client ID and secret must be valid for Spotify authorization.
The CDK stack imports these secrets by name, so create them in `eu-north-1`
before deploying.

## Deploy locally

Requirements:

- Node.js 22 or later
- Docker running locally
- AWS CLI credentials for the account and region configured in `bin/cdk.ts`

From the repository root:

```sh
npm ci
npm run build
cd cdk
npm ci
npx cdk bootstrap aws://701450111621/eu-north-1
npx cdk deploy
```

The GitHub Actions deployment workflow bootstraps this environment before
deploying. Its AWS credentials must be allowed to create or update the CDK
bootstrap resources in this account and region. Bootstrap is safe to run more
than once; for local deployment, it only needs to be run once per account and
region.

CDK builds and publishes the Docker image during deployment. When deployment
finishes, open the `SiteUrl` CloudFormation output. The previous S3 bucket
endpoint is not the application URL.

For Spotify OAuth, add `<SiteUrl>/api/spotify/callback` as a redirect URI in
the Spotify Developer Dashboard, then open `<SiteUrl>/api/spotify/authorize`.
After authorization, save the displayed refresh token into
`proper-parallax/spotify/refresh-token` in Secrets Manager. Force a new ECS
deployment so the task receives the updated secret value.

For GitHub Actions deployment from `main`, configure repository secrets
`AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` for the account and region
above. The three Spotify secrets must exist in Secrets Manager before the
workflow deploys.

The workflow deploys the CDK stack to `eu-north-1`; it does not adopt or
replace an existing ECS service created outside this CDK stack. The previous
`us-east-1` stack remains running until it is explicitly destroyed.

The Fargate task and public load balancer incur ongoing AWS charges. Review
the synthesized changes and expected costs before deploying.
