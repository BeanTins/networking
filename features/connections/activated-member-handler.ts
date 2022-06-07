import { Context, EventBridgeEvent } from "aws-lambda"
import {MemberDAO, Member} from "./infrastructure/member-dao"
import logger from "../../infrastructure/lambda-logger"

export const lambdaHandler = async (event: EventBridgeEvent<any, any>, context: Context): Promise<any> => {
  
  try{
    const handler = new NotificationHandler()

    await handler.handle(new MemberActivatedEvent(event.detail.email, event.detail.id, event.detail.name))
  }
  catch(error)
  {
    logger.error("activated member handler failed for : " + JSON.stringify(event) + " with error:" + error)
    throw error
  }
}

class NotificationHandler
{
  private memberDAO: MemberDAO
  constructor()
  {
    this.memberDAO = new MemberDAO()
  }

  async handle(event: MemberActivatedEvent)
  {
    let member = Member.create(event.name, event.email, event.id)

    await this.memberDAO.save(member)
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

