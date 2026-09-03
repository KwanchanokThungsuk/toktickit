# Lab 2 — AI Use and Reflection  (fill this in)

**LLM/agent used:** Gemini

## Selected key prompts (6–10)
| # | Prompt (summarised) | What I did with the result |
|---|---|---|
| 1 | Act as an AI Specification Agent... Please draft the complete content for the `docs/lab-02/specification.md` file based on Lab 2 requirements. | นำโครงร่างที่ได้มาอ่านทบทวน ตรวจสอบ Scope, Business Rules, และ Acceptance Criteria ก่อนบันทึกลงไฟล์ |
| 2 | What are tests.md, ui-spec.md, api-spec.md and what prompts should I use to generate them? | ทำความเข้าใจหน้าที่ของเอกสารข้อกำหนดแต่ละส่วน และนำ Prompt ที่ AI แนะนำไปใช้สร้างเอกสารทีละไฟล์ |
| 3 | Act as an AI Specification Agent... Please generate the `docs/lab-02/tests.md` file based on the AC defined in my specification.md. | ตรวจสอบตาราง Test Plan ว่าครอบคลุม Unit, API, UI Component, และ E2E ครบถ้วนตาม AC แล้วนำไปเซฟลงไฟล์ |
| 4 | Please generate the `docs/lab-02/ui-spec.md` file defining the UI and responsive guidelines based on the "Zen Green Theme". | ตรวจสอบ Design Tokens, Component States และข้อบังคับ Responsive ให้ตรงกับโจทย์แล็บ ก่อนนำไปบันทึกลงโปรเจกต์ |
| 5 | Please generate the `docs/lab-02/api-spec.md` file defining the REST API contract for the Requester ticketing system. | ตรวจสอบ Endpoint, HTTP Status Code และ Headers ก่อนบันทึกนำไปใช้งานจริง |
| 6 | Read docs/lab-02/specification.md, Section 7 (Data Changes), and update the database schema accordingly. Create seed data with 4 Categories, 6 Related Systems, 4 active Requesters, and 1 inactive Requester. Ensure the seed script is idempotent, so running it multiple times does not create duplicate data. Provide the terminal commands needed to run the migration and execute the seed script. | ตรวจสอบ schema และ seed ที่ ai สร้างว่าต้องกับที่ในแลปกำหนดหรือไม่|
| 7 | Implement Zen Green UI foundation (AppShell, Badge, Forms, State components) step-by-step using .tsx strictly, and write corresponding unit tests. | ตรวจสอบโครงสร้าง Zen Green Theme โค้ดคอมโพเนนต์ และผลลัพธ์ของ Unit Tests ด้วย React Testing Library ให้ผ่านทุกเกณฑ์ก่อนบันทึกลงโปรเจกต์ |
| 8 | Implement Issue #8 step-by-step: Create backend API for active requesters, build Frontend Context and Selection UI, integrate into App.tsx, and write unit tests. | ตรวจสอบโค้ด API และ Context ว่าดึงเฉพาะ Active User จริง แก้ไขข้อผิดพลาดของ AI ที่เผลอ import ไฟล์ .js และใช้คลาส Bootstrap เก่า ก่อนรันเทสต์ฝั่ง Client ให้ผ่านทั้งหมด |
| 9 | สร้างฟน้า UI create ticket รวมถึง validation ของข้อมูลเวลา user กรอก ให้เป็นไแตาม specification.md file | ตรวจสอบความถูกต้องของหน้าเว็ป และ code ว่าเป็นไปตามที่กำหนดหรือไม่ |

## Reflection
    ใน Issue 5 ในตอนแรกยังไม่คอ่ยแน่ในว่าใน file specification.md ต้องใส่อะไรบ้าง จึงให้ ai มาช่วยร่างโครงสร้าง รวมถึงไฟล์ อื่น ๆ ที่ต้องทำใน issue นี้ด้้วย และได้อ่านทำความเข้าใจพวก enginerring contract, APT contract, Business Rule, Acceptance Criteria


    ใน Issue 6 เป็นการให้ ai ไปอ่าน file specification.md เพื่อมาทำ database ซึ่งได้มีการใช้คำสั่งที่ไม่คุ้น นั่นคือ upsert ซึ่งเป็นคำสั่งที่ รันคำสั่งซ้ำได้โดยข้อมูลไม่ซ้ำซ้อน ได้มี error เป็นขีแดงขึ้นใน code ซึี่งเราแก้ปัญหาโดยการใช้ Restart TS Server

    ใน Issue 7 ได้มีการให้ AI วางโครงสร้างพื้นฐานของหน้าแอปตาม Zen Green theme ในตอนแรกมีปัญหาคือเราได้สั่ง AI ด้วย prompts เดียว สิ่งที่เกิดขึ้นคือ code ที่ generate ออกกมาค่อนข้างมั่ว ทำให้ต้องทำใหม่โดยการเคย ๆ prompts ไปทีละ steps

    ใน Issue 8 ได้มีการสร้าง API และมีการดึง API มาใช้ในหน้สเว็ป ซึ่งในตอนแรกขั้นตอนนี้ดิฉันไม่เคยทำมาก่อนทำให้ไม่รู้ว่าต้องเริ่มเขียนอะไรตรงไหน จึงใช้ AI เข้ามาและอ่านโค้ดที่ถูก Generate จนเข้าใจ รวมทั้งต้องตรวจสอบเพราะ AI ยังมี เผลอเรียก ไฟล์ .js เข้ามาใช้อีกด้วย ขั้นตอนนี้เราได้แบ่ง prompt เป็น step เหมือนเดิมเพื่อให้ง่ายต่อการตรวจสอบและทำความเข้าใจ