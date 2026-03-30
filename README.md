# Dorm Billing App (หอพักสมใจ)

เว็บแอปออกบิลค่าหอพักแบบมืออาชีพ เขียนด้วย TypeScript + React + Vite

## ฟีเจอร์หลัก

- รองรับห้อง A1-A7 และ B1-B9 ตามเรตราคาที่กำหนด
- เลือกการคิดค่าเช่าแบบจ่ายล่วงหน้า/จ่ายเดือนปัจจุบันรายห้องก่อนออกบิล
- คำนวณค่าไฟอัตโนมัติจากเลขมิเตอร์ก่อน-หลัง (หน่วยละ 6 บาท)
- ค่าน้ำฟรี
- ออกบิลแสดงรายละเอียดครบ: ชื่อหอ, ที่อยู่, ห้อง, เดือนค่าเช่า, รายการในรูปแบบตาราง, วันครบกำหนดชำระ
- ผู้เช่าตรวจสอบสถานะบิลและดาวน์โหลด PNG ได้
- ผู้เช่าล็อกอินแยกตามเลขห้องผ่าน Supabase Auth และเห็นเฉพาะบิลของห้องตัวเอง
- ผู้เช่าดูประวัติบิลย้อนหลังของห้องตัวเองได้
- เจ้าของหอออกบิลทีละห้อง, เซฟ PNG ทีละห้อง หรือเซฟทั้งหมดได้
- เจ้าของหอดูประวัติบิลย้อนหลังรายห้อง และรายงานยอดรวมทั้งหอรายเดือนได้
- รองรับ UI ทั้งมือถือและเดสก์ท็อป

## โครงสร้างสำคัญ

- `src/pages/OwnerPage.tsx` หน้าเจ้าของหอ
- `src/pages/TenantPage.tsx` หน้าผู้เช่า
- `src/components/BillDocument.tsx` เทมเพลตบิล
- `src/utils/billing.ts` logic คำนวณบิล
- `src/lib/storage.ts` layer จัดการข้อมูล (Supabase + Local fallback)
- `supabase/schema.sql` SQL สำหรับสร้างตาราง

## การตั้งค่า

1. ติดตั้ง dependency

```bash
npm install
```

2. สร้างไฟล์ `.env` จาก `.env.example`

```bash
cp .env.example .env
```

3. ตั้งค่าใน `.env`

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_OWNER_PIN=2468
VITE_TENANT_SETUP_KEY=setup-tenant-2026
```

ถ้าไม่ใส่ค่า Supabase ระบบจะเก็บข้อมูลใน localStorage แทน (เหมาะกับโหมดทดลอง)

4. สร้างตารางใน Supabase โดยรัน SQL ในไฟล์ `supabase/schema.sql`

5. สำหรับสิทธิ์เจ้าของหอใน Supabase (เฉพาะถ้าต้องการให้บันทึกขึ้น DB ได้ภายใต้ RLS)

- สมัคร Auth user สำหรับ owner 1 บัญชี
- นำ `auth.users.id` ไป insert ใน `owner_profiles`

```sql
insert into public.owner_profiles (user_id)
values ('<owner-user-uuid>');
```

6. สำหรับผู้เช่าลงทะเบียนครั้งแรก

- ผู้เช่าเข้าโหมดผู้เช่า > ลงทะเบียนครั้งแรก
- กรอกเลขห้อง + รหัสผ่าน + `VITE_TENANT_SETUP_KEY`
- ระบบจะสร้าง Auth user และผูกกับ `tenant_profiles` อัตโนมัติ

## คำสั่งใช้งาน

```bash
npm run dev
npm run build
npm run preview
```

## Deploy GitHub Pages (ฟรี)

1. สร้าง GitHub repo แล้ว push โค้ด
2. รันคำสั่ง

```bash
npm run deploy
```

3. ใน GitHub: Settings > Pages > เลือก Source เป็น `gh-pages` branch

## หมายเหตุด้านความปลอดภัย

- ตอนนี้หน้าเจ้าของหอใช้ PIN ฝั่ง client เพื่อกันผู้เช่าทั่วไปไม่ให้เข้าถึง
- สำหรับ production แนะนำเพิ่ม Supabase Auth + Row Level Security ตาม role เพื่อบังคับสิทธิ์จริง
