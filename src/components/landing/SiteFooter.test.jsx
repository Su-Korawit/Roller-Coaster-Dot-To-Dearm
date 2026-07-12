// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import SiteFooter from './SiteFooter'

describe('SiteFooter', () => {
  it('renders tool links, app link, and contact', () => {
    render(<SiteFooter />)

    const roadmap = screen.getByRole('link', { name: 'วางแผนเส้นทาง' })
    expect(roadmap.getAttribute('href')).toMatch(/roadmap|site=roadmap/)

    const tcas = screen.getByRole('link', { name: 'ค้นหาคณะ' })
    expect(tcas.getAttribute('href')).toMatch(/tcas|site=tcas/)

    expect(screen.getAllByRole('link', { name: 'ข่าว + ปฏิทิน' }).length).toBeGreaterThanOrEqual(1)

    const school = screen.getByRole('link', { name: 'ตารางเรียน + การบ้าน' })
    expect(school.getAttribute('href')).toMatch(/school|site=school/)

    const app = screen.getByRole('link', { name: 'เข้าแอป' })
    expect(app.getAttribute('href')).toMatch(/app|site=app/)

    expect(screen.getAllByRole('link', { name: 'o.korawitt@gmail.com' }).length).toBeGreaterThan(0)
  })
})
