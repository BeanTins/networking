import { DataMapper } from "@aws/dynamodb-data-mapper"
import { DataMapperFactory } from "../../../infrastructure/data-mapper-factory"
import { Conversation } from "../domain/conversation"
import { ConversationSnapshot } from "./conversation-snapshot"
import { ConversationRepository } from "../domain/conversation-repository"

export class ConversationRepositoryDynamo implements ConversationRepository
{
  dataMapper: DataMapper
  constructor() {
      this.dataMapper = DataMapperFactory.create()
   }

  async save(conversation: Conversation)
  {
    const snapshot = ConversationSnapshot.createFromConversation(conversation)

    await this.dataMapper.put(snapshot)
  }

  async load(id: string): Promise<Conversation|null>  
  {
    let conversation: Conversation | null = null
    const matchingItemIterator = this.dataMapper.query(ConversationSnapshot, 
      { id: id})

    for await (const matchingConversation of matchingItemIterator)
    {
      conversation = matchingConversation.toConversation()
      break
    }
            
    return conversation
  }
}

