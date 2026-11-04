# OWNER TODO — งาน console ที่เหลือ (ทำได้คนเดียว, code ฝั่งนี้เสร็จหมดแล้ว)

_อัปเดตล่าสุด: 2026-07-11 · อ้างอิง ADR-0012 + แผน `2026-07-09-ilovetcas-subdomains-restructure.md` + แผนกู้ระบบ `2026-07-11-domain-dns-storage-quota-recovery.md`_

## สถานะตอนนี้

- ✅ Code ทุก Phase (1–4) อยู่บน `main` และ deploy บน Vercel แล้ว
- ✅ Firestore rules deploy แล้ว (ตรวจ anon read `tcasEvents` = 200)
- ✅ Owner เปลี่ยน nameservers ที่ GoDaddy เป็น `ns1/ns2.vercel-dns.com` แล้ว (ข้อ 1 ทาง A เดิม)
- ❌ **โดเมนตายทั้ง zone** (2026-07-11) — NS ชี้มา Vercel แล้วแต่ Vercel ยังไม่ provision DNS zone
  (nameserver ตอบ "Query refused" → ทุก host รวม `www.` SERVFAIL) — ดูขั้นกู้ใน
  `docs/superpowers/plans/2026-07-11-domain-dns-storage-quota-recovery.md` Task A1
- ❌ **Firebase Storage โควต้าเต็ม** — ทุก download ตอบ 402 → เกมโหลด asset ไม่ได้ (Task A2: อัปเกรด Blaze)

## 1) กู้ DNS zone บน Vercel — ด่วนสุด ⚠️ (แทนข้อ GoDaddy เดิมที่ทำไปแล้ว)

การชี้ NS มา Vercel เสร็จแล้ว แต่ zone ฝั่ง Vercel ว่าง/ไม่ active — ทำตาม **Task A1** ในแผนกู้ระบบ:
1. ให้ Claude Code รัน `vercel dns add` สร้าง record แรก (บังคับ provision zone) แล้วตรวจด้วย
   `nslookup ilovetcas.com ns1.vercel-dns.com` (ต้องไม่ "Query refused")
2. ถ้าไม่หาย: Vercel dashboard → team → **Domains** → `ilovetcas.com` → กด Verify / Enable Vercel DNS
   (ถ้ายังไม่หายอีก: ลบโดเมนออกจาก team แล้ว add ใหม่ + ผูก `ilovetcas.com`, `www`, `*.ilovetcas.com` กลับเข้า project)
3. ทางหนีไฟ: ย้าย NS กลับ GoDaddy default + ตั้ง `A @ → 76.76.21.21` และ CNAME `www/app/roadmap/tcas/news/school → cname.vercel-dns.com`
   (ข้อเสีย: เสีย wildcard — ต้อง add subdomain รายตัวใน Vercel)

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

## Study room (2026-10-22)

ขั้นตอน deploy / seed catalog / purge ข้อมูลฟาร์มเก่า อยู่ใน `docs/study-room-ops.md` (ลำดับ: rules → functions → seed → hosting; รัน `purgeLegacyWorld.mjs` หลังปล่อยจริงและนิ่งแล้วเท่านั้น)

## Hotbar / Warp / Resume / Guide (2026-10-22)

Deploy: `firebase deploy --only firestore:rules` แล้ว
`firebase deploy --only functions:startFocus,functions:checkInFocus,functions:endFocus,functions:abandonFocus`
แล้วค่อย merge (Vercel) — ไม่ต้อง seed อะไรเพิ่ม รายละเอียดอยู่ใน `docs/study-room-ops.md` ข้อ 6

ตรวจด้วยตาที่ 375 และ 1280 px (ยังไม่ได้เปิดดูในเบราว์เซอร์): แถบ hotbar 8 ปุ่มไม่ล้นจอและไม่ทับ MiniPlayer/ปุ่มติดต่อผู้พัฒนา,
กด `1`–`7` / `B` / `Esc`, กระเป๋าใส่ของลงช่อง, วาร์ปห้อง→โรงเรียน (ทั้งบัญชีที่มีและไม่มีโรงเรียน), รีโหลดแล้วกลับมายืนที่เดิม,
คู่มือครบ 4 ขั้นและกดข้ามได้, ลองโฟกัส 1 นาทีได้ของขวัญ 10 ใบไม้ครั้งเดียว

ต้องตัดสินใจ: ปุ่มจดหมาย (ช่อง 5) เปิดแชท และเพื่อนอยู่ในกระเป๋า — ถ้าอยากได้ชีตเดียวแบบแท็บ ต้องออกแบบหัวพาเนลใหม่
