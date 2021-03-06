import { StepDefinitions } from "jest-cucumber"
import logger from "../../../../test-helpers/component-test-logger"
import {startConversation} from "./conversation-start-client"
import {MemberCredentialsAccessor} from "../../../../test-helpers/member-credentials-accessor"
import { FakeMember } from "../../../../test-helpers/fake-member"
import { TestEnvVarSetup } from "../../../../test-helpers/test-env-var-setup"
import { ConnectionsAccessor } from "../../../../test-helpers/connections-accessor"
import { ConversationsAccessor } from "./conversations-accessor"
import { ConversationStarted } from "../../domain/events"
import { EventListenerClient} from "../../../../test-helpers/event-listener-client"

const AWS_REGION = "us-east-1"
let responseCode: number
let responseMessage: string
let failureResponse: string
let failureCode: number
let memberCredentials: MemberCredentialsAccessor
let connections: ConnectionsAccessor
let conversations: ConversationsAccessor
let initiatingMember: FakeMember
let invitedMember: FakeMember
let eventListener: EventListenerClient
let testEnvVarSetup: TestEnvVarSetup

beforeAll(async()=> {

  try
  {
    testEnvVarSetup = new TestEnvVarSetup("Networking")

    memberCredentials = new MemberCredentialsAccessor(AWS_REGION, {
      userPoolId: testEnvVarSetup.resolveVariable("UserPoolId"),
      userPoolMemberClientId: testEnvVarSetup.resolveVariable("UserPoolMemberClientId")
    })
    connections = new ConnectionsAccessor(AWS_REGION, {
      tableName: testEnvVarSetup.resolveVariable("ConnectionsTableName")
    })

    eventListener = new EventListenerClient(AWS_REGION, {
      queueName: testEnvVarSetup.resolveVariable("EventListenerQueueName")
    })

    conversations = new ConversationsAccessor(AWS_REGION, {
      tableName: testEnvVarSetup.resolveVariable("ConversationsTableName")
    })
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

  await Promise.all([
    memberCredentials.clear(),
    connections.clear(),
    conversations.clear(),
    eventListener.clear()
  ])

})

export const conversationSteps: StepDefinitions = ({ given, when, then }) => {

  given(/([\w\s]+) is not connected to ([\w\s]+)/, async (initiatingMemberName: string, invitedMemberName) => {
    await initiatingMember.authenticatedAndActivatedWithDetails(initiatingMemberName, "sender", "p@ssw0rd")
    await invitedMember.authenticatedAndActivatedWithDetails(invitedMemberName, "receiver", "p@ssw0rd")
    failureCode = 400
    failureResponse = "unknown connections"
  })

  given(/([\w\s]+) is connected to ([\w\s]+)/, async (initiatingMemberName: string, invitedMemberName) => {
    await initiatingMember.authenticatedAndActivatedWithDetails(initiatingMemberName, "sender", "p@ssw0rd")
    await invitedMember.authenticatedAndActivatedWithDetails(invitedMemberName, "receiver", "p@ssw0rd")
    await connections.add(initiatingMember.id, invitedMember.id)
  })

  when(/a request is made to start a conversation between them/, async () => {
    const idToken = await memberCredentials.requestIdToken(initiatingMember.email!, initiatingMember.password)

    logger.verbose("id token  " + idToken)
    const response = await startConversation({
      endpoint: testEnvVarSetup.resolveVariable("ConversationStartCommandEndpoint"),
      initiatingMemberId: initiatingMember.id,
      invitedMemberIds: [invitedMember!.id],
      idToken: idToken
    })

    if (response != null)
    {
      logger.verbose("responseCode - " + response.statusCode + ",message - " + JSON.stringify(response.body))
      responseCode = response.statusCode;
      responseMessage = response.body.message
    }
  })

  then(/a failure response occurs/, () => {
    expect(responseCode).toBe(failureCode)
    expect(responseMessage).toBe(failureResponse)
  })

  then(/the conversation starts/, async() => {
    expect(responseCode).toBe(201)
    expect(responseMessage).toBe("conversation created")
    expect((await retrieveConversationStartedEvent()).participantIds).toEqual(expect.arrayContaining([initiatingMember.id, invitedMember.id]))
  })

}

async function retrieveConversationStartedEvent(): Promise<ConversationStarted>
{
  const response = await eventListener.waitForEventType("ConversationStarted")

  return response!.data as ConversationStarted
}

