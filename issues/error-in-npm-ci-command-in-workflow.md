## Issue

The Github Actions job failed with the error:
```
/usr/bin/bash -e /home/runner/work/_temp/38ec3e85-a937-49e3-85d5-64c14bb9818c.sh
npm error code EUSAGE
npm error `npm ci` can only install packages when your package.json and package-lock.json or npm-shrinkwrap.json are in sync. Please update your lock file with `npm install` before continuing.
```

## Reproduction Steps
1. Trigger the workflow **Build and Deploy to ConoHa VPS (Docker)**.
2. Observe the failure in the **Install dependencies** step.

## Suggestion
As suggested by the error message, sync the `package.json` and `package-lock.json` files by running `npm install` locally before committing changes, so `npm ci` can succeed.

For further investigation, check the complete debug log attached in the job by [clicking here](https://github.com/p-o-ke-nae/pokenae.Web/actions/runs/21712941298/job/62621227787).

Assigning GitHub Copilot to investigate and resolve this issue.