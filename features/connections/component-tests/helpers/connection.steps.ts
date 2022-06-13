import { StepDefinitions } from "jest-cucumber"
import { TestEnvVarSetup } from "../../../../test-helpers/test-env-var-setup"
import { connectionResponse } from "./connection-response-client"
import { requestConnection } from "./request-connection-client"
import logger from "../../../../test-helpers/component-test-logger"
import { ConnectionAdded} from "../../domain/events"
import {MemberCredentialsAccessor} from "../../../../test-helpers/member-credentials-accessor"
import {MemberProjectionAccessor} from "./member-projection-accessor"
import {ConnectionRequestAccessor} from "./connection-request-accessor"
import {ConnectionsAccessor} from "../../../../test-helpers/connections-accessor"
import { v4 as uuidv4 } from "uuid"
import { EmailListenerQueueClient} from "./email-listener-queue-client"
import { StageParameters} from "../../../../infrastructure/stage-parameters"
import { EventListenerClient } from "../../../../test-helpers/event-listener-client"
import { FakeMember } from "../../../../test-helpers/fake-member"

const AWS_REGION = "us-east-1"

let BeanTinsEmail: string
let responseCode: number
let responseMessage: string
let failureResponse: string
let failureCode: number
let memberCredentials: MemberCredentialsAccessor
let memberProjection: MemberProjectionAccessor
let connectionRequests: ConnectionRequestAccessor
let connections: ConnectionsAccessor
let emailListener: EmailListenerQueueClient
let eventListener: EventListenerClient
let invitationId: string
let initiatingMember: FakeMember
let invitedMember: FakeMember
let testEnvVarSetup: TestEnvVarSetup

beforeAll(async()=> {

  try
  {
    testEnvVarSetup = new TestEnvVarSetup("Networking")

    BeanTinsEmail = await new StageParameters(AWS_REGION).retrieve("NotificationEmailAddress")

    testEnvVarSetup.resolveVariable("UserPoolId")
    testEnvVarSetup.resolveVariable("UserPoolMemberClientId")
    memberCredentials = new MemberCredentialsAccessor(AWS_REGION, {
      userPoolId: testEnvVarSetup.resolveVariable("UserPoolId"),
      userPoolMemberClientId: testEnvVarSetup.resolveVariable("UserPoolMemberClientId")
    })
    memberProjection = new MemberProjectionAccessor(AWS_REGION, {
      tableName: testEnvVarSetup.resolveVariable("MemberProjectionName")
    })
    connectionRequests = new ConnectionRequestAccessor(AWS_REGION, {
      tableName: testEnvVarSetup.resolveVariable("ConnectionRequestTableName")
    })
    connections = new ConnectionsAccessor(AWS_REGION, {
      tableName: testEnvVarSetup.resolveVariable("ConnectionsTableName")
    })

    emailListener = new EmailListenerQueueClient(AWS_REGION, {
      queueName: testEnvVarSetup.resolveVariable("EmailListenerQueueName")
    })
    eventListener = new EventListenerClient(AWS_REGION, {
      queueName: testEnvVarSetup.resolveVariable("EventListenerQueueName")
    })

    await emailListener.clear()
    await eventListener.clear()
  } 
  catch(error)
  {
    logger.error(error)
  }
})

function getTestTimeout(scenarioDescription: string)
{
  const TenSeconds = 10000
  let timeout: number | undefined = TenSeconds
  var match = scenarioDescription.match(/\(timeout: (?<timeout>[0-9]+) seconds\)/)

  if (match != undefined)
  {
    timeout = parseInt(match?.groups!.timeout) * 1000
  } 
 
  return timeout
}

beforeEach(async () => {

  const currentTestName = expect.getState().currentTestName

  console.log("Running test: " + currentTestName)
  logger.verbose("*** Running test - " + currentTestName + " ***")
  jest.setTimeout(getTestTimeout(currentTestName))
  
  initiatingMember = new FakeMember(AWS_REGION, memberCredentials, testEnvVarSetup.resolveVariable("MembershipEventBusFakeArn"))
  invitedMember = new FakeMember(AWS_REGION, memberCredentials, testEnvVarSetup.resolveVariable("MembershipEventBusFakeArn"))
  responseCode = 0
  responseMessage = ""
  await Promise.all([
    memberCredentials.clear(), 
    memberProjection.clear(), 
    connectionRequests.clear(), 
    connections.clear(), 
  ])
})

export const connectionSteps: StepDefinitions = ({ given, and, when, then }) => {

  given(/an initiating member ([\w\s]+)/, async (memberName: string) => {
    await initiatingMember.authenticatedAndActivatedWithDetails(memberName, "receiver", "p@ssw0rd")
  })

  given(/([\w\s]+) has invited ([\w\s]+) to connect/, async (initiatingMemberName: string, invitedMemberName: string) => {
    await initiatingMember.authenticatedAndActivatedWithDetails(initiatingMemberName, "receiver", "p@ssw0rd")
    await invitedMember.authenticatedAndActivatedWithDetails(invitedMemberName, "sender", "p@ssw0rd")

    invitationId = uuidv4()
    await connectionRequests.add(initiatingMember.id!, invitedMember.id!, invitationId)
  })

  given(/an unauthorized initiating member ([\w\s]+)/, async (memberName: string) => {
    await initiatingMember.withDetails(memberName, "sender")

    await initiatingMember.activated()

    failureResponse = "Unauthorized"
    failureCode = 401
  })

  given(/an unauthorized invited member ([\w\s]+)/, async (memberName: string) => {
    await invitedMember.withDetails(memberName, "sender")

    await invitedMember.activated()

    failureResponse = "Unauthorized"
    failureCode = 401
  })

  given(/an invited member ([\w\s]+)/, async (memberName: string) => {
    await invitedMember.authenticatedAndActivatedWithDetails(memberName, "receiver", "p@ssw0rd")
  })

  given(/no invited member/, async () => {
    failureResponse = "Invalid request body"
    failureCode = 400
  })

  given(/an unknown initiating member ([\w\s]+)/, async (memberName) => {
    await initiatingMember.withDetails(memberName, "sender")

    await initiatingMember.authenticatedWithPassword("p@ssw0rd")
  })

  when(/a connection request is made/, async () => {
    const idToken = await memberCredentials.requestIdToken(initiatingMember.email!, "p@ssw0rd")

    logger.verbose("id token  " + idToken)
    const response = await requestConnection({
      endpoint: testEnvVarSetup.resolveVariable("ConnectionRequestCommandEndpoint"),
      intiatingMemberId: initiatingMember.id,
      invitedMemberId: invitedMember!.id,
      idToken: idToken
    })

    if (response != null)
    {
      logger.verbose("responseCode - " + response.statusCode + ",message - " + JSON.stringify(response.body))
      responseCode = response.statusCode;
      responseMessage = response.body.message
    }
  })

  when(/they are activated/, async () => {
    await initiatingMember.activated()
  })

  when(/a connection approved response occurs/, async () => {
    await sendConnectionResponse("approve")
  })

  when(/a connection rejected response occurs/, async () => {
    await sendConnectionResponse("reject")
  })

  when(/a decision-less connection response occurs/, async () => {
    failureResponse = "unknown decision"
    failureCode=400
    await sendConnectionResponse("unknown")
  })

  when(/afterwards ([\w\s]+) is confirmed as a member/, async (memberName) => {
    await initiatingMember.activated()
    expect(await memberProjection.waitForMembersToBeStored([initiatingMember.name!, invitedMember.name!])).toBe(true)
    await waitForLambdaRetry()
  })
  
  then(/an unspecified connection request occurs/, async () => {
    const response = await eventListener.waitForEventType("UnspecifiedConnectionRequest")

    expect(response!.data).toEqual({"initiatingMemberId": initiatingMember.id, "invitedMemberId": invitedMember.id})
  })

  then(/an invitation is received/, async() => {
    expect(await memberProjection.waitForMembersToBeStored([initiatingMember.name!, invitedMember.name!])).toBe(true)
    expect(await emailListener.waitForEmail(BeanTinsEmail, invitedMember.email!, "Invitation to connect on BeanTins")).toBe(true)
  })

  then(/confirmation is received/, async() => {
    expect(await memberProjection.waitForMembersToBeStored([initiatingMember.name!, invitedMember.name!])).toBe(true)
    expect(await connectionRequests.waitForRemoval(initiatingMember.id!, invitedMember.id!)).toBe(true)
    expect(await emailListener.waitForEmail(BeanTinsEmail, initiatingMember.email!, "You have a new connection on BeanTins")).toBe(true)
    await expectMutuallyConnectedMembers()
    
  })

  then(/in future they are recognised/, async() => {
    expect(await memberProjection.waitForMembersToBeStored([initiatingMember.name!])).toBe(true)
  })

  then(/a failure response occurs/, () => {
    expect(responseCode).toBe(failureCode)
    expect(responseMessage).toBe(failureResponse)
  })

  then(/no connection is made/, async() => {
    expect(responseCode).toBe(200)
    expect(responseMessage).toBe("connection rejected")
    expect(await connectionRequests.waitForRemoval(initiatingMember.id!, invitedMember.id!)).toBe(true)
  })

}

async function waitForLambdaRetry() {
  const OneMinute = 60000
  await new Promise(r => setTimeout(r, OneMinute))
}

async function expectMutuallyConnectedMembers()
{
  let events: any[] = []
  events.push(await retrieveConnectionAddedEvent())
  events.push(await retrieveConnectionAddedEvent())
  expect(events).toEqual(expect.arrayContaining(
    [{memberId: initiatingMember.id, connectionMemberId: invitedMember.id},
     {memberId: invitedMember.id, connectionMemberId: initiatingMember.id}
    ]))
}

async function retrieveConnectionAddedEvent(): Promise<ConnectionAdded>
{
  const response = await eventListener.waitForEventType("ConnectionAdded")

  return response!.data as ConnectionAdded
}

async function sendConnectionResponse(decision: "approve"|"reject"|"unknown") {
  let idToken = await memberCredentials.requestIdToken(invitedMember.email!, "p@ssw0rd")

  logger.verbose("id token  " + idToken)
  const response = await connectionResponse({
    endpoint: testEnvVarSetup.resolveVariable("ConnectionResponseCommandEndpoint"),
    invitationId: invitationId,
    decision: decision,
    idToken: idToken
  })

  if (response != null) {
    logger.verbose("responseCode - " + response.statusCode + ",message - " + JSON.stringify(response.body))
    responseCode = response.statusCode
    responseMessage = response.body.message
  }
}





