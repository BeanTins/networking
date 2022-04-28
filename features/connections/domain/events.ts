export class ConnectionRequestedEvent {
    invitationId: string
    initiatingMemberId: string
    invitedMemberId: string
  
    constructor(initiatingMemberId: string, invitedMemberId: string, invitationId: string){
      this.initiatingMemberId = initiatingMemberId
      this.invitedMemberId = invitedMemberId
      this.invitationId = invitationId
    }
  }
  