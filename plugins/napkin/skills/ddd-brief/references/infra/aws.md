<!-- infra-preset: aws -->

## Deployment
- Target: container
- Environment config: <env-config>
- IaC: Pulumi
- Clouds: aws
- Environments: preview, staging, production
- Preview: per-PR

## Pipeline
- CI: GitHub Actions
- Branching: GitHub Flow
- Branch map: feature/* → preview · main → staging · staging → production (manual)
- Gates: lint · type-check · test · build · deploy
