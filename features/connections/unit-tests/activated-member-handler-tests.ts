import { lambdaHandler } from "../activated-member-handler"
import { EventBridgeEvent, Context,APIGatewayProxyResult  } from "aws-lambda"
import { Networker} from "../infrastructure/networker-dao"
import {DynamoDBDocumentClient, PutCommand} from "@aws-sdk/lib-dynamodb"
import {mockClient} from "aws-sdk-client-mock"


const dynamoMock = mockClient(DynamoDBDocumentClient)
let event: EventBridgeEvent<any, any>
let context: Context

const mockUUid = jest.fn()
jest.mock("uuid", () => ({ v4: () => mockUUid() }))

beforeEach(() => {
    jest.clearAllMocks()
    process.env.NetworkerProjection = "Networkers"
})

test("event stored", async () => {

  whenActivatedMember("09040739-830c-49d3-b8a5-1e6c9270fdb2", "bing jacob", "bing.jacob@hotmail.com")
  
  const result:APIGatewayProxyResult  = await lambdaHandler(event, context)

  thenNetworkerStored({id: "09040739-830c-49d3-b8a5-1e6c9270fdb2", name: "bing jacob", email: "bing.jacob@hotmail.com"})
})

function whenActivatedMember(id: string|null, name: string|null, email: string|null){
  event = {
    detail: 
    {  
      id: id,    
      name: name,
      email: email
    }
  } as EventBridgeEvent<any, any>

}
  
function thenNetworkerStored(networker: Networker)
{
  expect(dynamoMock.commandCalls(PutCommand).length).toBe(1)
  expect(dynamoMock.commandCalls(PutCommand)[0].args[0].input).toEqual(
    expect.objectContaining({
      Item: networker,
      TableName: "Networkers"
    })
  )

}

