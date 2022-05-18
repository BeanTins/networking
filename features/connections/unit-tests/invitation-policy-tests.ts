import { lambdaHandler } from "../invitation-policy"
import { Context, DynamoDBStreamEvent } from "aws-lambda"
import { DataMapperFactoryMock, DataMapperMock} from "./helpers/data-mapper-factory-mock"
import { DataMapperFactory } from "../infrastructure/data-mapper-factory"
import { Member } from "../infrastructure/member-dao"
import {mockClient} from "aws-sdk-client-mock"
import {SESClient, SendEmailCommand} from "@aws-sdk/client-ses"
import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge"

const sesMock = mockClient(SESClient)
const eventbridgeMock = mockClient(EventBridgeClient)
let event: DynamoDBStreamEvent, context: Context
let membersDataMapper: DataMapperMock


beforeEach(() => {
  jest.clearAllMocks()

  sesMock.reset()
  eventbridgeMock.reset()

  let dataMapperFactory = new DataMapperFactoryMock()
  membersDataMapper = dataMapperFactory.create("Member")
  DataMapperFactory.create = dataMapperFactory.map()
})

test("integration event is sent", async () => {

  process.env.EventBusName = "NetworkingEventBus"
  membersDataMapper.queryResponse([Member.create("Barney Rubble", "brubble@hotmail.com", "5678")])
  
  await whenConnectionRequest("1234", "5678", "9012")

  expectSentEventToContain({
    Detail: JSON.stringify({
      initiatingMemberId: "5678",
      invitedMemberId: "9012",
      invitationId: "1234"
    }),
    DetailType: "ConnectionRequested",
    EventBusName: "NetworkingEventBus",
    Source: "networking.beantins.com"
  })
})

test("email contains recipient", async () => {

  membersDataMapper.queryUsingSet([
    Member.create("Barney Rubble", "brubble@hotmail.com", "5678"),
    Member.create("Fred Flinstone", "fflinstone@gmail.com", "9012")
  ], "id")

  await whenConnectionRequest("1234", "5678", "9012")

  expectEmailContaining({
    "Destination": expect.objectContaining({
      "ToAddresses": 
        ["fflinstone@gmail.com"]
      })
    }
  )
})

test("email contains sender", async () => {

  process.env.NotificationEmailAddress = "beantins@dont-reply.com"
  membersDataMapper.queryUsingSet([
    Member.create("Barney Rubble", "brubble@hotmail.com", "5678"),
    Member.create("Fred Flinstone", "fflinstone@gmail.com", "9012")
  ], "id")

  await whenConnectionRequest("1234", "5678", "9012")

  expectEmailContaining({"Source": "beantins@dont-reply.com"})
})

test("email contains subject", async () => {

  membersDataMapper.queryUsingSet([
    Member.create("Barney Rubble", "brubble@hotmail.com", "5678"),
    Member.create("Fred Flinstone", "fflinstone@gmail.com", "9012")
  ], "id")

  await whenConnectionRequest("1234", "5678", "9012")

  expectEmailContaining({
    "Message": expect.objectContaining({
      "Subject": expect.objectContaining({
        "Data": "Invitation to connect on BeanTins"
      })
    })
  })
})

test("email contains message", async () => {

  process.env.ResponseUrl = "https://www.beantins.com/connection/response"
  membersDataMapper.queryUsingSet([
    Member.create("Barney Rubble", "brubble@hotmail.com", "5678"),
    Member.create("Fred Flinstone", "fflinstone@gmail.com", "9012")
  ], "id")
  
  await whenConnectionRequest("1234", "5678", "9012")

  const sendEmailCall = sesMock.commandCalls(SendEmailCommand)[0].args[0].input
  const message = sendEmailCall["Message"]!["Body"]!["Text"]!["Data"]
  
  expect(message).toContain("Barney Rubble would like to connect on BeanTins")
  expect(message).toContain("To approve, select the following: https://www.beantins.com/connection/response?invite=1234&decision=approve")
  expect(message).toContain("To reject, select the following: https://www.beantins.com/connection/response?invite=1234&decision=reject")
})

async function whenConnectionRequest(invitationId: string, initatingMemberId: string, invitedMemberId: string){
  event = 
   {Records: [{
    eventName: "INSERT",
    dynamodb: {
      NewImage: {
        invitationId: {
          S: invitationId
        },
        initiatingMemberId: {
          S: initatingMemberId
        },
        invitedMemberId: {
          S: invitedMemberId
        },
      },
      OldImage: {}
    }
  }]
  }

  return await lambdaHandler(event, context)
}

function expectSentEventToContain(matchingContent: any)
{
  expect(eventbridgeMock.commandCalls(PutEventsCommand)[0].args[0].input).toEqual(
    expect.objectContaining({
      Entries:expect.arrayContaining([
        expect.objectContaining(matchingContent)
      ])
    })
  )
}

function expectEmailContaining(matchingContent: any)
{
  expect(sesMock.commandCalls(SendEmailCommand)[0].args[0].input).toEqual(expect.objectContaining(matchingContent))
}



