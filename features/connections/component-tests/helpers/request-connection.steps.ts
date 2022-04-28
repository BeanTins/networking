
import { StepDefinitions } from "jest-cucumber"
import { resolveOutput } from "./output-resolver"
import { requestConnection } from "./request-connection-client"
import logger from "./component-test-logger"
import {MemberCredentialsAccessor} from "./member-credentials-accessor"
import {MemberProjectionAccessor} from "./member-projection-accessor"
import {ConnectionRequestAccessor} from "./connection-request-accessor"
import { TestEventPublisher } from "./test-event-publisher"
import { v4 as uuidv4 } from "uuid"
import { EmailListenerQueueClient} from "./email-listener-queue-client"

interface MemberDetails {id: string | null, name : string | null, email: string | null}
const EmptyMemberDetails: MemberDetails = {id: null, name: null, email: null}
enum EmailRole {Sender, Receiver}

let responseCode: number
let responseMessage: string
let failureResponse: string
let failureCode: number
let memberCredentials: MemberCredentialsAccessor
let eventPublisher: TestEventPublisher
let memberProjection: MemberProjectionAccessor
let connectionRequests: ConnectionRequestAccessor
let initiatingMember: MemberDetails
let initiatingMemberPassword: string
let invitedMember: MemberDetails
let emailListener: EmailListenerQueueClient

beforeAll(async()=> {

  try
  {
    configureEnvVar("ConnectionRequestEndpoint")
    configureEnvVar("MemberProjection")
    configureEnvVar("ConnectionRequestTable")
    configureStageEnvVar("MembershipEventBusFakeArn")
    configureStageEnvVar("EmailListenerQueueName")
    configureStageEnvVar("UserPoolId")
    configureStageEnvVar("UserPoolMemberClientId")

    memberCredentials = new MemberCredentialsAccessor("us-east-1")
    memberProjection = new MemberProjectionAccessor("us-east-1")
    connectionRequests = new ConnectionRequestAccessor("us-east-1")

    eventPublisher = new TestEventPublisher("us-east-1")
    emailListener = new EmailListenerQueueClient("us-east-1")

    await emailListener.clear()
  } 
  catch(error)
  {
    logger.error(error)
  }
})

beforeEach(async () => {
  jest.setTimeout(20000)
  initiatingMember = EmptyMemberDetails
  invitedMember = EmptyMemberDetails
  await memberCredentials.clear()
  await memberProjection.clear()
  await connectionRequests.clear()
})

export const requestConnectionSteps: StepDefinitions = ({ given, and, when, then }) => {

  given(/an initiating member ([\w\s]+)/, async (memberName: string) => {
    initiatingMember = buildMemberDetails(memberName, EmailRole.Sender)
    initiatingMemberPassword = "p@ssw0rd"

    await eventPublisher.activateMember(initiatingMember.name!, initiatingMember.email!, initiatingMember.id)  
    await memberCredentials.addConfirmedMember(initiatingMember.email!, initiatingMemberPassword)
  })

  given(/an unauthorized initiating member ([\w\s]+)/, async (memberName: string) => {
    initiatingMember = buildMemberDetails(memberName, EmailRole.Sender)

    await eventPublisher.activateMember(initiatingMember.name!, initiatingMember.email!, initiatingMember.id)  

    failureResponse = "Unauthorized"
    failureCode = 401
  })

  given(/an invited member ([\w\s]+)/, async (memberName: string) => {
    invitedMember = buildMemberDetails(memberName, EmailRole.Receiver)

    await eventPublisher.activateMember(invitedMember.name!, invitedMember.email!, invitedMember.id)  
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

  when(/afterwards ([\w\s]+) is confirmed as a member/, async (memberName) => {
    await eventPublisher.activateMember(initiatingMember.name!, initiatingMember.email!, initiatingMember.id)  
    await memberProjection.waitForMembersToBeStored([initiatingMember.name!, invitedMember.name!])
  })
  
  then(/an invitation is received/, async() => {
    expect(await memberProjection.waitForMembersToBeStored([initiatingMember.name!, invitedMember.name!]))
    expect(await emailListener.waitForEmail(initiatingMember.email!, invitedMember.email!, "Invitation to connect on BeanTins")).toBe(true)

  })

  then(/in future they are recognised/, async() => {
    expect(await memberProjection.waitForMembersToBeStored([initiatingMember.name!, invitedMember.name!]))
  })

  then(/their invitation request fails/, () => {
    expect(responseCode).toBe(failureCode)
    expect(responseMessage).toBe(failureResponse)
  })

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
  if (role == EmailRole.Sender)
  {
    email = "beantins18@gmail.com"
  }
  else
  {
    email = "success@simulator.amazonses.com"
  }
  return {name: memberName, id: uuidv4(), email: email}
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





