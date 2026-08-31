# Lab 1 — AI Use and Reflection  (fill this in)

**LLM/agent used:** Gemini

## Selected key prompts (6–10)
| # | Prompt (summarised) | What I did with the result |
|---|---|---|
| 1 | Act as an AI Specification Agent... Please draft the complete content for the `docs/lab-02/specification.md` file based on Lab 2 requirements. | นำโครงร่างที่ได้มาอ่านทบทวน ตรวจสอบ Scope, Business Rules, และ Acceptance Criteria ก่อนบันทึกลงไฟล์ |
| 2 | What are tests.md, ui-spec.md, api-spec.md and what prompts should I use to generate them? | ทำความเข้าใจหน้าที่ของเอกสารข้อกำหนดแต่ละส่วน และนำ Prompt ที่ AI แนะนำไปใช้สร้างเอกสารทีละไฟล์ |
| 3 | Act as an AI Specification Agent... Please generate the `docs/lab-02/tests.md` file based on the AC defined in my specification.md. | ตรวจสอบตาราง Test Plan ว่าครอบคลุม Unit, API, UI Component, และ E2E ครบถ้วนตาม AC แล้วนำไปเซฟลงไฟล์ |
| 4 | Please generate the `docs/lab-02/ui-spec.md` file defining the UI and responsive guidelines based on the "Zen Green Theme". | ตรวจสอบ Design Tokens, Component States และข้อบังคับ Responsive ให้ตรงกับโจทย์แล็บ ก่อนนำไปบันทึกลงโปรเจกต์ |
| 5 | Please generate the `docs/lab-02/api-spec.md` file defining the REST API contract for the Requester ticketing system. | ตรวจสอบ Endpoint, HTTP Status Code และ Headers ก่อนบันทึกนำไปใช้งานจริง |

## Reflection
    ใน Issue 5 ในตอนแรกยังไม่คอ่ยแน่ในว่าใน file specification.md ต้องใส่อะไรบ้าง จึงให้ ai มาช่วยร่างโครงสร้าง รวมถึงไฟล์ อื่น ๆ ที่ต้องทำใน issue นี้ด้้วย และได้อ่านทำความเข้าใจพวก enginerring contract, APT contract, Business Rule, Acceptance Criteria