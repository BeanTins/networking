import * as path from "path"
import { MessageConsumerPact, asynchronousBodyHandler, Matchers } from "@pact-foundation/pact"
import { ValidateRequestQueryHandler } from "../validate-query"
const {eachLike, term} = Matchers
import { mockClient } from "aws-sdk-client-mock"
import {DynamoDBDocumentClient, QueryCommand} from "@aws-sdk/lib-dynamodb"
import  { SQSClient, 
  GetQueueUrlCommand } from "@aws-sdk/client-sqs"

const dynamoMock = mockClient(DynamoDBDocumentClient)
const sqsMock = mockClient(SQSClient)

const JockAndRabChat = "27fcefea-2c04-4d7a-a038-2522c2f5a6d9"
const Jock = "464fddb3-0e8a-4503-9f72-14d02e100da7"
const Rab = "a3aa5c04-f3a8-43ac-b125-bd4e8021b6ba"

beforeEach(() => {
  jest.clearAllMocks()
  sqsMock.reset()
  sqsMock.on(GetQueueUrlCommand).resolves({QueueUrl: "http://queue.com"})
})

const validateUnconnectedNetworkersQuery = async function (validateQuery: any) {
  givenConnections([])

  await new ValidateRequestQueryHandler().handle(validateQuery)
}

interface Connection{
  networkerId: string
  connectedToNetworkerId: string
}

function givenConnections(connections: Connection[])
{
  dynamoMock.on(QueryCommand).resolves({Items: connections, Count: connections.length})
}

const provider = new MessageConsumerPact({
  dir: path.resolve(process.cwd(), 'pacts'),
  consumer: "NetworkingService",
  provider: 'SocialisingService'
});

test("consume validate-query request", () => {
  return (
    provider
      .given("two unconnected networkers")
      .expectsToReceive("validate query request")
      .withContent({
        correlationId: term({ generate: JockAndRabChat, matcher: "^[a-z0-9]+-[a-z0-9]+-[a-z0-9]+-[a-z0-9]+-[a-z0-9]+$" }),  
        initiatingNetworkerId: term({ generate: Jock, matcher: "^[a-z0-9]+-[a-z0-9]+-[a-z0-9]+-[a-z0-9]+-[a-z0-9]+$" }),    
        requestedConnectionNetworkerIds: eachLike(term({ generate: Rab, matcher: "^[a-z0-9]+-[a-z0-9]+-[a-z0-9]+-[a-z0-9]+-[a-z0-9]+$" }))
      })
      .verify(asynchronousBodyHandler(validateUnconnectedNetworkersQuery))
  )
})

