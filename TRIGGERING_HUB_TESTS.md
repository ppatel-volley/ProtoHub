# Triggering Hub Functional Tests

This document explains how other teams can trigger Hub's functional tests from their own workflows.

## Prerequisites

<aside>

⚠️

**Required Setup**

- GitHub App `volley-workflow-trigger` exists with Actions (read/write) permissions
- Org secrets configured: `VOLLEY_WORKFLOW_TRIGGER_APP_ID` and `VOLLEY_WORKFLOW_TRIGGER_PRIVATE_KEY`
- The app is installed on the `hub` repository
- Your source repository has access to these org secrets

</aside>

## Setup: Add Hub to Org Secrets Access

1. Go to [https://github.com/organizations/Volley-Inc/settings/secrets/actions](https://github.com/organizations/Volley-Inc/settings/secrets/actions)
2. Click on `VOLLEY_WORKFLOW_TRIGGER_APP_ID` and add your repo to "Repository access"
3. Click on `VOLLEY_WORKFLOW_TRIGGER_PRIVATE_KEY` and add your repo to "Repository access"
4. Verify the GitHub App has `hub` added to its repository installations

## Triggering Hub Tests from Your Workflow

Add these steps to your deployment workflow after your deployment completes:

```yaml
jobs:
  your-deployment:
    steps:
      # ... your deployment steps ...

      - name: Generate GitHub App Token
        id: generate-token
        if: success()
        uses: actions/create-github-app-token@v1
        with:
          app-id: ${{ secrets.VOLLEY_WORKFLOW_TRIGGER_APP_ID }}
          private-key: ${{ secrets.VOLLEY_WORKFLOW_TRIGGER_PRIVATE_KEY }}
          owner: Volley-Inc
          repositories: hub

      - name: Trigger Hub Functional Tests
        if: success()
        continue-on-error: true
        env:
          GH_TOKEN: ${{ steps.generate-token.outputs.token }}
        run: |
          gh workflow run staging-functional-tests.yml \
            --repo Volley-Inc/hub \
            --ref main
          
          echo "✅ Hub functional tests triggered"
          echo "View results at: https://github.com/Volley-Inc/hub/actions/workflows/staging-functional-tests.yml"
```

### Optional: Wait for Test Results

If you want to wait for tests to complete and get the results:

```yaml
      - name: Trigger and Wait for Hub Tests
        if: success()
        continue-on-error: true
        env:
          GH_TOKEN: ${{ steps.generate-token.outputs.token }}
        run: |
          echo "Getting current runs before triggering..."
          BEFORE_RUNS=$(gh run list \
            --repo Volley-Inc/hub \
            --workflow=staging-functional-tests.yml \
            --limit 5 \
            --json databaseId \
            --jq '[.[].databaseId]')

          echo "Triggering Hub functional tests..."
          gh workflow run staging-functional-tests.yml \
            --repo Volley-Inc/hub \
            --ref main

          echo "Waiting for new workflow run to appear..."
          MAX_ATTEMPTS=60
          ATTEMPT=0
          RUN_ID=""

          while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
            sleep 2
            ATTEMPT=$((ATTEMPT + 1))
            
            LATEST_RUN=$(gh run list \
              --repo Volley-Inc/hub \
              --workflow=staging-functional-tests.yml \
              --limit 1 \
              --json databaseId \
              --jq '.[0].databaseId')
            
            if ! echo "$BEFORE_RUNS" | jq -e --argjson id "$LATEST_RUN" 'index($id) != null' > /dev/null; then
              RUN_ID=$LATEST_RUN
              echo "Found new workflow run: $RUN_ID"
              break
            fi
            
            echo "Attempt $ATTEMPT/$MAX_ATTEMPTS: No new run yet..."
          done

          if [ -z "$RUN_ID" ]; then
            echo "ERROR: Could not find the triggered workflow run"
            exit 1
          fi

          echo "Monitoring Hub tests: https://github.com/Volley-Inc/hub/actions/runs/$RUN_ID"
          
          gh run watch $RUN_ID --repo Volley-Inc/hub --exit-status
          RESULT=$?
          
          if [ $RESULT -eq 0 ]; then
            echo "✅ Hub functional tests PASSED"
          else
            echo "❌ Hub functional tests FAILED"
            exit 1
          fi
```

## Available Hub Test Workflows

### Staging Functional Tests

- **Workflow:** `staging-functional-tests.yml`
- **Target:** Tests against `https://game-clients-staging.volley.tv/hub/`
- **Duration:** ~5-10 minutes
- **Tests:** Full functional test suite (60+ tests)
- **When to trigger:** After staging client deployments or platform updates

## Running Tests Locally

You can also run Hub functional tests locally against staging:

```bash
cd hub/apps/client
pnpm test:functional:staging
```

This runs the same 60+ tests as CI but from your local machine against the live staging environment.

## Troubleshooting

### "Repository does not exist or is not accessible"

- Verify the GitHub App has access to the `hub` repository
- Check that org secrets (`VOLLEY_WORKFLOW_TRIGGER_APP_ID` and `VOLLEY_WORKFLOW_TRIGGER_PRIVATE_KEY`) have access to your source repository
- Ensure the app has Actions (read/write) permissions

### "Workflow not found"

- Verify the workflow filename is correct: `staging-functional-tests.yml`
- Ensure you're using the correct branch/ref (usually `main`)
- Check that the workflow exists at `hub/.github/workflows/staging-functional-tests.yml`

### Tests Timeout or Fail to Start

- Increase `MAX_ATTEMPTS` in the wait script
- Check that the staging Hub deployment is healthy
- Verify the GitHub token has proper permissions to trigger workflows

## Contact

For questions or issues with Hub test triggers, contact the Hub team or check the Hub repository's Actions tab for recent runs.
