import { v4 as uuidv4 } from "uuid"

export class Entity{
  
  readonly id: string

  constructor (id: string|null = null){
    if (id == null)
    {
      this.id = uuidv4()
    }
    else
    {
      this.id = id
    }
  }
}

export class Conversation extends Entity {

  private name: string|null
  private participantIds: Set<string>
  private adminIds: Set<string>

  private constructor(name: string|null, participantIds: Set<string>, adminIds: Set<string>, id: string|null) {
    super(id)
    this.name = name
    this.participantIds = participantIds
    this.adminIds = adminIds
  }

  public static start(participantIds: Set<string>, name: string|null = null, adminIds: Set<string> = new Set()): Conversation
  {
    const adminsNotInConversation = [...adminIds].filter(x => !participantIds.has(x))

    if (adminsNotInConversation.length > 0)
    {
      throw new AdminsNotInConversation(adminsNotInConversation)
    }
    return new Conversation(name, participantIds, adminIds, uuidv4())
  }
}

export class AdminsNotInConversation extends Error 
{
  constructor (adminIds: string[])
  {
    super("Admin Ids: [" + adminIds + "] not in the conversation")
  }
}




