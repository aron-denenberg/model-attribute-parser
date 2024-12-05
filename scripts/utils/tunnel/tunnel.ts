import { SSMClient, StartSessionCommand, StartSessionCommandInput } from '@aws-sdk/client-ssm';
import WebSocket from 'ws';
require('dotenv').config({ path: `.env.${process.env.NODE_ENV}` });

export async function startTunnelingSession() {
  const client = new SSMClient({ region: 'us-east-2' });

  const params: StartSessionCommandInput = {
      DocumentName: 'AWS-StartPortForwardingSessionToRemoteHost',
      Target: process.env.TARGET,
      Parameters: {
            'host': [process.env.HOST!],
            'portNumber': [process.env.HOST_PORT!],
            'localPortNumber': [process.env.LOCAL_PORT!]
      },
  };

  try {
      const command = new StartSessionCommand(params);

      const resp = await client.send(command);
      
    
      const value = resp?.SessionId;
      
      if (!value) {
        throw new Error(`Unable to open tunnel to Remote Host ${process.env.HOST} on port ${process.env.HOST_PORT}`);
      }

      openTunnel(resp, params);

      return value;
  } catch (error) {
      console.error(`Error establishing session: ${error}`);
      throw error;
  }
}

export function openTunnel(startSessionResp, params) {

  const ssmPluginArgs : string[] = [ 
    JSON.stringify(startSessionResp),
    'us-east-2',
    'StartSession',
    process.env.AWS_PROFILE!, // AWS CLI profile name goes here
    JSON.stringify(params), 
    `https://ssm.us-east-2.amazonaws.com`
];

process.stdin.pause(); // pause stdin for the child process
const child = spawn('session-manager-plugin', ssmPluginArgs, {stdio: 'inherit'});

child.on('exit', function () {
    process.stdin.resume();
});

  
}


startTunnelingSession();
