export class ConnectionRequested {
    invitationId: string
    initiatingMemberId: string
    invitedMemberId: string
  
    constructor(initiatingMemberId: string, invitedMemberId: string, invitationId: string){
      this.initiatingMemberId = initiatingMemberId
      this.invitedMemberId = invitedMemberId
      this.invitationId = invitationId
    }
  }
  
export class ConnectionAdded {
  memberId: string
  connectionMemberId: string

  constructor(memberId: string, connectionMemberId: string){
    this.memberId = memberId
    this.connectionMemberId = connectionMemberId
  }
}
    
