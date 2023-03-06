
Feature: Validate Connections

@business
@connectionvalidate
@connection
Scenario: Validate connections rejected
Given an initiating networker Roger Ramjet
Given they are not connected to Vicky the Viking
When a validation is made
Then a rejection response occurs

@business
@connectionvalidate
@connection
Scenario: Validate connections validated
Given an initiating networker Roger Ramjet
Given they are connected to Vicky the Viking
When a validation is made
Then a validation successful response occurs

