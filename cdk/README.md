# Deploy the Astro SSR application

The app runs in an Amazon ECS Fargate container behind an Application Load
Balancer. CloudFront provides the HTTPS URL and forwards requests to the SSR
server without caching responses. The container's `/api/health` endpoint is
used for load balancer health checks, and application logs are sent to
CloudWatch Logs.

The ECS task reads `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, and
`SPOTIFY_REFRESH_TOKEN` from AWS Secrets Manager. Before deployment, create
three secrets in the stack's AWS account and `us-east-1` region with these
exact names:

- `proper-parallax/spotify/client-id`
- `proper-parallax/spotify/client-secret`
- `proper-parallax/spotify/refresh-token`

Create each as a plaintext secret containing only its corresponding Spotify
value. Do not put secret values in CDK context, GitHub variables, or source
control. For the first deployment, the refresh token can be a temporary
placeholder; the client ID and secret must be valid for Spotify authorization.
The CDK stack references the complete ARNs of these existing secrets. If you
delete and recreate one, update its ARN in `lib/cdk-stack.ts` to include the
new Secrets Manager suffix before deploying.

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

For Spotify OAuth, add `<SiteUrl>/api/spotify/callback` as a redirect URI in
the Spotify Developer Dashboard, then open `<SiteUrl>/api/spotify/authorize`.
After authorization, save the displayed refresh token into
`proper-parallax/spotify/refresh-token` in Secrets Manager. Force a new ECS
deployment so the task receives the updated secret value.

For GitHub Actions deployment from `main`, configure repository secrets
`AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` for the account and region
above. The three Spotify secrets must exist in Secrets Manager before the
workflow deploys.

The Fargate task and public load balancer incur ongoing AWS charges. Review
the synthesized changes and expected costs before deploying.
