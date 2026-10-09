# Lab 4 — AI Use and Reflection  (fill this in)

**LLM/agent used:** Gemini codex gihub copilot

## Selected key prompts (6–10)
| # | Prompt (summarised) | What I did with the result |
|---|---|---|
| 1 | Review the Lab 4 specification and identify the exact scope, requirements, acceptance criteria, and files needed for Issue 27. | I used the result to understand the Lab 4 contract and organise specification, API, UI, and test documentation before implementation. |
| 2 | Review the Issue 27 documentation for inconsistencies in Action lifecycle, requestKey idempotency, Ticket versioning, authorization, and resolution rules. | I compared the feedback with the Lab 4 requirements and updated the documentation so the specification, API, UI, and tests used the same contract. |
| 3 | Check whether the revised Issue 27 contract is internally consistent and ready to be used as the implementation contract for later issues. | I used the review to confirm the final rules for Draft/Completed/Cancelled Actions, terminal immutability, requestKey retry behavior, version conflicts, and role permissions. |
| 4 | Inspect the current repository and plan Issue 28: Actions Taken database, migration, API, authorization, validation, idempotency, and tests, without implementing frontend or dashboard work. | I used the plan to split Issue 28 into database/migration, API implementation, and verification phases and to avoid scope creep into later issues. |
| 5 |  |  |
| 6 |  |  |
| 7 |  |  |


## Reflection
    ใน Issue 27 ได้มีการใช้ codex ในการช่วย้ขียน specification.md, tests.md, ui-spec.md, api-spec.md ซึ่งก็ต้องมีการตรวจเช็คเพราะในบางครั้ง ai เขียนมาให้เราไม่ตรงกับ requirment ของ lab และนอกจากนี้ยังมีการเขียนเกินมาด้วย ไปเขียนในส่วน reviewer.md ซึ่งเกินจากที่เรา prompt ไว้ ตรงนี้ก็คือทำให้รู้ว่านอกจากที่จะ check file ที่เราสั่งแล้วเราต้องไป check ไฟล์อื่น ๆ ที่ ai อาจจะเผลอไปแก้ด้วย

    