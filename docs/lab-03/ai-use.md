# Lab 2 — AI Use and Reflection  (fill this in)

**LLM/agent used:** Gemini codex gihub copilot

## Selected key prompts (6–10)
| # | Prompt (summarised) | What I did with the result |
|---|---|---|
| 1 | Used Codex to explain the Lab 3 requirements and help draft the four documents: specification.md, tests.md, ui-spec.md, and api-spec.md. | Used the AI-generated drafts as a starting point, then checked all documents against the Lab 3 sheet. I found and corrected inconsistencies, such as conflicting Administrator permissions regarding Internal Notes and IT Priority. |
| 2 | Asked Codex to implement the authentication system for Issue 18, including sign in, password change, session, and CSRF. | Reviewed the implementation, ran tests, and checked that authentication and security requirements were correctly implemented. |
| 3 | Asked Codex to review the Issue 18 implementation against the Lab 3 specification and identify missing or inconsistent requirements. | Used the review to verify the scope and distinguish Issue 18 requirements from future Lab 3 work. |
| 4 | Asked Codex to fix the password hash format used by the seed data. | Reviewed the change and ran the authentication and database tests to confirm the fix. |
| 5 | Asked Codex to implement the IT Staff Ticket Queue according to Issue #19 requirements, including API, RBAC, search/filter/sort/pagination, UI, and tests. | Reviewed the implementation, tested the Queue API/UI, fixed documented gaps, and verified the required behavior. |
| 6 | Asked Codex to implement a genuine migration regression test for pre-existing Lab 2 Ticket/Attachment data. | Added an isolated temporary PostgreSQL migration test that applies real Lab 2 → Lab 3 migrations and verifies IDs, data, ownership, and relationships are preserved. |



## Reflection
    ใน Issue 17 ได้มีการใช้ codex ในการช่วยอธิบายรายละเอียดของ lab 3 ให้เข้าใจมากขึ้น รวมถึงให้ช่วยร่างไฟล์ทั้ง 4 ไฟล์ ได้แก้ไฟล์ specification.md, test.md, ui-spec.md และ api-spec.md ซึ่งได้มีการตรวจ check เทียบกับใบ lab ซึ่งทำให้เห็นว่าในบางไฟล์อย่าง specification.md ได้มีการเขียนบางจุดขัดแย้งกัน หรือเขียนไม่เป็นไปตามที่ใบ lab กำหนด เช่น การไม่ให้ Admin เห็น internal notes ซึ่งตรงนี้เราก็ต้องทำการแก้ไข

    ใน Issue 18 ได้มีการ้พิ่มในส่วนดาร sign in เข้ามาและได้ให้มีก่ี change password ทำให้ในส่วนที่เราใช้ codex มาช่วยเมื่อลอง run test แล้วไม่ผ่าน ซึ่งเจอปัญว่า Ai อาจจะลบบาง est ออกไปเพื่อให้ run ผ่าน ดังนั้นเราก็ต้องตรวจสอบแบบที่ไม่ได้ตรวจแค่มัน test ผ่าหมดแล้วแต่ต้องตวจด้วยว่ามีการแก้ไขตรงไหนไปบ้าง

    ใน issue 19 นี้เป็นการทำในส่วนของ staff queue ซึ่งเราก็ได้ใช้ codex ช่วยเขียน โดยก็เจอปัญหาเกี่ยวกับการเขียน Ui หน้าบ้านที่อาจเขียนมาเหมือนเป็ร HTML เปลื่อย ๆ ไม่มี css ตรงนี้เราก็ต้อง check หน้าเว็ป ทั้งงยังจเอ ปัญหาเกี่ยวกับการ test เรื่อง migration ที่ต้อง cjeck ขอมูลว่ามาไหม ตรงนี้ในตอนแรกก็ไม่มี ต้องคอยตรวจสอบให้ตรงกับ Specification.md ที่เราทำไว้