
Feature: Connection Response

# @business
# @connectionresponse
# @connection
# Scenario: Connection response with missing details is rejected
# Given Beryl the Peril has invited Minnie the Minx to connect
# When a decision-less connection response occurs
# Then a failure response occurs

@business
@connectionresponse
@connection
Scenario: Approved connection response
Given Beryl the Peril has invited Minnie the Minx to connect
When a connection approved response occurs
Then confirmation is received

# @business
# @connectionresponse
# @connection
# Scenario: Rejected connection response
# Given Beryl the Peril has invited Roger the Dodger to connect
# When a connection rejected response occurs
# Then no connection is made

