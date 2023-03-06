Feature: Connection Response

@technical
@connectionresponse
@connection
Scenario: Connection response without credentials
Given an initiating networker Greaser Greg
And an unauthorized invited networker Roger Ramjet
When a connection approved response occurs
Then a failure response occurs

