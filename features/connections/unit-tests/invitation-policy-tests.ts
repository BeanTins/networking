import { lambdaHandler } from "../invitation-policy"
import { Context, DynamoDBStreamEvent } from "aws-lambda"
import { EventBridge } from "aws-sdk"
import { DataMapperFactoryMock, DataMapperMock} from "./helpers/data-mapper-factory-mock"
import { DataMapperFactory } from "../infrastructure/data-mapper-factory"
import { Member } from "../infrastructure/member-dao"

beforeEach(() => {
  jest.clearAllMocks()

  let dataMapperFactory = new DataMapperFactoryMock()
  membersDataMapper = dataMapperFactory.create("Member")
  DataMapperFactory.create = dataMapperFactory.map()
})

let event: DynamoDBStreamEvent, context: Context
let membersDataMapper: DataMapperMock


const mockPutEventPromise = jest.fn()
const mockPutEvent = jest.fn().mockImplementation(() => {
  return {promise: mockPutEventPromise}
});

const mockSendEmailPromise = jest.fn()
const mockSendEmail = jest.fn().mockImplementation(() => {
    return {promise: mockSendEmailPromise}
})

jest.mock('aws-sdk', () => {
  return {
    EventBridge: jest.fn().mockImplementation(() => {
      return {putEvents: mockPutEvent}
    }),
    SES: jest.fn().mockImplementation(() => {
       return {sendEmail: mockSendEmail}
    })
  }
})

test("event is sent", async () => {

  membersDataMapper.queryResponse([Member.create("Barney Rubble", "brubble@hotmail.com", "5678")])
  connectionIsRequestedOccurs("1234", "5678", "9012")

  await lambdaHandler(event, context)

  expectSentEventToContain({
    Detail: JSON.stringify({
      invitationId: "1234",
      initiatingMemberId: "5678",
      invitedMemberId: "9012"
    })
  })
})

test("email contains recipient", async () => {

  membersDataMapper.querySequenceResponses([[Member.create("Barney Rubble", "brubble@hotmail.com", "5678")],
                                            [Member.create("Fred Flinstone", "fflinstone@gmail.com", "9012")]])
  connectionIsRequestedOccurs("1234", "5678", "9012")

  await lambdaHandler(event, context)

  expectEmailContaining({
    "Destination": expect.objectContaining({
      "ToAddresses": 
        ["fflinstone@gmail.com"]
      })
    }
  )
})

test("email contains sender", async () => {

  membersDataMapper.querySequenceResponses([[Member.create("Barney Rubble", "brubble@hotmail.com", "5678")],
                                            [Member.create("Fred Flinstone", "fflinstone@gmail.com", "9012")]])
  connectionIsRequestedOccurs("1234", "5678", "9012")

  await lambdaHandler(event, context)

  expectEmailContaining({"Source": "brubble@hotmail.com"})
})

test("email contains subject", async () => {

  membersDataMapper.querySequenceResponses([[Member.create("Barney Rubble", "brubble@hotmail.com", "5678")],
                                            [Member.create("Fred Flinstone", "fflinstone@gmail.com", "9012")]])
  connectionIsRequestedOccurs("1234", "5678", "9012")

  await lambdaHandler(event, context)

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
  membersDataMapper.querySequenceResponses([[Member.create("Barney Rubble", "brubble@hotmail.com", "5678")],
                                            [Member.create("Fred Flinstone", "fflinstone@gmail.com", "9012")]])
  connectionIsRequestedOccurs("1234", "5678", "9012")

  await lambdaHandler(event, context)

  const sendEmailCall = mockSendEmail.mock.calls[0][0]
  const message = sendEmailCall["Message"]["Body"]["Text"]["Data"]
  
  expect(message).toContain("Barney Rubble would like to connect on BeanTins")
  expect(message).toContain("To approve, select the following: https://www.beantins.com/connection/response?invite=1234&decision=approve")
  expect(message).toContain("To reject, select the following: https://www.beantins.com/connection/response?invite=1234&decision=reject")
})

function connectionIsRequestedOccurs(invitationId: string, initatingMemberId: string, invitedMemberId: string){
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
}

function expectSentEventToContain(matchingContent: any)
{
  expect(mockPutEvent).toBeCalledWith(
    expect.objectContaining({
      Entries:expect.arrayContaining([
        expect.objectContaining(matchingContent)
      ])
    })
  )
}

function expectEmailContaining(matchingContent: any)
{
  expect(mockSendEmail).toBeCalledWith(expect.objectContaining(matchingContent))
}



