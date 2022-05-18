Feature: Request Connection

Scenario: Recognise an existing member (projection)
Given an unknown initiating member Roger Ramjet
When they are activated
Then in future they are recognised

# Scenario: Connection request without credentials
# Given an unauthorized initiating member Roger Ramjet
# And an invited member Greaser Greg
# When a connection request is made
# Then their invitation request fails

@slow
Scenario: Deferred connection invitation (timeout: 90 seconds)
Given an unknown initiating member Tom Thumb
And an invited member Biffo the Bear 
When a connection request is made
Then an unspecified connection request occurs
When afterwards Tom Thumb is confirmed as a member
Then an invitation is received
