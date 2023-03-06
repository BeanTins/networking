import { lambdaHandler } from "../unspecified-request-handler"
import { EventBridgeEvent, Context,APIGatewayProxyResult  } from "aws-lambda"
import {DynamoDBDocumentClient, GetCommand, PutCommand} from "@aws-sdk/lib-dynamodb"
import {Networker} from "../infrastructure/networker-dao"
import {ConnectionRequest} from "../infrastructure/request-dao"
import { mockClient } from "aws-sdk-client-mock"

let event: EventBridgeEvent<any, any>, context: Context


const dynamoMock = mockClient(DynamoDBDocumentClient)


const mockUUid = jest.fn()
jest.mock("uuid", () => ({ v4: () => mockUUid() }))

beforeEach(() => {
    jest.clearAllMocks()
    process.env.NetworkerProjection = "Networker"
    process.env.ConnectionRequestTable = "ConnectionRequest"
})

test("still unspecified", async () => {

    
    
    await expect(async() => {
      await unspecifiedRequest("1234", "5678")
      })
    .rejects
    .toThrow('Unknown networker initating connection request');

})

test("now specified", async () => {

  mockUUid.mockReturnValue("09040739-830c-49d3-b8a5-1e6c9270fdb2")
  givenNetworker({name: "Barney Rubble", email: "brubble@hotmail.com", id: "5678"})
  givenNetworker({name: "Fred Flinstone", email: "fflinstone@gmail.com", id: "9012"})
  
  await unspecifiedRequest("5678", "9012")

  thenConnectionRequestStored({initiatingNetworkerId: "5678", invitationId: "09040739-830c-49d3-b8a5-1e6c9270fdb2", invitedNetworkerId: "9012"})
})

async function unspecifiedRequest(initiatingNetworkerId: string|null, invitedNetworkerId: string|null){
  
  event = {
    detail: 
    {  
      initiatingNetworkerId: initiatingNetworkerId,    
      invitedNetworkerId: invitedNetworkerId
    }
  } as EventBridgeEvent<any, any>

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


function thenConnectionRequestStored(request: ConnectionRequest)
{
  expect(dynamoMock.commandCalls(PutCommand).length).toBe(1)
  expect(dynamoMock.commandCalls(PutCommand)[0].args[0].input).toEqual(
    expect.objectContaining({
      Item: request,
      TableName: "ConnectionRequest"
    })
  )

}



