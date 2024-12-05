#!/bin/bash
aws ssm start-session \
  --target i-0e1b1748173455842 \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters host=allwhere-db-production-replica-20240809.cggmfpvpxjvr.us-east-2.rds.amazonaws.com,portNumber=5432,localPortNumber=9001 \
  --profile dev-sso \
  | xargs
