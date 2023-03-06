Feature: Connection Request

@technical
@connectionrequest
@connection
Scenario: Recognise an existing member (projection)
Given an unknown initiating networker Roger Ramjet
When they are activated
Then in future they are recognised

@technical
@connectionrequest
@connection
Scenario: Connection request without credentials
Given an unauthorized initiating networker Roger Ramjet
And an invited networker Greaser Greg
When a connection request is made
Then a failure response occurs

@slow
@technical
@connectionrequest
@connection
Scenario: Deferred connection invitation (timeout: 90 seconds)
Given an unknown initiating networker Tom Thumb
And an invited networker Biffo the Bear 
When a connection request is made
Then an unspecified connection request occurs
When afterwards Tom Thumb is confirmed as a member
Then an invitation is received
