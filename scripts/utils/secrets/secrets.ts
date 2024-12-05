import { SSMClient, GetParameterCommand } from '@aws-sdk/client-ssm';

export async function getParameter(name) {
  const client = new SSMClient({ region: 'us-east-2' });

  const params = {
      Name: name,
      WithDecryption: true // Set to false if the parameter is not encrypted
  };

  try {
      const command = new GetParameterCommand(params);

      const data = await client.send(command);

      const value = data?.Parameter?.Value;
      
      if (!value) {
        throw new Error(`Parameter ${name} not found`);
      }

      return value;
  } catch (error) {
      console.error(`Error getting parameter: ${error}`);
      throw error;
  }
}