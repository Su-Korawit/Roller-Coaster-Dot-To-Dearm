# OWNER TODO — งาน console ที่เหลือ (ทำได้คนเดียว, code ฝั่งนี้เสร็จหมดแล้ว)

_อัปเดตล่าสุด: 2026-07-10 · อ้างอิง ADR-0012 + แผน `2026-07-09-ilovetcas-subdomains-restructure.md`_

## สถานะตอนนี้

- ✅ Code ทุก Phase (1–4) อยู่บน `main` และ deploy บน Vercel แล้ว
- ✅ Firestore rules deploy แล้ว (ตรวจ anon read `tcasEvents` = 200)
- ✅ `www.ilovetcas.com` เสิร์ฟ hub prerender + redirect ลิงก์เก่าทำงาน
- ❌ subdomain ทั้งหมด (`app./roadmap./tcas./news./school.`) **ยัง resolve ไม่ได้** — DNS ฝั่ง GoDaddy ยังไม่ตั้ง

## 1) GoDaddy DNS — ด่วนสุด ⚠️

ตอนนี้ redirect `/home` ชี้ไป `app.ilovetcas.com` ที่ยังเข้าไม่ได้ → ลิงก์เก่าบนโดเมนใหม่พังจนกว่าจะเสร็จข้อนี้

**ทาง A (แนะนำ):** GoDaddy → Domains → `ilovetcas.com` → DNS → Nameservers → Change →
"I'll use my own nameservers" → ใส่ `ns1.vercel-dns.com` + `ns2.vercel-dns.com`
(Vercel มี wildcard `*.ilovetcas.com` รออยู่แล้ว — เสร็จข้อเดียวจบทุก subdomain)

**ทาง B (ถ้าไม่อยากย้าย NS):** Manage DNS → เพิ่ม CNAME 5 รายการ
(`app`, `roadmap`, `tcas`, `news`, `school` → `cname.vercel-dns.com`)
และต้อง Add แต่ละ subdomain ใน Vercel → Settings → Domains ด้วย

## 2) Vercel — สลับทิศ redirect apex/www

ตอนนี้ `ilovetcas.com` → 308 → `www` (กลับทิศกับ canonical ที่ฝังใน HTML)
Vercel → Project `rollercoaster` → Settings → Domains:
- `ilovetcas.com` = primary (ไม่ redirect)
- `www.ilovetcas.com` = Redirect to `ilovetcas.com`

(เว็บใช้งานได้อยู่แล้วเพราะมี hotfix รองรับ www — ข้อนี้เพื่อ SEO ระยะยาว)

## 3) Firebase — Authorized domains ทั้ง 7

Firebase Console → Authentication → Settings → Authorized domains → Add:

```
ilovetcas.com          www.ilovetcas.com      app.ilovetcas.com
roadmap.ilovetcas.com  tcas.ilovetcas.com     news.ilovetcas.com
school.ilovetcas.com
```

ขาดตัวไหน = ปุ่ม Google login บน host นั้นพังเงียบ ๆ

## 4) Google Search Console (หลังข้อ 1–2 เสร็จ)

search.google.com/search-console → Add property แบบ **Domain** (`ilovetcas.com`)
→ verify ด้วย DNS TXT (ง่ายมากถ้าใช้ทาง A) → Sitemaps → submit:
`https://ilovetcas.com/sitemap.xml` + ของ `roadmap./tcas./news./school.`

## 5) เมื่อทุกข้อเสร็จ → บอก Claude Code

- สั่งรันชุดตรวจรับซ้ำครบทุก host (มีสคริปต์อยู่แล้ว)
- Phase 5 (programmatic SEO ต่อมหาลัย/คณะ) ปลดล็อกเมื่อ Search Console
  เริ่มเห็น impression ของหน้า hub/landing
