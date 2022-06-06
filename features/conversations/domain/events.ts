export class ConversationStarted {
    id: string
    participantIds: Set<string>
    adminIds: Set<string>
    name: string

    constructor(id: string, participantIds: Set<string>, adminIds: Set<string>, name: string){
        this.id = id
        this.participantIds = participantIds
        this.adminIds = adminIds
        this.name = name
    }
}
  
    
