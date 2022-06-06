export interface ValidateConversationConnections{
  isInstigatorConnectedWithEveryone(instigaterMemberId: string, otherParticipantIds: Set<string>):Promise<boolean>
}
