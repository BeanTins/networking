
export class DataMapperMock{

  put: jest.Mock
  query: jest.Mock

  constructor(){
    this.put = jest.fn()
    this.query = jest.fn()
  }

  queryResponse(records: any[]){

    const myAsyncIterable = {
      *[Symbol.asyncIterator]() {
        for (const record in records)
        {
          yield record
        }
      }
    }

    this.query.mockReturnValue(myAsyncIterable)
  }

  querySequenceResponses(recordsSequence: any[][]){

    for (const currentRecords of recordsSequence)
    {
      const myAsyncIterable = {
      *[Symbol.asyncIterator]() {
          for (const record of currentRecords)
          {
            yield record
          }
        }
      }
      this.query.mockReturnValueOnce(myAsyncIterable)
    }
  }

}

export class DataMapperFactoryMock{

  private dataMappers: Map<string, DataMapperMock>

  constructor(){
    this.dataMappers = new Map()
  }

  create(typeName: string)
  {
    const dataMapper = new DataMapperMock()
    this.dataMappers.set(typeName, dataMapper)
    return dataMapper
  }
  map(){
    return jest.fn().mockImplementation(() => {
      return {
        put: (item: any) => {
          const dataMapper = this.resolveDataMapper(item)
          return dataMapper!.put(item)
        },
        query: (item: any) => {
          const dataMapper = this.resolveDataMapper(item)
          return dataMapper!.query(item)}
      }
    })
  }

  resolveDataMapper(item: any)
  {
    let itemName = item.name
    if (itemName == undefined)
    {
      itemName = item.constructor.name
    }
    if (itemName == undefined)
    {
      throw Error("no name found for datamapper record type" + JSON.stringify(item))
    }

    const dataMapper = this.dataMappers.get(itemName)

    if (dataMapper == undefined)
    {
      throw Error("no datamapper found for " + JSON.stringify(item))
    }
    return dataMapper
  }
 
}


