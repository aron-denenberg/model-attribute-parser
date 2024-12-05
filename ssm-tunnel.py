import boto3
import asyncio
import websockets

ssmClient = boto3.client('ssm')

class Document:
    def __init__(self, name, parameters):
        self.name = name
        self.parameters = parameters

async def tunnel(url, token):
    print(f"Connecting to {url} with token {token}")
    
    body = Document('AWS-StartPortForwardingSessionToRemoteHost', {
        'host': ['allwhere-db-production-replica-20240809.cggmfpvpxjvr.us-east-2.rds.amazonaws.com'],
        'portNumber': ['5432'],
        'localPortNumber': ['9001']
    })
    
    headers = {"Authorization": f"Bearer {token}"}
    finalUrl = url + f"?document-name=AWS-StartPortForwardingSessionToRemoteHost&parameters=host%3Dallwhere-db-production-replica-20240809.cggmfpvpxjvr.us-east-2.rds.amazonaws.com%2CportNumber%3D5432%2ClocalPortNumber%3D9001"
    print(finalUrl)
    async with websockets.connect(finalUrl, additional_headers=headers) as websocket:
        await websocket.send('tap')
        response = await websocket.recv()
        print(response)

response = ssmClient.start_session(
    Target='i-0e1b1748173455842',
    DocumentName='AWS-StartPortForwardingSessionToRemoteHost',
    Parameters={
        'host': ['allwhere-db-production-replica-20240809.cggmfpvpxjvr.us-east-2.rds.amazonaws.com'],
        'portNumber': ['5432'],
        'localPortNumber': ['9001']
    }
)

print(response)

asyncio.run(tunnel(response['StreamUrl'], response['TokenValue']))
