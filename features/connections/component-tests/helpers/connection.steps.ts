import { StepDefinitions } from "jest-cucumber"
import { resolveOutput } from "./output-resolver"
import { connectionResponse } from "./connection-response-client"
import { requestConnection } from "./request-connection-client"
import logger from "./component-test-logger"
import { ConnectionAdded} from "../../domain/events"
import {MemberCredentialsAccessor} from "./member-credentials-accessor"
import {MemberProjectionAccessor} from "./member-projection-accessor"
import {ConnectionRequestAccessor} from "./connection-request-accessor"
import {ConnectionsAccessor} from "./connections-accessor"
import { TestEventPublisher } from "./test-event-publisher"
import { v4 as uuidv4 } from "uuid"
import { EmailListenerQueueClient} from "./email-listener-queue-client"
import { StageParameters} from "../../../../infrastructure/stage-parameters"
import { EventListenerClient, EventResponse } from "./event-listener-client"

interface MemberDetails {id: string | null, name : string | null, email: string | null}
const EmptyMemberDetails: MemberDetails = {id: null, name: null, email: null}
enum EmailRole {Sender, Receiver}
const AWS_REGION = "us-east-1"
4
let BeanTinsEmail: string
let responseCode: number
let responseMessage: string
let failureResponse: string
let failureCode: number
let memberCredentials: MemberCredentialsAccessor
let eventPublisher: TestEventPublisher
let memberProjection: MemberProjectionAccessor
let connectionRequests: ConnectionRequestAccessor
let connections: ConnectionsAccessor
let initiatingMember: MemberDetails
let initiatingMemberPassword: string
let invitedMember: MemberDetails
let emailListener: EmailListenerQueueClient
let eventListener: EventListenerClient
let invitationId: string

beforeAll(async()=> {

  try
  {
    configureEnvVar("ConnectionRequestEndpoint")
    configureEnvVar("ConnectionResponseEndpoint")
    configureEnvVar("MemberProjection")
    configureEnvVar("ConnectionRequestTable")
    configureEnvVar("ConnectionsTable")
    configureStageEnvVar("MembershipEventBusFakeArn")
    configureStageEnvVar("EmailListenerQueueName")
    configureStageEnvVar("UserPoolId")
    configureStageEnvVar("UserPoolMemberClientId")
    configureStageEnvVar("EventListenerQueueName")

    BeanTinsEmail = await new StageParameters(AWS_REGION).retrieve("NotificationEmailAddress")

    memberCredentials = new MemberCredentialsAccessor(AWS_REGION)
    memberProjection = new MemberProjectionAccessor(AWS_REGION)
    connectionRequests = new ConnectionRequestAccessor(AWS_REGION)
    connections = new ConnectionsAccessor(AWS_REGION)

    eventPublisher = new TestEventPublisher(AWS_REGION)
    emailListener = new EmailListenerQueueClient(AWS_REGION)
    eventListener = new EventListenerClient(AWS_REGION)

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
  
  initiatingMember = EmptyMemberDetails
  invitedMember = EmptyMemberDetails
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
    initiatingMember = await activateNewMember(memberName, "p@ssw0rd", EmailRole.Receiver)
  })

  given(/([\w\s]+) has invited ([\w\s]+) to connect/, async (initiatingMemberName: string, invitedMemberName: string) => {
    initiatingMember = await activateNewMember(initiatingMemberName, "p@ssw0rd", EmailRole.Receiver)

    invitedMember = await activateNewMember(invitedMemberName, "p@ssw0rd", EmailRole.Sender)

    invitationId = uuidv4()
    await connectionRequests.add(initiatingMember.id!, invitedMember.id!, invitationId)
  })

  given(/an unauthorized initiating member ([\w\s]+)/, async (memberName: string) => {
    initiatingMember = buildMemberDetails(memberName, EmailRole.Sender)

    await eventPublisher.activateMember(initiatingMember.name!, initiatingMember.email!, initiatingMember.id)  

    failureResponse = "Unauthorized"
    failureCode = 401
  })

  given(/an unauthorized invited member ([\w\s]+)/, async (memberName: string) => {
    invitedMember = buildMemberDetails(memberName, EmailRole.Sender)

    await eventPublisher.activateMember(invitedMember.name!, invitedMember.email!, invitedMember.id)  

    failureResponse = "Unauthorized"
    failureCode = 401
  })

  given(/an invited member ([\w\s]+)/, async (memberName: string) => {
    invitedMember = await activateNewMember(memberName, "p@ssw0rd", EmailRole.Receiver)
  })

  given(/no invited member/, async () => {
    failureResponse = "Invalid request body"
    failureCode = 400
  })

  given(/an unknown initiating member ([\w\s]+)/, async (memberName) => {
    initiatingMember = buildMemberDetails(memberName, EmailRole.Sender)
    initiatingMemberPassword = "p@ssw0rd"
    await memberCredentials.addConfirmedMember(initiatingMember.email!, initiatingMemberPassword)
  })

  when(/a connection request is made/, async () => {
    const idToken = await memberCredentials.requestIdToken(initiatingMember.email!, "p@ssw0rd")

    logger.verbose("id token  " + idToken)
    const response = await requestConnection(initiatingMember.id, invitedMember!.id, idToken)

    if (response != null)
    {
      logger.verbose("responseCode - " + response.statusCode + ",message - " + JSON.stringify(response.body))
      responseCode = response.statusCode;
      responseMessage = response.body.message
    }
  })

  when(/they are activated/, async () => {
    await eventPublisher.activateMember(initiatingMember.name!, initiatingMember.email!, initiatingMember.id)  
  })

  when(/a connection approved response occurs/, async () => {
    await sendConnectionResponse("approve")
  })

  when(/a connection rejected response occurs/, async () => {
    await sendConnectionResponse("reject")
  })

  when(/a decision-less connection response occurs/, async () => {
    failureResponse = "response for invitation " + invitationId + " failed due to unknown decision: unknown"
    failureCode=400
    await sendConnectionResponse("unknown")
  })

  when(/afterwards ([\w\s]+) is confirmed as a member/, async (memberName) => {
    await eventPublisher.activateMember(initiatingMember.name!, initiatingMember.email!, initiatingMember.id)  
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
  const response = await connectionResponse(invitationId, decision, idToken)

  if (response != null) {
    logger.verbose("responseCode - " + response.statusCode + ",message - " + JSON.stringify(response.body))
    responseCode = response.statusCode
    responseMessage = response.body.message
  }
}

function configureStageEnvVar(envVarBaseName: string) {
  const envVarName = envVarBaseName + getStage()

  if (process.env[envVarName] == undefined) {
    process.env[envVarBaseName] = resolveOutput(envVarName)
  }
  else {
    process.env[envVarBaseName] = process.env[envVarName]
  }
}

function configureEnvVar(envVarName: string)
{
  if (process.env[envVarName] == undefined)
  {
    process.env[envVarName] = resolveOutput(envVarName)
  }
}

function buildMemberDetails(memberName: string, role: EmailRole)
{
  let email: string
  if (role == EmailRole.Receiver)
  {
    email = "success@simulator.amazonses.com"
  }
  else
  {
    email = generateEmailFromName(memberName)
  }
  return {name: memberName, id: uuidv4(), email: email}
}

function generateEmailFromName(enteredName: string): string {
  return enteredName.replace(/ /g, ".") + "@gmail.com"
}

function getStage()
{
  let stage:string

  if (process.env.PipelineStage != undefined)
  {
    stage = process.env.PipelineStage 
  }
  else 
  {
    stage = "dev"
  }

  return stage
}

async function activateNewMember(name: string, password: string, role: EmailRole): Promise<MemberDetails>
{
  const member = buildMemberDetails(name, role)
  await eventPublisher.activateMember(member.name!, member.email!, member.id)  
  await memberCredentials.addConfirmedMember(member.email!, password)
  return member
}





