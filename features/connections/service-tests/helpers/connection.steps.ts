import { StepDefinitions } from "jest-cucumber"
import { TestEnvVarSetup } from "../../../../test-helpers/test-env-var-setup"
import { ConnectionsClient } from "./connection-client"
import logger from "../../../../test-helpers/service-test-logger"
import { ConnectionAdded} from "../../domain/events"
import {MemberCredentialsAccessor} from "../../../../test-helpers/member-credentials-accessor"
import {NetworkerProjectionAccessor} from "./networker-projection-accessor"
import {ConnectionRequestAccessor} from "./connection-request-accessor"
import {ConnectionsAccessor} from "../../../../test-helpers/connections-accessor"
import { v4 as uuidv4 } from "uuid"
import { EmailListenerQueueClient} from "./email-listener-queue-client"
import { StageParameters} from "../../../../infrastructure/stage-parameters"
import { EventListenerClient } from "../../../../test-helpers/event-listener-client"
import { FakeMember } from "../../../../test-helpers/fake-member"
import { ValidationClient } from "./validation-client"

const AWS_REGION = "us-east-1"

let BeanTinsEmail: string
let responseCode: number
let responseMessage: string
let failureResponse: string
let failureCode: number
let memberCredentials: MemberCredentialsAccessor
let networkerProjection: NetworkerProjectionAccessor
let connectionRequests: ConnectionRequestAccessor
let connections: ConnectionsAccessor
let emailListener: EmailListenerQueueClient
let eventListener: EventListenerClient
let invitationId: string
let initiatingNetworker: FakeMember
let invitedNetworker: FakeMember
let testEnvVarServiceSetup: TestEnvVarSetup
let testEnvVarFeatureSetup: TestEnvVarSetup
let client: ConnectionsClient
let validationClient: ValidationClient

beforeAll(async()=> {

  logger.verbose("*** Running test suite - Connections ***")
  try
  {
    testEnvVarServiceSetup = new TestEnvVarSetup("Networking", undefined)
    testEnvVarFeatureSetup = new TestEnvVarSetup("Networking", "Connection")

    BeanTinsEmail = await new StageParameters(AWS_REGION).retrieve("NotificationEmailAddress")

    testEnvVarServiceSetup.resolveVariable("UserPoolId")
    testEnvVarServiceSetup.resolveVariable("UserPoolMemberClientId")
    memberCredentials = new MemberCredentialsAccessor(AWS_REGION, {
      userPoolId: testEnvVarServiceSetup.resolveVariable("UserPoolId"),
      userPoolMemberClientId: testEnvVarServiceSetup.resolveVariable("UserPoolMemberClientId")
    })
    networkerProjection = new NetworkerProjectionAccessor(AWS_REGION, {
      tableName: testEnvVarFeatureSetup.resolveVariable("NetworkerProjectionName")
    })
    connectionRequests = new ConnectionRequestAccessor(AWS_REGION, {
      tableName: testEnvVarFeatureSetup.resolveVariable("RequestTableName")
    })
    connections = new ConnectionsAccessor(AWS_REGION, {
      tableName: testEnvVarFeatureSetup.resolveVariable("ConnectionsTableName")
    })

    emailListener = new EmailListenerQueueClient(AWS_REGION, {
      queueName: testEnvVarServiceSetup.resolveVariable("EmailListenerQueueName")
    })
    eventListener = new EventListenerClient(AWS_REGION, {
      queueName: testEnvVarServiceSetup.resolveVariable("EventListenerQueueName")
    })
    validationClient = new ValidationClient(AWS_REGION, {
      requestQueueName: testEnvVarFeatureSetup.resolveVariable("ValidateConnectionsQueuesRequestQueueName"),
      responseQueueName: testEnvVarFeatureSetup.resolveVariable("ValidateConnectionsQueuesResponseQueueName")})
    client = new ConnectionsClient()

    await emailListener.clear()
    await eventListener.clear()
    await validationClient.clear()
  } 
  catch(error)
  {
    logger.error("Initialisation of test suite failed with: " + error)
  }
})

function getTestTimeout(scenarioDescription: string)
{
  const TenSeconds = 5000
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
  
  initiatingNetworker = new FakeMember(AWS_REGION, memberCredentials, testEnvVarServiceSetup.resolveVariable("MembershipEventBusFakeArn"))
  invitedNetworker = new FakeMember(AWS_REGION, memberCredentials, testEnvVarServiceSetup.resolveVariable("MembershipEventBusFakeArn"))
  responseCode = 0
  responseMessage = ""

  await Promise.all([
    memberCredentials.clear(), 
    networkerProjection.clear(), 
    connectionRequests.clear(), 
    connections.clear(), 
  ])
})

export const connectionSteps: StepDefinitions = ({ given, and, when, then }) => {

  given(/an initiating networker ([\w\s]+)/, async (memberName: string) => {
    await initiatingNetworker.authenticatedAndActivatedWithDetails(memberName, "receiver", "p@ssw0rd")
  })

  given(/([\w\s]+) has invited ([\w\s]+) to connect/, async (initiatingMemberName: string, invitedMemberName: string) => {
    await initiatingNetworker.authenticatedAndActivatedWithDetails(initiatingMemberName, "receiver", "p@ssw0rd")
    await invitedNetworker.authenticatedAndActivatedWithDetails(invitedMemberName, "sender", "p@ssw0rd")

    invitationId = uuidv4()
    await connectionRequests.add(initiatingNetworker.id!, invitedNetworker.id!, invitationId)
  })

  given(/an unauthorized initiating networker ([\w\s]+)/, async (memberName: string) => {
    await initiatingNetworker.withDetails(memberName, "sender")

    await initiatingNetworker.activated()

    failureResponse = "Unauthorized"
    failureCode = 401
  })

  given(/an unauthorized invited networker ([\w\s]+)/, async (memberName: string) => {
    await invitedNetworker.withDetails(memberName, "sender")

    await invitedNetworker.activated()

    failureResponse = "Unauthorized"
    failureCode = 401
  })

  given(/an invited networker ([\w\s]+)/, async (memberName: string) => {
    await invitedNetworker.authenticatedAndActivatedWithDetails(memberName, "receiver", "p@ssw0rd")
  })

  given(/no invited networker/, async () => {
    failureResponse = "Invalid request body"
    failureCode = 400
  })

  given(/an unknown initiating networker ([\w\s]+)/, async (networkerName) => {
    await initiatingNetworker.withDetails(networkerName, "sender")

    await initiatingNetworker.authenticatedWithPassword("p@ssw0rd")
  })

  given(/they are not connected to ([\w\s]+)/, async (networkerName) => {

    await invitedNetworker.authenticatedAndActivatedWithDetails(networkerName, "receiver", "p@ssw0rd")
  })

  given(/they are connected to ([\w\s]+)/, async (networkerName) => {

    await invitedNetworker.authenticatedAndActivatedWithDetails(networkerName, "receiver", "p@ssw0rd")
    await connections.add(initiatingNetworker.id, invitedNetworker.id)
  })

  when(/a connection request is made/, async () => {
    const idToken = await memberCredentials.requestIdToken(initiatingNetworker.email!, "p@ssw0rd")

    logger.verbose("id token  " + idToken)
    const response = await client.request({
      endpoint: testEnvVarFeatureSetup.resolveVariable("RequestCommandEndpoint"),
      intiatingNetworkerId: initiatingNetworker.id,
      invitedNetworkerId: invitedNetworker!.id,
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
    await initiatingNetworker.activated()
  })

  when(/a validation is made/, async () => {
    const response = await validationClient.request({
      correlationId: "1234",
      initiatingNetworkerId: initiatingNetworker.id,
      requestedConnectionNetworkerIds: [invitedNetworker!.id],      
    })
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
    await initiatingNetworker.activated()
    expect(await networkerProjection.waitForMembersToBeStored([initiatingNetworker.name!, invitedNetworker.name!])).toBe(true)
    await waitForLambdaRetry()
  })
  
  then(/an unspecified connection request occurs/, async () => {
    const response = await eventListener.waitForEventType("UnspecifiedConnectionRequest")

    expect(response!.data).toEqual({"initiatingNetworkerId": initiatingNetworker.id, "invitedNetworkerId": invitedNetworker.id})
  })

  then(/an invitation is received/, async() => {
    expect(await networkerProjection.waitForMembersToBeStored([initiatingNetworker.name!, invitedNetworker.name!])).toBe(true)
    expect(await emailListener.waitForEmail(BeanTinsEmail, invitedNetworker.email!, "Invitation to connect on BeanTins")).toBe(true)
  })

  then(/confirmation is received/, async() => {
    expect(await networkerProjection.waitForMembersToBeStored([initiatingNetworker.name!, invitedNetworker.name!])).toBe(true)
    expect(await connectionRequests.waitForRemoval(initiatingNetworker.id!, invitedNetworker.id!)).toBe(true)
    expect(await emailListener.waitForEmail(BeanTinsEmail, initiatingNetworker.email!, "You have a new connection on BeanTins")).toBe(true)
    await expectMutuallyConnectedMembers()
    
  })

  then(/in future they are recognised/, async() => {
    expect(await networkerProjection.waitForMembersToBeStored([initiatingNetworker.name!])).toBe(true)
  })

  then(/a failure response occurs/, () => {
    expect(responseCode).toBe(failureCode)
    expect(responseMessage).toBe(failureResponse)
  })

  then(/a rejection response occurs/, async() => {
    const response = await validationClient.waitForResponse()
    expect(response.validated).toBe(false)
  })

  then(/a validation successful response occurs/, async() => {
    const response = await validationClient.waitForResponse()
    expect(response.validated).toBe(true)
  })

  then(/no connection is made/, async() => {
    expect(responseCode).toBe(200)
    expect(responseMessage).toBe("connection rejected")
    expect(await connectionRequests.waitForRemoval(initiatingNetworker.id!, invitedNetworker.id!)).toBe(true)
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
    [{networkerId: initiatingNetworker.id, connectionNetworkerId: invitedNetworker.id},
     {networkerId: invitedNetworker.id, connectionNetworkerId: initiatingNetworker.id}
    ]))
}

async function retrieveConnectionAddedEvent(): Promise<ConnectionAdded>
{
  const response = await eventListener.waitForEventType("ConnectionAdded")

  return response!.data as ConnectionAdded
}

async function sendConnectionResponse(decision: "approve"|"reject"|"unknown") {
  let idToken = await memberCredentials.requestIdToken(invitedNetworker.email!, "p@ssw0rd")

  logger.verbose("id token  " + idToken)
  const response = await client.response({
    endpoint: testEnvVarFeatureSetup.resolveVariable("ResponseCommandEndpoint"),
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





