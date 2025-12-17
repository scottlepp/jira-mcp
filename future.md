we want this to be in a public github repo. it will be maintained by an agent. so we will need github actions.

action - security check - use an agent to update dependencies in the code and run the tests to confirm
checking for security issues with dependencies and making updates

action - bug issue check - use an agent to fix bugs in the code that have been added as issues in the repo and run the tests to confirm
checking for issues and fixing them. NOTE: the issues have to be code related and cannot break or add features that can cause harm. the agent must perform deep analysis and validation of the issue before accepting the issue or closing it

action - pull request review

- use an agent to read pull requests, analyze them and offer suggestions.
- if a pull request has no test coverage, the agent should generate a test to cover the code and commit it

implementation details:

- all the actions should run as cron jobs once per day and allow manual execution of the job
- use a generic sdk for the agents that can accept any model, but the model implementation will be google gemini ( latest version )
  analyze this requirement, determine the best tools, and add to a plan
