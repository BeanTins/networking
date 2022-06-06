import { DataMapperFactory } from "../../../infrastructure/data-mapper-factory"
import { DataMapper} from "@aws/dynamodb-data-mapper"

import {
  attribute,
  hashKey,
  table
} from "@aws/dynamodb-data-mapper-annotations"
  
@table(process.env.MemberProjection!)
export class Member {
  @hashKey({type: 'String'})
  public id: string

  @attribute({type: "String"})
  email: string

  @attribute({type: "String"})
  name: string

  static create(name: string, email: string, id: string){
    let member = new Member()

    member.name = name
    member.email = email
    member.id = id

    return member
  }
}

export class MemberDAO
{
  dataMapper: DataMapper
  constructor() {
    this.dataMapper = DataMapperFactory.create()
  }

  async save(member: Member)
  {
    const result = await this.dataMapper.put(member)

    return result
  }

  async load(id: string): Promise<Member|null>
  {
    let matchingMember: Member|null = null
    const matchingItemIterator = this.dataMapper.query(Member, 
      { id: id }, {})

    for await (const currentMatchingMember of matchingItemIterator)
    {
      matchingMember = currentMatchingMember
      break
    }
    

    return matchingMember
  }

  async exists(id: string): Promise<boolean>
  {
    return await this.load(id) != null
  }

}

