import { lambdaHandler } from "../request"
import { APIGatewayEvent, Context,APIGatewayProxyResult  } from "aws-lambda"
import { Networker } from "../infrastructure/networker-dao"
import {mockClient} from "aws-sdk-client-mock"
import {DynamoDBDocumentClient, GetCommand} from "@aws-sdk/lib-dynamodb"

const dynamoMock = mockClient(DynamoDBDocumentClient)
let event: APIGatewayEvent, context: Context

beforeEach(() => {
    jest.clearAllMocks()
})

test("signup successful for new user", async () => {

  givenNetworker({name: "Barney Rubble", email: "brubble@hotmail.com", id: "5678"})
    
  const result:APIGatewayProxyResult  = await whenRequestConnection("1234", "5678")
  
  expect(result.statusCode).toBe(201)
})

async function whenRequestConnection(initiatingNetworkerId: string|null, invitedNetworkerId: string|null){
  event = {
    body: JSON.stringify(
    {  
      initiatingNetworkerId: initiatingNetworkerId,    
      invitedNetworkerId: invitedNetworkerId
    })
  } as APIGatewayEvent

  return await lambdaHandler(event, context)
}
  
function givenNetworker(networker: Networker)
{
  dynamoMock
    .on(GetCommand, {
      TableName: "Networker",
      Key: {
        id : networker.id,
      }
    }
    ).resolves({Item: networker})
}

