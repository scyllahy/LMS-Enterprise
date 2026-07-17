# การติดตั้ง LMS Studio Enterprise

## สิ่งที่ต้องมี

- บัญชี Google Workspace ที่สร้าง Spreadsheet, Drive folder และ Apps Script trigger ได้
- Node.js 18 ขึ้นไป และสิทธิ์ deploy Apps Script

## ติดตั้งและอัปโหลด

1. รัน `npm install`
2. คัดลอก `.clasp.json.example` เป็น `.clasp.json` และใส่ Script ID ของโปรเจกต์
3. รัน `npm run check` แล้ว `npm run push`
4. เปิด Apps Script > Project Settings > Script Properties และเพิ่มค่าต่อไปนี้

   - `INSTALL_KEY`: ค่าลับแบบสุ่ม ใช้ครั้งเดียว
   - `SETUP_SCHOOL_NAME`, `SETUP_SCHOOL_CODE`
   - `SETUP_ADMIN_NAME`, `SETUP_ADMIN_EMAIL`, `SETUP_ADMIN_USERNAME`
   - `SETUP_ADMIN_PASSWORD`: อย่างน้อย 12 ตัวอักษรและไม่ควรซ้ำกับบริการอื่น

5. ใน Apps Script editor เลือกฟังก์ชัน `setupLMSStudioEnterprise_` แล้วกด Run หนึ่งครั้งและอนุมัติสิทธิ์ ฟังก์ชัน private นี้จะอ่าน `INSTALL_KEY` จาก Script Properties และระบบจะล้างค่านี้อัตโนมัติเมื่อติดตั้งสำเร็จ
6. รัน `checkLMSStudioEnterprise()` และตรวจว่า database, drive และ triggers พร้อม
7. Deploy > New deployment > Web app โดยเลือก Execute as “User deploying” และกำหนดผู้เข้าถึงตามนโยบายของโรงเรียน

หลังล็อกอินครั้งแรก ให้เปลี่ยนรหัสผ่านผู้ดูแลทันที ห้ามเก็บ `.clasp.json` หรือค่าลับไว้ใน Git

## บริการเสริม (ไม่บังคับ)

- Telegram: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_IDS`
- LINE: `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_CHANNEL_SECRET`
- AI: `AI_ENABLED`, `AI_ENDPOINT`, `AI_API_KEY`, `AI_MODEL`

ควรทดสอบด้วย deployment สำหรับ staging ก่อนใช้งานกับนักเรียนจริง และสำรอง Spreadsheet/Drive ตามรอบเวลาของโรงเรียน
