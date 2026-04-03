# AWS SAM + React Deployment Demo

This repository contains:
- A Swagger-driven AWS SAM backend
- A simple React frontend (Vite)
- GitHub Actions CI/CD for backend and frontend using AWS OIDC

## Folder structure

```text
.
|-- .github/
|   `-- workflows/
|       |-- deploy.yml
|       `-- deploy-frontend.yml
|-- src/
|-- public/
|-- index.html
|-- package.json
|-- vite.config.js
`-- backend/
    |-- api/
    |-- api_gateway/
    |   `-- api-gateway-export.json
    |-- lambda_functions/
    |   |-- demo_auth_api.cjs
    |   |-- demo_dashboard_api.cjs
    |   `-- demo_employee_api.cjs
    |-- layers/
    |   `-- demo_common/
    |       `-- nodejs/
    |           `-- demo-shared.cjs
    |-- local/
    |   |-- local_lambda_adapter.cjs
    |   `-- route-config.json
    |-- scripts/
    |   `-- generate-template.js
    |-- package.json
    `-- template.yaml
```

## Step-by-step setup

1. Install prerequisites: Node.js 22+, AWS SAM CLI, Docker, Git, and an AWS account.
2. Create an empty GitHub repository.
3. Copy this project into that repository.
4. From `backend/`, run `npm install`.
5. Generate the SAM template with `npm run generate-template`.
6. Run locally with `npm run start-local`.
7. Create one S3 artifact bucket in AWS for SAM deployments.
8. Create one GitHub OIDC IAM role in AWS for deployment.
9. Add the required GitHub Actions secrets.
10. Push to `main` to deploy backend and frontend.

## Local commands

```bash
cd backend
npm install
npm run generate-template
npm run start-local
```

Example API calls:

```bash
curl -X POST http://127.0.0.1:3000/login
curl http://127.0.0.1:3000/dashboard/get_summary
curl http://127.0.0.1:3000/employee/list
curl -X POST http://127.0.0.1:3000/employee/add -H "Content-Type: application/json" -d '{"name":"Demo User","department":"HR"}'
```

## Git commands

```bash
git init
git branch -M main
git add .
git commit -m "Initial AWS SAM serverless demo"
git remote add origin https://github.com/<your-org-or-user>/<your-repo>.git
git push -u origin main
```

## GitHub Actions secrets

Add these repository secrets:

- `AWS_REGION` (example: `us-east-1`)
- `AWS_DEPLOY_ROLE_ARN`
- `SAM_ARTIFACT_BUCKET`
- `FRONTEND_S3_BUCKET`

## GitHub OIDC trust policy

Replace the placeholders with your AWS account ID, GitHub org/user, and repository name:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<aws-account-id>:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:<github-org-or-user>/<repo-name>:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

## IAM permissions for deploy role

For a demo project, the role should be allowed to deploy CloudFormation stacks, upload artifacts to the SAM bucket, pass IAM roles created by the stack, manage API Gateway and Lambda resources created by CloudFormation, and upload frontend files to S3.

You can start with a scoped custom policy similar to:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudformation:*",
        "lambda:*",
        "apigateway:*",
        "logs:*",
        "s3:*",
        "iam:PassRole"
      ],
      "Resource": "*"
    }
  ]
}
```

Tighten this before using it in a real environment.

## Deployment flow

- Push to `main`
- Backend workflow (`deploy.yml`) generates `template.yaml`, builds SAM, and deploys the `serverless-demo` stack
- Frontend workflow (`deploy-frontend.yml`) runs `npm run build` and syncs `dist/` to `FRONTEND_S3_BUCKET`

## Notes

- `backend/api_gateway/api-gateway-export.json` is the source of truth for routes and Lambda ownership.
- `backend/scripts/generate-template.js` generates `backend/template.yaml`.
- `backend/layers/demo_common/nodejs/demo-shared.cjs` contains shared utilities packaged as a Lambda layer.
- Each Lambda owns multiple related routes.
- The local adapter is enabled only for `sam local start-api` through `EnableLocalAdapter=true`.
