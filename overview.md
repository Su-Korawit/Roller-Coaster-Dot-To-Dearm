# 🎢 Roller Coaster — สรุปภาพรวมโปรเจกต์

## แอปนี้คืออะไร?
**Roller Coaster** คือเว็บแอป Mobile-first สำหรับนักเรียนไทย ช่วยค้นหาตัวเอง วางแผนอนาคต ตั้งแต่เลือก MBTI → อาชีพ → ทักษะ → มหาวิทยาลัย → สาขา แล้วมี Task/Skill system ให้ลงมือทำจริง ได้เหรียญ มี Streak และ Skill พิเศษช่วยสร้างนิสัย

**Tech Stack:** (อะไรก็ตามที่ทำให้ Project นี้เสร็จเร็วที่สุดใน 3 ชั่วโมง)

---

## สรุปแต่ละหน้า
Note ใน path "Roller Coaster" -> "Roller Coaster Dot To Dearm"
---

### Page 1: Register (`/`)
D:\Ikkyusan\Desktop\Roller Coaster\assets\01_Register_Referent.png
| | |
|---|---|
| **หน้าที่** | หน้า Landing / Login ด้วย Google หรือ Microsoft OAuth |
| **เพื่ออะไร** | เป็นจุดเริ่มต้นของ User — ล็อกอินเข้าระบบแล้ว redirect ไป `/home` |
| **Assets** | Background, Navbar, Content (โลโก้+tagline), Footer |
| **พฤติกรรม** | ถ้าล็อกอินแล้ว → ข้ามไป `/home` ทันที · กด Footer → ไป `/why` |

---

### Page 2: Why (`/why`)
D:\Ikkyusan\Desktop\Roller Coaster\assets\02_Review_Referent.png
| | |
|---|---|
| **หน้าที่** | หน้า "We Start With Why?" — อธิบายว่าทำไมต้องใช้แอปนี้ |
| **เพื่ออะไร** | สร้างแรงจูงใจให้ User เข้าใจคุณค่าก่อนเริ่มใช้งาน |
| **Assets** | Background, Navbar, Content (infographic สถิติ), Footer |
| **พฤติกรรม** | Scroll ดูเนื้อหา → กด Footer "Ready to use?" → กลับไป `/` |

---

### Page 3: Select MBTI (`/select/mbti`)
D:\Ikkyusan\Desktop\Roller Coaster\assets\03_Setup_MBTI.png
| | |
|---|---|
| **หน้าที่** | เลือก MBTI จาก Carousel 16 ตัวละคร (Pixel Art) |
| **เพื่ออะไร** | รู้จักบุคลิกภาพตัวเอง — เป็นตัวแปรหลักในการ Recommend อาชีพ/ทักษะ/สาขา |
| **Data** | 16 MBTI types แต่ละตัวมี ชื่อตัวละคร + คำอธิบายนิสัย |
| **พฤติกรรม** | Previous/Next สลับ MBTI → กด Select → บันทึก + ไป `/select/career` |

---

### Page 4.1: Select Career (`/select/career`)
D:\Ikkyusan\Desktop\Roller Coaster\assets\03_Setup_Carrer_Refferent.png
| | |
|---|---|
| **หน้าที่** | Wizard Step 1/4 — เลือกอาชีพ (Recommend ตาม MBTI) |
| **เพื่ออะไร** | ให้ User เห็นอาชีพที่เหมาะกับบุคลิกตัวเอง แบ่งตาม Hard/Soft Skills |
| **Data** | ~48 อาชีพ แต่ละอันมี `mbtiMatch[]` สำหรับกรอง |
| **พฤติกรรม** | Scroll/Search → กดเลือก Card → บันทึก + ไป `/select/mastery` |

---

### Page 4.2: Select Mastery (`/select/mastery`)
D:\Ikkyusan\Desktop\Roller Coaster\assets\03_Setup_Mastery_Refferent.png
| | |
|---|---|
| **หน้าที่** | Wizard Step 2/4 — เลือก Hard Skill (Recommend ตาม MBTI + Career) |
| **เพื่ออะไร** | ให้ User เลือกทักษะหลักที่ต้องพัฒนา เพื่อนำไป Generate Roadmap |
| **Data** | ~40+ ทักษะ แต่ละอันมี `careerMatch[]` + `mbtiMatch[]` |
| **พฤติกรรม** | Scroll/Search → กดเลือก Card → บันทึก + ไป `/select/university` |

---

### Page 4.3: Select University (`/select/university`)
D:\Ikkyusan\Desktop\Roller Coaster\assets\03_Setup_University_Refferent.png
| | |
|---|---|
| **หน้าที่** | Wizard Step 3/4 — เลือกมหาวิทยาลัยจาก 80 สถาบัน TCAS |
| **เพื่ออะไร** | เชื่อมโยงเป้าหมายอาชีพกับสถาบันการศึกษาจริง |
| **Data** | 80 มหาวิทยาลัย + logo + จังหวัด + เว็บไซต์ |
| **พฤติกรรม** | Grid 4 คอลัมน์ → กด Logo → Popup ดูรายละเอียด → "เลือก" → ไป `/select/program` |

---

### Page 4.4: Select Program (`/select/program`)
D:\Ikkyusan\Desktop\Roller Coaster\assets\03_Setup_Program__Refferent.png
| | |
|---|---|
| **หน้าที่** | Wizard Step 4/4 (สุดท้าย) — เลือกคณะ/สาขา (Recommend ตาม University + Career + MBTI) |
| **เพื่ออะไร** | ปิดท้าย Wizard ด้วยเป้าหมายที่ชัดเจน → บันทึกข้อมูลทั้งหมดแล้วไป `/home` |
| **Data** | สาขาจากหลายมหาวิทยาลัย + รอบ TCAS (1-4) + จำนวนที่นั่ง |
| **พฤติกรรม** | Scroll/Search → กดเลือก Program → บันทึก Selection ทั้งชุด → ไป `/home` |

---

### Prompt 9 — Home Dashboard (`/home`)
D:\Ikkyusan\Desktop\Roller Coaster\assets\04_Main_Home_Referent.png
| | |
|---|---|
| **หน้าที่** | หน้าหลักหลังล็อกอิน — แสดง Avatar, Streak, Coins, Task Bubble, News Badge |
| **เพื่ออะไร** | ศูนย์กลางของแอป — เข้าถึง Task/Skill/News/Profile ผ่าน Bottom Navbar |
| **Features** | AI-generated Background (Gemini) · Pixel Character ตาม MBTI · Task Bubble · Bottom Navbar ที่เปิด Popup |
| **Assets** | `04_Main_Home_Control.png` (bottom nav), Character จาก MBTI |

---

### Prompt 10 — Task Popup
D:\Ikkyusan\Desktop\Roller Coaster\assets\04_Main_Task.png
D:\Ikkyusan\Desktop\Roller Coaster\assets\04_Main_Task_Create.png
D:\Ikkyusan\Desktop\Roller Coaster\assets\04_Main_Task_Edit.png
| | |
|---|---|
| **หน้าที่** | ระบบจัดการ Task แบบครบวงจร (List / Create / Edit) |
| **เพื่ออะไร** | ให้ User ตั้งเป้าหมายรายวัน ทำ Task → ได้ Coins → สร้าง Streak |
| **Features** | Drag & Drop เรียงลำดับ · Sub-tasks · Deadline · สีแต่ละ Task · Coins Logic (10/15/20 ตามเงื่อนไข) |
| **Coins Logic** | ทำเสร็จปกติ +10 · เสร็จก่อน Deadline +15 · เสร็จภายใน est. time +20 · Streak 7 วัน +50 bonus |

---

### Prompt 11 — Skill Popup
D:\Ikkyusan\Desktop\Roller Coaster\assets\04_Main_Skill_Passive.png
D:\Ikkyusan\Desktop\Roller Coaster\assets\04_Main_Skill_Passive.png
D:\Ikkyusan\Desktop\Roller Coaster\assets\04_Main_Task_Edit.png
| | |
|---|---|
| **หน้าที่** | ร้านค้า Skill — ซื้อ/สวมใส่ Passive & Active Skills |
| **เพื่ออะไร** | เพิ่มกลไก Gamification ให้การทำ Task สนุกขึ้นและสร้างนิสัยที่ดี |
| **Passive Skills** | **Spark** (ได้ Coins Animation ทันที +2) · **Flow** (Combo Multiplier x1.1-1.3) · **Depth** (Task >1hr = ×1.5) · **Grace** (พลาด Streak ไม่โดน Penalty) |
| **Active Skills** | **Ignite** (นับถอยหลัง 5 วิ เริ่ม Task ทันที) · **Capsule** (ล็อก 30 นาที +50% Coins) · **Draw** (สุ่ม Task) · **Revive** (กู้ Streak) |
| **Features** | 3 Passive Slots (unlock ตาม Streak 0/7/14) · Drag & Drop เข้า Slot · Skill Info Modal |

---

### Prompt 12 — News Popup
D:\Ikkyusan\Desktop\Roller Coaster\assets\04_Main_News_Refferent.png
| | |
|---|---|
| **หน้าที่** | News Feed แสดงข่าวจาก CAMPHUB (และ source อื่นในอนาคต) |
| **เพื่ออะไร** | ให้ User รับรู้โอกาส (Hackathon, Camp, กิจกรรม) ที่เกี่ยวข้อง |
| **Features** | โปสเตอร์ Fullwidth กดไปเปิดลิงก์ · Unread Badge (จุดแดง) · Mark as Read อัตโนมัติเมื่อกด |

---

### Prompt 13 — Profile Popup
D:\Ikkyusan\Desktop\Roller Coaster\assets\04_Main_Profile.png
D:\Ikkyusan\Desktop\Roller Coaster\assets\04_Main_Add_Journey.png
| | |
|---|---|
| **หน้าที่** | โปรไฟล์ส่วนตัว + Portfolio + Journey of Mastery |
| **เพื่ออะไร** | สรุปเส้นทางของ User — ดูที่เลือกทั้งหมด + AI สร้าง Roadmap ให้เรียนรู้ทีละ Step |
| **Features** | Avatar + Username · Portfolio Circles (Mastery/Career/University) · Journey Grid (Drag & Drop) · Add Journey (Manual) · AI Generate Roadmap (Gemini) · Settings (เปลี่ยนชื่อ/Logout) · Share ลิงก์ |

---

### Skill System
| | |
|---|---|
| **หน้าที่** | ทำให้ Skill 4 ตัวหลักใช้งานได้จริง (ไม่ใช่แค่ UI) |
| **เพื่ออะไร** | สร้าง Dopamine Loop — ทำ Task → เห็น Animation → ได้ Bonus → อยากทำอีก |
| **Ignite** | กดแล้วนับถอยหลัง 5-4-3-2-1 ทับหน้าจอ → Force Start Task ทันที |
| **Capsule** | กดแล้ว Timer 30 นาทีขึ้นบน Task Card → เสร็จทัน = Coins +50% |
| **Spark** | ทุกครั้งที่ Complete Task → Animation เหรียญกระจาย + Coins +2 (Passive) |
| **Flow** | ทำ Task ต่อกันภายใน 10 นาที → Multiplier ×1.1 ×1.2 ×1.3... stack ขึ้นเรื่อยๆ (Passive) |

---

## Flow ภาพรวม

```
Register (/) → Why (/why) → Login
     ↓
Select MBTI → Career → Mastery → University → Program
     ↓
Home Dashboard (/home)
  ├── Task Popup    → สร้าง/ทำ Task ได้ Coins
  ├── Skill Popup   → ซื้อ/ใส่ Skill เพิ่มพลัง
  ├── News Popup    → ดูข่าว/โอกาส
  └── Profile Popup → ดู Portfolio + AI Roadmap + Share
```

## State Management

| Store | หน้าที่ |
|-------|--------|
| `useUserStore` | Profile, Coins, Streak, Avatar |
| `useSelectStore` | MBTI, Career, Mastery, University, Program ที่เลือก |
| `useTaskStore` | Task CRUD, Complete Logic, Skill-aware Coins |
| `useSkillStore` | Owned/Equipped Skills, Passive Slots, Active Equips |
| `useNewsStore` | News Feed, Read/Unread Tracking |
| `useProfileStore` | Portfolio, Journey, AI Roadmap, Settings |
