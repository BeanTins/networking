Feature: Connection Response

@technical
@connectionresponse
Scenario: Connection response without credentials
Given an initiating member Greaser Greg
And an unauthorized invited member Roger Ramjet
When a connection approved response occurs
Then a failure response occurs

