Feature: Request Connection

Scenario: Connection request without credentials
Given an unauthorized initiating member Roger Ramjet
And an invited member Greaser Greg
When a connection request is made
Then their invitation request fails

Scenario: Deferred connection invitation

Given an unknown initiating member Tom Thumb
And an invited member Biffo the Bear 
When a connection request is made
And afterwards Tom Thumb is confirmed as a member
Then an invitation is received
