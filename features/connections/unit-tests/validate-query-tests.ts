import { lambdaHandler } from "../validate-query"
import { SQSEvent, Context  } from "aws-lambda"
import { mockClient } from "aws-sdk-client-mock"
import {DynamoDBDocumentClient, QueryCommand} from "@aws-sdk/lib-dynamodb"
import  { SQSClient, 
  GetQueueUrlCommand, 
  SendMessageCommand } from "@aws-sdk/client-sqs"
import {ValidateConnectionResponse} from "../infrastructure/validate-connections-response-client"

const dynamoMock = mockClient(DynamoDBDocumentClient)
const sqsMock = mockClient(SQSClient)

let event: SQSEvent, context: Context

beforeEach(() => {
    jest.clearAllMocks()
    sqsMock.reset()
    sqsMock.on(GetQueueUrlCommand).resolves({QueueUrl: "http://queue.com"})
})

interface Connection{
  networkerId: string
  connectedToNetworkerId: string
}

test("unsuccessful validation", async () => {

  givenConnections([])

  await whenValidateQuery("2345", "1234", ["5678"])
  
  thenResponseQueueContains({correlationId: "2345", validated: false})
})

test("successful validation", async () => {

  givenConnections([{networkerId: "1234", connectedToNetworkerId: "5678"}])

  await whenValidateQuery("2345", "1234", ["5678"])
  
  thenResponseQueueContains({correlationId: "2345", validated: true})
})

function givenConnections(connections: Connection[])
{
  dynamoMock.on(QueryCommand).resolves({Items: connections, Count: connections.length})
}

async function whenValidateQuery(
  correlationId: string,
  initiatingNetworkerId: string, 
  connectedNetworkerIds: string[]){
  event = {
    Records:[{
    messageId: "",
    receiptHandle: "",
    attributes: {},
    messageAttributes: {},
    md5OfBody: "",
    eventSource: "",
    eventSourceARN: "",
    awsRegion: "",

    body: JSON.stringify(
    {
      correlationId: correlationId,  
      initiatingNetworkerId: initiatingNetworkerId,    
      requestedConnectionNetworkerIds: connectedNetworkerIds,
    })
  }]
  } as SQSEvent

  return await lambdaHandler(event, context)
}

function thenResponseQueueContains(response: ValidateConnectionResponse)
{
  expect(sqsMock.commandCalls(SendMessageCommand)[0].args[0].input).toEqual(
    expect.objectContaining({
      "MessageBody": JSON.stringify(response),
      QueueUrl: "http://queue.com"
    })
  )
}

  
