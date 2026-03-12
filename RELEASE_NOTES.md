# Release notes

ใช้ข้อความด้านล่างเวลาไปที่ GitHub → Releases → Draft a new release เลือก tag แล้ววางในช่อง description

---

## v1.0.0

โปรเจกต์เริ่มต้น: API ด้วย Bun รองรับ HTTP Message Signature (Ed25519), ข้อความเข้ารหัส และ CRUD หนังสือ ใช้ SQLite

**คุณสมบัติ**
- ลายเซ็น request แบบ RFC 9421 (method, path, host, body hash)
- ลงทะเบียน client ด้วย public key (base64url DER)
- ส่ง/ดึงข้อความที่เข้ารหัส (stream cipher + nonce)
- CRUD หนังสือ (สร้าง อ่าน แก้ไข ลบ)
- เทสต์ครบ (crypto, signature, server) ด้วย `bun run test`

**วิธีใช้**
```bash
bun install
bun run build && bun start
# หรือพัฒนา: bun run dev
```
