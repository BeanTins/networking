export class ConnectionRequested {
    invitationId: string
    initiatingNetworkerId: string
    invitedNetworkerId: string
  
    constructor(initiatingNetworkerId: string, invitedNetworkerId: string, invitationId: string){
      this.initiatingNetworkerId = initiatingNetworkerId
      this.invitedNetworkerId = invitedNetworkerId
      this.invitationId = invitationId
    }
  }
  
export class ConnectionAdded {
  networkerId: string
  connectionNetworkerId: string

  constructor(networkerId: string, connectionNetworkerId: string){
    this.networkerId = networkerId
    this.connectionNetworkerId = connectionNetworkerId
  }
}
    
