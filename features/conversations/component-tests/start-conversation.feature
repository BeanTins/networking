
Feature: Start Conversation

# @business
# @conversationstart
# @conversation
# Scenario: Conversation not started if instigator is not connected to other
# Given Beryl the Peril is not connected to Rodger the Dodger
# When a request is made to start a conversation between them
# Then a failure response occurs

@business
@conversationstart
@conversation
Scenario: Conversation started successfully
Given Beryl the Peril is connected to Minnie the Minx
When a request is made to start a conversation between them
Then the conversation starts

