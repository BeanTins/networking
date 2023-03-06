import { Context, EventBridgeEvent } from "aws-lambda"
import {NetworkerDAO} from "./infrastructure/networker-dao"
import logger from "../../infrastructure/lambda-logger"

export const lambdaHandler = async (event: EventBridgeEvent<any, any>, context: Context): Promise<any> => {
  
  try{
    const handler = new ActivatedMemberHandler()

    await handler.handle(event.detail)
  }
  catch(error)
  {
    logger.error("activated member handler failed for : " + JSON.stringify(event) + " with error:" + error)
    throw error
  }
}

export class ActivatedMemberHandler
{
  private networkerDAO: NetworkerDAO
  constructor()
  {
    this.networkerDAO = new NetworkerDAO(process.env.AWS_REGION!)
  }

  async handle(rawActivatedMemberEvent: any)
  {
    const activatedMember = new MemberActivatedEvent(rawActivatedMemberEvent.email, rawActivatedMemberEvent.id, rawActivatedMemberEvent.name)
    await this.networkerDAO.save({name: activatedMember.name, email: activatedMember.email, id: activatedMember.id})
  }
}

export class MemberActivatedEvent {
  id: string
  name: string
  email: string

  constructor(email: string, id: string, name: string){
    if (!email)
    {
      throw new Error("MemberActivatedEvent missing field email")
    }
    if (!id)
    {
      throw new Error("MemberActivatedEvent missing field id")
    }
    if (!name)
    {
      throw new Error("MemberActivatedEvent missing field name")
    }

    this.email = email
    this.id = id
    this.name = name
  }
}

