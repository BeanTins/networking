import { MemberCredentialsAccessor} from "./member-credentials-accessor"
import  { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge"
import logger from "./component-test-logger"
import { v4 as uuidv4 } from "uuid"

type EmailRole = "sender" | "receiver"

export class FakeMember
{
  memberCredentials: MemberCredentialsAccessor
  name: string
  email:  string
  emailRole: EmailRole
  id: string
  password: string
  private eventbridge: EventBridgeClient
  private eventBusArn: string

  
  constructor(region: string, memberCredentials: MemberCredentialsAccessor, eventBusArn: string)
  {
    this.eventbridge = new EventBridgeClient({region: region})
    this.eventBusArn = eventBusArn

    this.memberCredentials = memberCredentials
  }

  withDetails(name: string, role: EmailRole)
  {
    this.name = name
    this.emailRole = role
    if (role == "receiver")
    {
      this.email = "success@simulator.amazonses.com"
    }
    else
    {
      this.email = this.generateEmailFromName(name)
    }
    this.id = uuidv4()
    return this
  }

  async authenticatedAndActivatedWithDetails(name: string, role: EmailRole, password: string)
  {
      this.withDetails(name, role)
      await this.authenticatedWithPassword(password)
      await this.activated()
  }


  async authenticatedWithPassword(password: string)
  {
    this.password = password
    await this.memberCredentials.addConfirmedMember(this.email!, password)
  }

  async activated()
  {
    await this.activateMember(this.name!, this.email!, this.id) 
  }

  private generateEmailFromName(enteredName: string): string {
    return enteredName.replace(/ /g, ".") + "@gmail.com"
  }

  private async activateMember(name: string, email: string, id: string | null)
  {
    const params = {
    Entries: [
      {
        Detail: JSON.stringify({name: name, email: email, id: id}),
        DetailType: "MemberActivatedEvent",
        EventBusName: this.eventBusArn,
        Source: "membership.beantins.com",
      }
    ]
    }

    try
    {
       logger.verbose("post MemberActivatedEvent - " + JSON.stringify(params))
       const result = await this.eventbridge.send(new PutEventsCommand(params))
       logger.verbose("post MemberActivatedEvent successfully - " + JSON.stringify(result))
    }
    catch(error)
    {
      logger.error("Failed to post member activated event: " + error)
    }
  }

  
}





