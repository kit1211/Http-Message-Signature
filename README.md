```
+--------------------------------+
|   HTTP MESSAGE SIGNATURE       |
+--------------------------------+
```

API เล็กๆ ด้วย Bun: ลายเซ็น request (Ed25519), ข้อความเข้ารหัส, CRUD หนังสือ. ใช้ SQLite.

---

## Use case: งานที่เหมาะกับการใช้ HTTP Message Signature

- **API authentication** — ยืนยันตัวตนผู้เรียก API โดยไม่ต้องส่ง secret บนสาย (ใช้คู่กุญแจแทน) ลดความเสี่ยง secret รั่ว
- **Webhook / callback verification** — เซิร์ฟเวอร์ที่รับ webhook ตรวจสอบว่า request มาจากผู้ส่งที่ถูกต้องและเนื้อหาไม่ถูกแก้
- **Service-to-service (backend-to-backend)** — บริการภายในลงลายเซ็น request ให้กัน กัน request ปลอมหรือ redirect
- **Audit / non-repudiation** — มีหลักฐาน cryptographic ว่า request มาจากผู้ถือ private key นั้น ไม่สามารถปฏิเสธภายหลังได้
- **ป้องกัน replay และ tampering** — ลายเซ็นผูกกับ method, path, host และ body hash จึงแก้ไขหรือนำ request เดิมไปใช้ซ้ำไม่ได้ (ถ้าเพิ่ม nonce/timestamp ในโปรโตคอล)

โปรเจกต์นี้เป็นตัวอย่างการลงลายเซ็นแบบ RFC 9421 (method, path, host, body hash) ด้วย Ed25519 และการเข้ารหัส payload แยกต่างหาก

---

## การป้องกัน reverse engineering / การโดนแกะ API

เมื่อแอปหรือ client เรียก API คนที่ reverse engineer (แกะโค้ด, ดัก request) อาจเห็น endpoint, header และ body — ถ้าใช้แค่ API key ใน header หรือ query ลูกค้าสามารถ copy ไปใช้ซ้ำหรือขโมย key ได้ง่าย

**สิ่งที่ HTTP Message Signature ช่วยได้**

- **ไม่ส่ง secret ร่วมกันบนสาย** — ใช้คู่กุญแจ (public/private) แทน API key เดี่ยว; server เก็บแค่ public key ใช้ตรวจลายเซ็น ไม่มี “รหัสลับร่วม” ที่ดัก packet แล้วเอาไปใช้ได้ทันที
- **ผูก request กับ method, path, host, body** — แกะแล้ว copy request ไปใช้ที่อื่นหรือแก้ path/body แล้วส่งต่อไม่ได้ เพราะลายเซ็นไม่ตรง
- **ลดค่าที่ “แกะแล้วใช้ได้เลย”** — แม้เห็น URL และ body การจะสร้าง request ใหม่ที่ผ่านการตรวจต้องมี private key ที่ใช้ลงลายเซ็น (ซึ่งไม่ควรอยู่ใน client ที่ผู้ใช้ควบคุมถ้าอยากให้ปลอดภัยสูง)

**ข้อจำกัดที่ต้องรู้**

- ถ้า **private key อยู่ในแอป (mobile, desktop, SPA)** ผู้ที่ reverse แล้วได้ key ยังสร้าง request ปลอมได้ — ลายเซ็นช่วยเรื่องไม่ให้ secret รั่วบนสายและไม่ให้แก้ request โดยไม่รู้ key แต่ไม่ป้องกันการ “เอา key ออกจาก binary”
---

## ติดตั้ง

```bash
bun install
```

## รันเซิร์ฟเวอร์

```bash
bun run build
bun start
```

โหมดพัฒนา (watch):

```bash
bun run dev
```

## รัน demo

ต้องเปิดเซิร์ฟเวอร์ก่อน จากนั้นรัน:

```bash
bun run demo
```

## เทสต์

```bash
bun run test
```
