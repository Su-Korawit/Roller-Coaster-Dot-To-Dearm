// Profile avatars (ChatGPT work order 006). One sheet cut into 9 circles under
// public/assets/os/avatars/<id>.webp. Choice is stored per user on this device.
export const AVATAR_GROUPS = [
  { id: 'f', label: 'หญิง' },
  { id: 'm', label: 'ชาย' },
  { id: 'q', label: 'LGBTQ+' },
]

export const AVATARS = [
  { id: 'f1', group: 'f', name: 'ผมยาวมัดครึ่ง' },
  { id: 'f2', group: 'f', name: 'ผมบ็อบ กิ๊บชมพู' },
  { id: 'f3', group: 'f', name: 'ผมลอน ผ้าโพกสีครีม' },
  { id: 'm1', group: 'm', name: 'ผมสั้น เสื้อกั๊กม่วง' },
  { id: 'm2', group: 'm', name: 'ผมหยิก เสื้อฮู้ดเหลือง' },
  { id: 'm3', group: 'm', name: 'แว่นกลม เสื้อเชิ้ตฟ้า' },
  { id: 'q1', group: 'q', name: 'เข็มกลัดสีรุ้ง' },
  { id: 'q2', group: 'q', name: 'ผ้าพันคอชมพู-ฟ้า-ขาว' },
  { id: 'q3', group: 'q', name: 'ผ้าคาดผมชมพู-ม่วง-ฟ้า' },
]

export function findAvatar(id) {
  return AVATARS.find((a) => a.id === id) ?? null
}

export function avatarSrc(id) {
  return `/assets/os/avatars/${id}.webp`
}
