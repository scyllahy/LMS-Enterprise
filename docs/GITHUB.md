# ใช้งานร่วมกับ GitHub

ระบบเก็บ source code และตรวจ/deploy ผ่าน GitHub Actions แต่ตัว Web App ทำงานบน Google Apps Script

## 1. สร้าง repository

สร้าง private repository แล้ว push โฟลเดอร์นี้ขึ้น GitHub โดยต้องไม่มี `.clasp.json`, `.env`, token หรือรหัสผ่านอยู่ใน commit

## 2. เตรียม Apps Script

1. สร้าง Apps Script project และ deploy เป็น Web app อย่างน้อยหนึ่งครั้ง
2. จด Script ID จาก Project Settings
3. จด Deployment ID จาก Manage deployments
4. ล็อกอิน clasp บนเครื่องที่เชื่อถือได้ด้วย `npx clasp login`
5. เปิดไฟล์ credentials ของ clasp (`~/.clasprc.json`) เพื่อนำเนื้อหาไปเก็บเป็น GitHub Secret ห้าม commit ไฟล์นี้

## 3. ตั้ง GitHub Secrets

ไปที่ Settings > Secrets and variables > Actions และเพิ่ม:

- `CLASPRC_JSON`: เนื้อหาทั้งหมดของ `~/.clasprc.json`
- `CLASP_JSON`: `{"scriptId":"SCRIPT_ID_จริง","rootDir":"src"}`
- `CLASP_DEPLOYMENT_ID`: Deployment ID ของ Web app เดิม

แนะนำให้สร้าง Environment ชื่อ `production` และเปิด Required reviewers เพื่อให้ต้องอนุมัติก่อน deploy

## 4. การทำงาน

- Pull Request: รัน syntax validation เท่านั้น
- Push เข้า `main`: ตรวจโค้ด, push source ไป Apps Script และอัปเดต Web app deployment เดิม
- Deploy ด้วยตนเอง: Actions > Deploy to Apps Script > Run workflow

หากยังไม่ต้องการ deploy อัตโนมัติทุกครั้ง ให้ลบส่วน `push` ใต้ `on` ใน `.github/workflows/deploy.yml` และใช้ `workflow_dispatch` เพียงอย่างเดียว
