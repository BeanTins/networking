import { Context, EventBridgeEvent } from "aws-lambda"
import {MemberDAO, Member} from "./infrastructure/member-dao"

export const lambdaHandler = async (event: EventBridgeEvent<any, any>, context: Context): Promise<any> => {
  
  let member = Member.create(event.detail["name"], event.detail["email"], event.detail["id"])

  const memberDAO = new MemberDAO()

  await memberDAO.save(member)
}

