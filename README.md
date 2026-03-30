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
VITE_OWNER_PIN=your_owner_pin
VITE_TENANT_SETUP_KEY=your_tenant_setup_key
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

## Deploy Cloudflare Pages (แนะนำ)

โปรเจกต์นี้ใช้ `HashRouter` จึง deploy บน Cloudflare Pages ได้ตรงๆ โดยไม่ต้องตั้ง rewrite rule เพิ่ม

### สิ่งที่ต้องเตรียม

1. GitHub repository ของโปรเจกต์
2. Supabase Project ที่สร้างแล้ว
3. Environment Variables สำหรับ Cloudflare Pages

### ขั้นตอนบน Cloudflare Pages

1. เข้า Cloudflare Dashboard
2. ไปที่ `Workers & Pages`
3. กด `Create` > `Pages` > `Connect to Git`
4. เลือก GitHub repository ของคุณ
5. ตั้งค่า build ดังนี้

```txt
Framework preset: Vite
Build command: npm run build
Build output directory: dist
Root directory: /
```

6. เพิ่ม Environment Variables ในหน้า Settings ของโปรเจกต์

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_publishable_or_anon_key
VITE_OWNER_PIN=your_owner_pin
VITE_TENANT_SETUP_KEY=your_tenant_setup_key
```

7. กด Deploy

### คุณต้องหาอะไรมาให้ครบ และหาจากไหน

1. `VITE_SUPABASE_URL`
หาได้จาก Supabase Dashboard > Project Settings > API > Project URL

2. `VITE_SUPABASE_ANON_KEY`
หาได้จาก Supabase Dashboard > Project Settings > API > Project API keys > `anon` หรือ publishable key ที่ใช้กับ browser

3. `VITE_OWNER_PIN`
คุณเป็นคนกำหนดเองได้เลย เช่น `owner-1234`

4. `VITE_TENANT_SETUP_KEY`
คุณเป็นคนกำหนดเองได้เลย ใช้สำหรับลงทะเบียนผู้เช่าครั้งแรก เช่น `tenant-setup-2026`

5. ถ้าจะให้ระบบ owner เขียนข้อมูลลง Supabase จริงภายใต้ RLS
ต้องมี owner user id จาก Supabase Auth
หาได้จาก Supabase Dashboard > Authentication > Users

### สิ่งที่ไม่ต้องหาเพิ่มสำหรับ frontend deploy

1. Database password
2. Direct connection string password
3. Service role key
4. Supabase access token

## Supabase Auth แบบละเอียด

ระบบนี้ใช้แนวทางดังนี้:

1. ผู้เช่า 1 ห้อง = 1 บัญชี Auth
2. email จะถูกสร้างจากเลขห้องอัตโนมัติ เช่น `A1 -> a1@tenant.somjai.local`
3. ตาราง `tenant_profiles` ใช้ผูก `user_id` กับ `room_id`
4. RLS อนุญาตให้ผู้เช่าอ่านบิลเฉพาะห้องตัวเอง

### ขั้นตอนตั้งค่า Supabase ให้ระบบ Auth ใช้งานได้จริง

1. เปิด Supabase Dashboard
2. ไปที่ `SQL Editor`
3. รัน SQL จากไฟล์ `supabase/schema.sql`

สิ่งที่จะถูกสร้าง:

1. `tenant_profiles`
2. `owner_profiles`
3. `bills`
4. RLS policies สำหรับ tenant และ owner

### ตั้งค่า Authentication

1. ไปที่ Supabase Dashboard > `Authentication` > `Providers` > `Email`
2. เปิด Email provider
3. สำหรับการทดสอบเร็ว แนะนำปิด `Confirm email`

ถ้าไม่ปิด confirm email, ฟังก์ชันลงทะเบียนผู้เช่าอาจยังไม่ได้ `user.id` กลับมาทันที ทำให้ผูกห้องไม่สำเร็จใน flow ปัจจุบัน

### วิธีสร้าง owner ให้ใช้งานจริง

1. ไปที่ Supabase Dashboard > `Authentication` > `Users`
2. สร้าง user สำหรับเจ้าของหอ 1 บัญชี
3. คัดลอก `User UID`
4. ไปที่ `SQL Editor` แล้วรัน:

```sql
insert into public.owner_profiles (user_id)
values ('YOUR_OWNER_USER_UID');
```

หลังจากนั้น user นี้จะมีสิทธิ์อ่าน/insert ตาราง `bills` ได้ตาม RLS ที่ตั้งไว้

### วิธีลงทะเบียนผู้เช่าครั้งแรก

1. ผู้เช่าเข้าหน้า `ผู้เช่า`
2. กด `ลงทะเบียนครั้งแรก`
3. เลือกเลขห้อง
4. ใส่รหัสผ่าน
5. ใส่ `VITE_TENANT_SETUP_KEY`
6. ระบบจะ:
	- สร้างบัญชี Supabase Auth
	- สร้าง email จากเลขห้องอัตโนมัติ
	- เขียนข้อมูลลง `tenant_profiles`
	- ผูก user กับห้อง

### วิธีตรวจว่า RLS ทำงานถูก

1. ลงทะเบียนผู้เช่าห้อง A1
2. login ด้วยห้อง A1
3. ตรวจว่ามองเห็นเฉพาะบิลของ A1
4. login ห้องอื่น ต้องไม่เห็นบิลของ A1

### ถ้าระบบ Auth ใช้ไม่ได้ ให้เช็กตามนี้

1. รัน `supabase/schema.sql` แล้วหรือยัง
2. เปิด Email provider แล้วหรือยัง
3. ปิด Confirm email แล้วหรือยัง (สำหรับทดสอบ)
4. ใส่ `VITE_SUPABASE_URL` และ `VITE_SUPABASE_ANON_KEY` ใน Cloudflare Pages ครบหรือยัง
5. tenant user ถูกสร้างแล้วแต่ไม่มีข้อมูลใน `tenant_profiles` หรือไม่

## หมายเหตุด้านความปลอดภัย

- ตอนนี้หน้าเจ้าของหอใช้ PIN ฝั่ง client เพื่อกันผู้เช่าทั่วไปไม่ให้เข้าถึง
- สำหรับ production แนะนำเพิ่ม Supabase Auth + Row Level Security ตาม role เพื่อบังคับสิทธิ์จริง
- ห้าม commit ค่าใน `.env` หรือ `.env.local` ขึ้น repo สาธารณะ
- ถ้าเผลอเผยแพร่ key/PIN/setup key ให้ rotate หรือเปลี่ยนค่าใหม่ทันที
