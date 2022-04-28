
Feature: Request Connection

Scenario: Connection request with missing details is rejected
Given an initiating member Roger Ramjet
And no invited member
When a connection request is made
Then their invitation request fails

Scenario: Valid connection request leads to invitation

Given an initiating member Tom Thumb
And an invited member Biffo the Bear 
When a connection request is made
Then an invitation is received

