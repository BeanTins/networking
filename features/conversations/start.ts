
import { APIGatewayEvent, Context, APIGatewayProxyResult } from "aws-lambda"
import { OpenAPISpecBuilder, HttpMethod} from "../../infrastructure/open-api-spec"
import { HttpResponse } from "../../infrastructure/http-response"
import { ValidateConversationConnections } from "./domain/validate-conversation-connections"
import { ValidateConversationConnectionsDynamo} from "./infrastructure/validate-conversation-connections-dynamo"
import logger  from "../../infrastructure/lambda-logger"
import { Conversation, AdminsNotInConversation } from "./domain/conversation"
import { ConversationRepository } from "./domain/conversation-repository"
import { ConversationRepositoryDynamo } from "./infrastructure/conversation-repository-dynamo"

export const specBuilder = function() { 

  const specBuilder = new OpenAPISpecBuilder("3.0.0")

  specBuilder.describedAs("conversation start", "member request to start a conversation with a group of their connections", "1.9.0")

  const endpoint = specBuilder.withEndpoint("/conversation/start", HttpMethod.Post)
  endpoint.withRequestBodyStringProperty({name: "initiatingMemberId", required: true})
  endpoint.withRequestBodyStringProperty({name: "name", required: false})  
  endpoint.withRequestBodySetProperty({name: "invitedMemberIds", required: true, type: "string"})
  endpoint.withRequestBodySetProperty({name: "adminMemberIds", required: false, type: "string"})  
  endpoint.withResponse("201", "conversation created")
  endpoint.withResponse("400", "conversation start failed")

  return specBuilder
}()

export const lambdaHandler = async (event: APIGatewayEvent, context: Context): Promise<APIGatewayProxyResult> => { 
    var controller: StartController = new StartController()
  
    return await controller.start(event.body)
  }
  
export class StartController {

async start(startDTO: any) {
    var response: any

    try {
      logger.verbose("incoming request - " + JSON.stringify(startDTO))
      
      const rawCommand = JSON.parse(startDTO)

      const command = new StartCommand(rawCommand.initiatingMemberId, rawCommand.invitedMemberIds, rawCommand.name, rawCommand.adminIds)

      const commandHandler = new StartCommandHandler(new ValidateConversationConnectionsDynamo(process.env.AWS_REGION!))

      await commandHandler.handle(command)

      response = HttpResponse.created("conversation")
    }
    catch (error) {
      const statusCodeMap = new Map<any, number>([
        [UnknownConnections, 400],
        [AdminsNotInConversation, 400]
      ])

     console.log(error)
      response = HttpResponse.error(error, statusCodeMap)
    }
    return response
}
}

export class StartCommandHandler {

  private validateConversationConnections: ValidateConversationConnections
  private conversationRepository: ConversationRepository

  public constructor(validateConversationConnections: ValidateConversationConnections) {
    this.validateConversationConnections = validateConversationConnections
    this.conversationRepository = new ConversationRepositoryDynamo()
  }

  async handle(command: StartCommand) {

    try{
      if(await this.validateConversationConnections.isInstigatorConnectedWithEveryone(command.initiatingMemberId, command.invitedMemberIds))
      {
        const conversation = Conversation.start(new Set([...command.invitedMemberIds, command.initiatingMemberId]), command.name, command.adminIds)
        await this.conversationRepository.save(conversation)
      }
      else
      {
        throw new UnknownConnections("member " + command.initiatingMemberId + " not connected with all: " + JSON.stringify(Array.from(command.invitedMemberIds)))
      }
    }
    catch(error)
    {
      logger.error("conversation start failed for command: " + JSON.stringify(command) + " with error:" + error)
      throw error
    }
  }
}

export class StartCommand {

  constructor(initiatingMemberId: string, invitedMemberIds: string[], name: string, adminIds: string[])
  {
    this.initiatingMemberId = initiatingMemberId
    this.invitedMemberIds = new Set(invitedMemberIds)
    this.name = name
    this.adminIds = new Set(adminIds)
  }
  initiatingMemberId: string
  invitedMemberIds: Set<string>
  name: string
  adminIds: Set<string>
}

class UnknownConnections extends Error {}
  
  
