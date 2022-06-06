import { DataMapper } from "@aws/dynamodb-data-mapper"
import { DataMapperFactory } from "../../../infrastructure/data-mapper-factory"
import { v4 as uuidv4 } from "uuid"
import {
  attribute,
  hashKey,
  table
} from "@aws/dynamodb-data-mapper-annotations"
  

@table(process.env.ConnectionRequestTable!)
export class ConnectionRequest {
  @hashKey({type: "String"})
  public invitationId: string

  @attribute({type: "String"})
  public initiatingMemberId: string

  @attribute({type: "String"})
  invitedMemberId: string

  static create(initiatingMemberId: string, invitedMemberId: string){
    let connectionRequest = new ConnectionRequest()

    connectionRequest.invitationId = uuidv4()
    connectionRequest.initiatingMemberId = initiatingMemberId
    connectionRequest.invitedMemberId = invitedMemberId

    return connectionRequest
  }
}

export class ConnectionRequestDAO
{
  dataMapper: DataMapper
  constructor() {
      this.dataMapper = DataMapperFactory.create()
   }

  async add(connectionRequest: ConnectionRequest)
  {
    await this.dataMapper.put(connectionRequest)
  }

  async remove(invitationId: string)
  {
    const toDelete = new ConnectionRequest()
    toDelete.invitationId = invitationId
    await this.dataMapper.delete(toDelete)
  }

  async get(invitationId: string): Promise<ConnectionRequest>  
  {
    const toGet = new ConnectionRequest()
    toGet.invitationId = invitationId
    return await this.dataMapper.get(toGet)
  }

  async getInvitationId(initiatingMemberId: string, invitedMemberId: string): Promise<string|undefined>  
  {
    var invitationId: string|undefined
    const matchingConnectionRequestIterator = this.dataMapper.query(ConnectionRequest, 
      { initiatingMemberId: initiatingMemberId, 
        invitedMemberId: invitedMemberId, }, 
        {indexName: "membersIndex"})

    for await (const matchingMember of matchingConnectionRequestIterator)
    {
      invitationId = matchingMember.invitationId
      break
    }

    return invitationId
  }

  async exists(invitationId: string): Promise<boolean>
  {
    let connectionExists: boolean = false
    const matchingItemIterator = this.dataMapper.query(ConnectionRequest, 
      { hashKey: invitationId})


    for await (const matchingMember of matchingItemIterator)
    {
      connectionExists = true
      break
    }
            
    return connectionExists
  }

}

