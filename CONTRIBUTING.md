# Steps to contributing

1. create a PR
    1. If you are not on the Hub team, ping us in #team-hub and watch #hub-releases to know when you can test your changes
    1. ensure your PR passes CI checks
    1. ensure your PR is approved by at least one person
        - new commits will invalidate previous approvals so you should re-ask for reviews after making changes
        - request and re-request reviews via GH
            - this is to ensure people are notified through Slack/GH/Email that they are being requested
        - strive to resolve all comments
            - start and end a discussion
            - make a change based on feedback
            - open a new Linear issue for triage when there are outstanding tasks that need to be tackled outside of PR
2. merge PR into main
3. verify on dev (you, not QA)
4. promote to staging
5. verify on staging (with QA if necessary)
    1. target staging by Tuesday 12PM PST (can be ad hoc but we try to keep to this cadence)
6. verify on production (with QA if necessary)
    1. target prod by Wed EOD
7. Mark issue as “Done”
