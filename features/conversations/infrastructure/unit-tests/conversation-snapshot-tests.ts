import { Conversation} from "../../domain/conversation"
import { ConversationSnapshot} from "../conversation-snapshot"

//NullableString

test("snapshot to conversation", async() => {

  const snapshot = new ConversationSnapshot()
  snapshot.id = "123e4567-e89b-12d3-a456-426614174000"
  snapshot.name = "software craft chat"
  snapshot.participantIds = new Set(["1234", "4321"])
  snapshot.adminIds = new Set(["1234"])

  var conversation = snapshot.toConversation()
  expect(conversation["name"]).toBe("software craft chat")
  expect(conversation["participantIds"]).toEqual(new Set(["1234", "4321"]))
  expect(conversation["adminIds"]).toEqual(new Set(["1234"]))
  expect(conversation["id"]).toBe("123e4567-e89b-12d3-a456-426614174000")
})

test("snapshot to conversation with null name", async() => {

  const snapshot = new ConversationSnapshot()
  snapshot.id = "123e4567-e89b-12d3-a456-426614174000"
  snapshot.name = ""
  snapshot.participantIds = new Set(["1234", "4321"])
  snapshot.adminIds = new Set(["1234"])

  var conversation = snapshot.toConversation()
  expect(conversation["name"]).toBe("")
  expect(conversation["participantIds"]).toEqual(new Set(["1234", "4321"]))
  expect(conversation["adminIds"]).toEqual(new Set(["1234"]))
  expect(conversation["id"]).toBe("123e4567-e89b-12d3-a456-426614174000")
})

test("conversation to snapshot", async() => {
  
  var conversation: Conversation = Conversation.start(new Set(["1234", "4321"]), "knitting club", new Set(["1234"]))

  const snapshot = ConversationSnapshot.createFromConversation(conversation)

  expect(snapshot.name).toBe("knitting club")
  expect(snapshot.participantIds).toEqual(new Set(["1234", "4321"]))
  expect(snapshot.adminIds).toEqual(new Set(["1234"]))
})

test("snapshot has identical set of properties to conversation", async() => {
  
  const conversation = Conversation.start(new Set(["1234", "4321"]), "knitting club", new Set(["1234"]))
  const malformedMemberSnapshot = new ConversationSnapshot()
  const snapshot = ConversationSnapshot.createFromConversation(conversation)

  const memberKeys = Object.keys(conversation) as Array<keyof Conversation>
  const memberSnapshotKeys = Object.keys(snapshot) as Array<keyof ConversationSnapshot>
  const malformedMemberSnapshotKeys = Object.keys(malformedMemberSnapshot) as Array<keyof MalformedConversationMemberSnapshot>

  expect(memberKeys).toEqual(memberSnapshotKeys)
  expect(memberSnapshotKeys).not.toEqual(malformedMemberSnapshotKeys)
})

class MalformedConversationMemberSnapshot extends ConversationSnapshot{
  private spuriousProperty: string = ""
}



