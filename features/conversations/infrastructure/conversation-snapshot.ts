import { Conversation } from "../domain/conversation"
import {
  attribute,
  hashKey,
  table,
} from "@aws/dynamodb-data-mapper-annotations"

@table(process.env.ConversationsTable!)
export class ConversationSnapshot {
  @hashKey({type: "String"})
  public id: string

  @attribute({type: "String"})
  name: string

  @attribute({type: "Set", memberType: "String"})
  participantIds: Set<string>

  @attribute({type: "Set", memberType: "String"})
  adminIds: Set<string>

  public static createFromConversation(conversation: Conversation) : ConversationSnapshot  {
    var conversationSnapshot: ConversationSnapshot = new ConversationSnapshot()

    Object.assign(conversationSnapshot, conversation, 
      {participantIds: conversation["participantIds"],
       adminIds: conversation["adminIds"]})
   
    return conversationSnapshot
  }

  public toConversation() : Conversation {
    var conversation: Conversation = Conversation.start(this.participantIds, this.name, this.adminIds)

    Object.assign(conversation, {id: this.id})

    return conversation
  }
}
