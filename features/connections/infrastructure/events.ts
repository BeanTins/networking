export class UnspecifiedConnectionRequest{
    initiatingNetworkerId: string
    invitedNetworkerId: string
  
    constructor(initiatingNetworkerId: string, invitedNetworkerId: string)
    {
      if (!initiatingNetworkerId)
      {
          throw Error("UnspecifiedConnectionRequest missing field initiatingNetworkerId")
      }
      if (!invitedNetworkerId)
      {
          throw Error("UnspecifiedConnectionRequest missing field initiatingNetworkerId")
      }
      this.initiatingNetworkerId = initiatingNetworkerId
      this.invitedNetworkerId = invitedNetworkerId
    }
  }
  