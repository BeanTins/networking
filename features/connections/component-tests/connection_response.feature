
Feature: Connection Response

Scenario: Approved connection response
Given Beryl the Peril has invited Minnie the Minx to connect
When a connection approved response occurs
Then confirmation is received

Scenario: Rejected connection response
Given Beryl the Peril has invited Roger the Dodger to connect
When a connection rejected response occurs
Then no connection is made

