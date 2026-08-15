# Lab 1 — AI Use and Reflection  (fill this in)

**LLM/agent used:** Gemini

## Selected key prompts (6–10)
| # | Prompt (summarised) | What I did with the result |
|---|---|---|
| 1 | 1. Fetch ${API_URL}/api/health. If the response is not ok, throw an error. 2. Return { online: true, categories: [] } (Leave the categories array empty for now). 3. STRICT RULE: DO NOT implement the fetch for /api/categories (Issue 4). We will do that later. | เอาผลลัพธ์มาตรวจสอบความถูกต้อง และทำความเข้าใจเกี่ยวกับการ Fetch real api call และนำมาใส่ในไฟล์ และลอง test และลองดูที่หน้า web ว่าได้แสดงข้อความ error เมื่อ server ปิดหรือไม่ |
| 2 | Write a Prisma seed script in TypeScript (server/prisma/seed.ts). I need to insert 4 IT request categories: 'Account and Access', 'Hardware', 'Software', and 'Network'. STRICT RULE: You must use prisma.category.upsert so the script is safe to run more than once without creating duplicates. | ตรวจสอบทำความเข้าใจการใช้ upsert นำโค้ดใส่ใน seed.ts และรันคำสั่ง seed สำเร็จ|
| 3 | Write Express route GET /api/categories using Prisma to fetch all categories ordered by id (asc). | นำโค้ดไปใส่ในฝั่ง Server เพื่อสร้าง API สำหรับดึงข้อมูลจาก Database |
| 4 | Update React frontend to fetch real data from /api/categories and render the list in JSX. | นำโค้ดมาปรับแก้ใน App.tsx เพื่อแทนที่ Array ว่าง และแสดงผลรายการบนหน้าเว็บ |
| 5 | Implement the two pending tests in App.test.tsx using Vitest and React Testing Library (Mock API success and error). | นำโค้ดไปใส่ในไฟล์ App.test.tsx เพื่อเขียนเทสต์ทดสอบหน้าเว็บเวลาเรียก API |
| 6 | — | — |

## Reflection

ใน issue 2 ได้มีการใช้ AI ให้เขียนลงบนไฟล์เป็นครั้งแรกในตอนแรกได้มีการ Prompt คำสั่งเข้า ผลลัพธ์ออกมาเป็นแบบที่ทำส่วนอื่น ๆ เกินขอบเขตของ issue 2 ไป ทำให้ต้องมีการ prompt ใหม่และกำหนดของเขตการทำงานให้ชัดเจนยิ่งขึ้น

ใน Issue 3 มีการใช้ AI ช่วยเขียนโค้ดในโฟลเดอร์ server สำหรับไฟล์ seed.ts เพื่อจำลองข้อมูล Category สิ่งที่ได้เรียนรู้ใหม่คือ AI เลือกใช้คำสั่ง upsert แทนการ create เฉยย ๆ ซึ่งเป็นการตรวจสอบก่อนว่ามีข้อมูลหรือยัง

ใน Issue 4 ได้มีการใช้ AI ในการเขียน API ให้ดึงข้อมูลมั้ง 4 หมวดหมู่จาก Database และได้เรียนรู้วิธีการเขียน test ในส่วนของ it.todo ทั้งใน server และใน client เพื่อ check state ของ UI ที่ไม่เคยเขียนมาก่อน รวมถึงได้รู้จักกับการ Mock แล้วก็เจอ error ตอนที่ database ยังไม่ได้เปิด ทำให้ตอน test หน้าเว็ป fail เลยต้องแก้โค้ดส่วน server/App.ts ตรง catch (error) ต้องเพิ่ม console.error("DATABASE ERROR:", error); เข้าไปจึงได้รู้ error จาก console