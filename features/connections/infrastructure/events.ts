export class UnspecifiedConnectionRequest{
    initiatingMemberId: string
    invitedMemberId: string
  
    constructor(initiatingMemberId: string, invitedMemberId: string)
    {
      if (!initiatingMemberId)
      {
          throw Error("UnspecifiedConnectionRequest missing field initiatingMemberId")
      }
      if (!invitedMemberId)
      {
          throw Error("UnspecifiedConnectionRequest missing field initiatingMemberId")
      }
      this.initiatingMemberId = initiatingMemberId
      this.invitedMemberId = invitedMemberId
    }
  }
  