
Feature: Request Connection

@business
@connectionrequest
@connection
Scenario: Connection request with missing details is rejected
Given an initiating networker Roger Ramjet
And no invited networker
When a connection request is made
Then a failure response occurs

@business
@connectionrequest
@connection
Scenario: Valid connection request leads to invitation
Given an initiating networker Tom Thumb
And an invited networker Biffo the Bear 
When a connection request is made
Then an invitation is received

