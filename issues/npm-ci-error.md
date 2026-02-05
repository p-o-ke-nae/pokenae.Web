## Issue

The following error occurred during a GitHub Actions job execution:
```
/usr/bin/bash -e /home/runner/work/_temp/38ec3e85-a937-49e3-85d5-64c14bb9818c.sh
npm error code EUSAGE
npm error `npm ci` can only install packages when your package.json and package-lock.json or npm-shrinkwrap.json are in sync. Please update your lock file with `npm install` before continuing.
```

## Steps to Reproduce
1. Trigger the **Build and Deploy to ConoHa VPS (Docker)** workflow.
2. Observe the issue during the **Install dependencies** step.

## Suggestion
Sync the `package.json` and `package-lock.json` files by running `npm install` locally before committing changes. Ensure both files are consistent.

For additional context, the debug log from the workflow can be seen [here](https://github.com/p-o-ke-nae/pokenae.Web/actions/runs/21712941298/job/62621227787).