import { DynamoDB } from "aws-sdk"
import { DataMapper } from "@aws/dynamodb-data-mapper"
import { DataMapperFactory } from "../infrastructure/data-mapper-factory"
import { v4 as uuidv4 } from "uuid"
import {
  attribute,
  hashKey,
  rangeKey,
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
    let member = new ConnectionRequest()

    member.invitationId = uuidv4()
    member.initiatingMemberId = initiatingMemberId
    member.invitedMemberId = invitedMemberId

    return member
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

  async exists(invitationId: string): Promise<boolean|null>
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

