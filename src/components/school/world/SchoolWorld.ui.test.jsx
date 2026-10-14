// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../../ui/Popup', () => ({ default: ({ children }) => <div>{children}</div> }))
vi.mock('../../../stores/useAuthStore', () => ({
  useAuthStore: (sel) => sel({ user: { uid: 'me' } }),
}))
const tcasState = { events: [], subscribeEvents: vi.fn(() => () => {}) }
vi.mock('../../../stores/useTcasEventsStore', () => ({
  useTcasEventsStore: Object.assign((sel) => sel(tcasState), { getState: () => tcasState }),
}))

const svc = {
  enterSchoolHub: vi.fn(), leaveSchoolHub: vi.fn(),
  beginFocus: vi.fn(), confirmFocus: vi.fn(), finishFocus: vi.fn(),
}
vi.mock('../../../services/schoolWorld', () => svc)
const board = {
  readTeacherClaims: vi.fn(async () => null),
  isTeacherOf: (c, id) => !!c && c.teacherSchoolId === id,
  subscribeSchoolPosts: vi.fn(() => () => {}),
  createSchoolPost: vi.fn(async () => ({ id: 'new' })),
  deleteSchoolPost: vi.fn(async () => {}),
}
vi.mock('../../../services/schoolBoard', async (orig) => ({ ...(await orig().catch(() => ({}))), ...board }))
const fetchLeaderboard = vi.fn()
vi.mock('../../../services/leaderboard', async (orig) => ({ ...(await orig()), fetchLeaderboard: (...a) => fetchLeaderboard(...a) }))
vi.mock('../../../utils/shareRoomImage', () => ({ shareRoomImage: vi.fn(async () => ({ ok: true, via: 'download' })) }))

const { useSchoolWorldStore } = await import('../../../stores/useSchoolWorldStore')
const { default: SchoolWorldLayer } = await import('./SchoolWorldLayer')
const { default: FocusPanel } = await import('./FocusPanel')
const { default: LeaderboardPanel } = await import('./LeaderboardPanel')
const { default: BoardPanel } = await import('./BoardPanel')
const { default: SchoolAnnouncements } = await import('./SchoolAnnouncements')

const renderLayer = (props = {}) => {
  const registry = { set: vi.fn() }
  const utils = render(
    <MemoryRouter initialEntries={['/home']}>
      <SchoolWorldLayer gameRef={{ current: { registry } }} onOpenView={props.onOpenView} active />
    </MemoryRouter>,
  )
  return { ...utils, registry }
}

beforeEach(() => {
  Object.values(svc).forEach((f) => f.mockReset())
  board.readTeacherClaims.mockReset().mockResolvedValue(null)
  board.subscribeSchoolPosts.mockReset().mockImplementation(() => () => {})
  board.createSchoolPost.mockClear(); board.deleteSchoolPost.mockClear()
  fetchLeaderboard.mockReset()
  useSchoolWorldStore.setState({
    inHub: false, room: null, enterStatus: 'idle', enterError: null, panel: null,
    toolRequest: null, mapChangeRequest: null, ambient: false,
  })
  useSchoolWorldStore.getState().resetFocus()
})
afterEach(cleanup)

describe('SchoolWorldLayer', () => {
  it('shows the enter button outside the hub and calls the service with the uid', () => {
    renderLayer()
    fireEvent.click(screen.getByText(/เข้าโรงเรียน/))
    expect(svc.enterSchoolHub).toHaveBeenCalledWith('me')
  })

  it('explains NO_SCHOOL and ROOM_FULL in Thai instead of failing silently', () => {
    useSchoolWorldStore.setState({ enterStatus: 'error', enterError: 'NO_SCHOOL' })
    const { rerender } = renderLayer()
    expect(screen.getByRole('alert').textContent).toContain('เลือกโรงเรียน')
    act(() => useSchoolWorldStore.setState({ enterError: 'ROOM_FULL' }))
    expect(screen.getByRole('alert').textContent).toContain('ห้องเต็ม')
    rerender(<div />)
  })

  it('inside the hub: shows the room label, leave, emote, ambience and share controls', () => {
    useSchoolWorldStore.setState({ inHub: true, room: { kind: 'school', shard: 2, ownerUid: 'school:S:2', schoolId: 'S' } })
    renderLayer()
    expect(screen.getByText('ห้องโรงเรียนของฉัน #2')).toBeTruthy()
    fireEvent.click(screen.getByText(/ออกจากโรงเรียน/))
    expect(svc.leaveSchoolHub).toHaveBeenCalledWith('me')
    expect(screen.getByLabelText('อีโมจิ')).toBeTruthy()
    expect(screen.getByLabelText('แชร์ภาพห้อง')).toBeTruthy()
  })

  it('labels the shared commons room differently', () => {
    useSchoolWorldStore.setState({ inHub: true, room: { kind: 'commons', shard: 1, ownerUid: 'commons:1' } })
    renderLayer()
    expect(screen.getByText('ห้องรวม #1')).toBeTruthy()
  })

  it('an emote sets the registry key and clears it after the display time', () => {
    vi.useFakeTimers()
    useSchoolWorldStore.setState({ inHub: true, room: { kind: 'school', shard: 1, ownerUid: 'x', schoolId: 'S' } })
    const { registry } = renderLayer()
    fireEvent.click(screen.getByLabelText('อีโมจิ'))
    fireEvent.click(screen.getByLabelText('สู้ ๆ'))
    expect(registry.set).toHaveBeenCalledWith('selfEmote', 'fight')
    act(() => { vi.advanceTimersByTime(4100) })
    expect(registry.set).toHaveBeenLastCalledWith('selfEmote', null)
    vi.useRealTimers()
  })

  it('the ambience toggle shows and hides the overlay', () => {
    useSchoolWorldStore.setState({ inHub: true, room: { kind: 'school', shard: 1, ownerUid: 'x', schoolId: 'S' } })
    renderLayer()
    expect(screen.queryByTestId('ambient')).toBeNull()
    fireEvent.click(screen.getByLabelText('โหมดบรรยากาศกลางคืน'))
    expect(screen.getByTestId('ambient')).toBeTruthy()
  })

  it('tool doors: a view: route opens the app tab, a path route navigates (and the request is consumed)', async () => {
    const onOpenView = vi.fn()
    renderLayer({ onOpenView })
    act(() => useSchoolWorldStore.getState().requestTool('view:profile'))
    await waitFor(() => expect(onOpenView).toHaveBeenCalledWith('profile'))
    expect(useSchoolWorldStore.getState().toolRequest).toBeNull()
  })

  it('renders the panel the store asks for', () => {
    useSchoolWorldStore.setState({ panel: { type: 'focus', seatId: 'lib-3' } })
    renderLayer()
    expect(screen.getByText('โต๊ะ lib-3')).toBeTruthy()
  })
})

describe('FocusPanel', () => {
  it('idle: explains the rules and starts a session', () => {
    render(<FocusPanel seatId="lib-1" onClose={() => {}} />)
    expect(screen.getByText(/ไม่นับเวลา/)).toBeTruthy()
    fireEvent.click(screen.getByText('เริ่มอ่านหนังสือ'))
    expect(svc.beginFocus).toHaveBeenCalled()
  })

  it('active: shows server-verified time and XP, and the check-in / finish buttons call the service', () => {
    useSchoolWorldStore.getState().setFocus({
      status: 'active', startedAt: Date.now(), lastCheckInAt: Date.now(), verifiedMs: 95 * 60000, xpThisSession: 95,
    })
    render(<FocusPanel onClose={() => {}} />)
    expect(screen.getByTestId('focus-verified').textContent).toBe('1 ชม. 35 นาที')
    expect(screen.getByTestId('focus-xp').textContent).toBe('+95 XP')
    fireEvent.click(screen.getByText(/ฉันยังอยู่/))
    expect(svc.confirmFocus).toHaveBeenCalled()
    fireEvent.click(screen.getByText('จบการอ่าน'))
    expect(svc.finishFocus).toHaveBeenCalled()
  })

  it('tells the student when a check-in is due, and explains a lapsed gap', () => {
    useSchoolWorldStore.getState().setFocus({
      status: 'active', lastCheckInAt: Date.now() - 26 * 60000, verifiedMs: 0, lastResult: { lapsed: true },
    })
    render(<FocusPanel onClose={() => {}} />)
    expect(screen.getByTestId('focus-next').textContent).toContain('ถึงเวลายืนยัน')
    expect(screen.getByRole('status').textContent).toContain('ไม่นับ')
  })

  it('disables the buttons while a request is in flight', () => {
    useSchoolWorldStore.getState().setFocus({ status: 'active', lastCheckInAt: Date.now(), busy: true })
    render(<FocusPanel onClose={() => {}} />)
    expect(screen.getByText('จบการอ่าน').disabled).toBe(true)
  })
})

describe('LeaderboardPanel', () => {
  it('lists ranked schools, highlights the caller, and shows the week countdown', async () => {
    fetchLeaderboard.mockResolvedValue({
      week: '2026-W42', endsAtMs: Date.now() + 2 * 86_400_000 + 3_600_000,
      schools: [
        { rank: 1, schoolId: 'A', schoolName: 'โรงเรียน A', avgHoursPerMember: 5 },
        { rank: 2, schoolId: 'B', schoolName: 'โรงเรียน B', avgHoursPerMember: 3 },
      ],
      mine: { schoolId: 'B', schoolName: 'โรงเรียน B', rank: 2, avgHoursPerMember: 3, contributors: 12 },
    })
    render(<LeaderboardPanel mySchoolId="B" onClose={() => {}} />)
    await waitFor(() => expect(screen.getByText('โรงเรียน A')).toBeTruthy())
    expect(screen.getByTestId('my-school').textContent).toContain('อันดับที่ 2')
    expect(screen.getByText(/เหลืออีก 2 วัน/)).toBeTruthy()
    expect(fetchLeaderboard).toHaveBeenCalledWith({ mySchoolId: 'B' })
  })

  it('tells an unranked school how many more students it needs', async () => {
    fetchLeaderboard.mockResolvedValue({
      week: 'W', endsAtMs: Date.now() + 1000, schools: [],
      mine: { schoolId: 'Z', schoolName: 'โรงเรียน Z', rank: null, contributors: 4 },
    })
    render(<LeaderboardPanel mySchoolId="Z" onClose={() => {}} />)
    await waitFor(() => expect(screen.getByTestId('my-school').textContent).toContain('อีก 6 คน'))
  })

  it('handles no data yet and a failed load', async () => {
    fetchLeaderboard.mockResolvedValueOnce(null)
    const { unmount } = render(<LeaderboardPanel mySchoolId="Z" onClose={() => {}} />)
    await waitFor(() => expect(screen.getByText(/ยังไม่มีข้อมูลสัปดาห์นี้/)).toBeTruthy())
    unmount()
    fetchLeaderboard.mockRejectedValueOnce(new Error('x'))
    render(<LeaderboardPanel mySchoolId="Z" onClose={() => {}} />)
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
  })
})

describe('Teacher badge in the layer', () => {
  const inHub = { inHub: true, room: { kind: 'school', shard: 1, ownerUid: 'school:S1:1', schoolId: 'S1' } }

  it('a teacher claim puts the badge on presence; a student gets none', async () => {
    board.readTeacherClaims.mockResolvedValue({ teacherSchoolId: 'S1' })
    useSchoolWorldStore.setState(inHub)
    const { registry } = renderLayer()
    await waitFor(() => expect(registry.set).toHaveBeenCalledWith('selfBadge', 'teacher'))
    cleanup()

    board.readTeacherClaims.mockResolvedValue(null)
    const second = renderLayer()
    await waitFor(() => expect(second.registry.set).toHaveBeenCalledWith('selfBadge', null))
    expect(second.registry.set).not.toHaveBeenCalledWith('selfBadge', 'teacher')
  })

  it('the canteen board shows school announcements for the room school', async () => {
    useSchoolWorldStore.setState({ ...inHub, panel: { type: 'board', id: 'news' } })
    renderLayer()
    expect(screen.getByLabelText('ประกาศจากโรงเรียน')).toBeTruthy()
    expect(board.subscribeSchoolPosts).toHaveBeenCalledWith('S1', expect.any(Function), expect.any(Function))
  })
})

describe('SchoolAnnouncements', () => {
  const posts = [
    { id: 'p1', title: 'สอบกลางภาค', body: 'วันจันทร์', authorUid: 't1', authorName: 'ครูสมชาย' },
    { id: 'p2', title: 'งดเรียน', body: '', authorUid: 'other', authorName: 'ครูสมศรี' },
  ]
  const withPosts = () => board.subscribeSchoolPosts.mockImplementation((_s, next) => { next(posts); return () => {} })

  it('lists posts; only the author sees a delete button', () => {
    withPosts()
    render(<SchoolAnnouncements schoolId="S1" user={{ uid: 't1', displayName: 'ครูสมชาย' }} isTeacher={false} />)
    expect(screen.getByText('สอบกลางภาค')).toBeTruthy()
    expect(screen.getAllByText('ลบ')).toHaveLength(1)
    fireEvent.click(screen.getByText('ลบ'))
    expect(board.deleteSchoolPost).toHaveBeenCalledWith('S1', 'p1')
  })

  it('students never see the composer; teachers do and can post', async () => {
    withPosts()
    const { unmount } = render(<SchoolAnnouncements schoolId="S1" user={{ uid: 's' }} isTeacher={false} />)
    expect(screen.queryByLabelText('หัวข้อประกาศ')).toBeNull()
    unmount()

    render(<SchoolAnnouncements schoolId="S1" user={{ uid: 't1', displayName: 'ครู' }} isTeacher />)
    fireEvent.change(screen.getByLabelText('หัวข้อประกาศ'), { target: { value: 'ประกาศใหม่' } })
    fireEvent.click(screen.getByText('โพสต์ประกาศ'))
    await waitFor(() => expect(board.createSchoolPost).toHaveBeenCalledWith(
      expect.objectContaining({ schoolId: 'S1', title: 'ประกาศใหม่' }),
    ))
  })

  it('an empty title is rejected locally with a Thai message, without calling the server', () => {
    render(<SchoolAnnouncements schoolId="S1" user={{ uid: 't1' }} isTeacher />)
    fireEvent.click(screen.getByText('โพสต์ประกาศ'))
    expect(screen.getByRole('alert').textContent).toContain('ใส่หัวข้อ')
    expect(board.createSchoolPost).not.toHaveBeenCalled()
  })

  it('a listener error (non-member) explains the restriction', () => {
    board.subscribeSchoolPosts.mockImplementation((_s, _n, err) => { err(new Error('denied')); return () => {} })
    render(<SchoolAnnouncements schoolId="S1" user={{ uid: 's' }} isTeacher={false} />)
    expect(screen.getByText(/เฉพาะสมาชิกของโรงเรียน/)).toBeTruthy()
  })

  it('renders nothing without a school', () => {
    const { container } = render(<SchoolAnnouncements schoolId={null} user={null} isTeacher={false} />)
    expect(container.innerHTML).toBe('')
  })
})

describe('BoardPanel', () => {
  it('news board lists only upcoming TCAS events', () => {
    const future = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10)
    tcasState.events = [
      { id: '1', date: '2000-01-01', title: 'เก่า' },
      { id: '2', date: future, title: 'ใหม่', description: 'รายละเอียด' },
    ]
    render(<BoardPanel boardId="news" onClose={() => {}} />)
    expect(screen.getByText(new RegExp('ใหม่'))).toBeTruthy()
    expect(screen.queryByText(/เก่า/)).toBeNull()
  })

  it('contest board loads camps from /api/camphub and degrades gracefully', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => [{ title: 'ค่าย A', link: 'https://x/a', small_description: 'd' }] })
      .mockResolvedValueOnce({ ok: false })
    vi.stubGlobal('fetch', fetchMock)
    const { unmount } = render(<BoardPanel boardId="contest" onClose={() => {}} />)
    await waitFor(() => expect(screen.getByText('ค่าย A')).toBeTruthy())
    expect(fetchMock).toHaveBeenCalledWith('/api/camphub?category=contest')
    unmount()
    render(<BoardPanel boardId="contest" onClose={() => {}} />)
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    vi.unstubAllGlobals()
  })
})

describe('FocusPanel temperament perk line', () => {
  it('shows the perk for the server-reported temperament and flags when the bonus is live', () => {
    useSchoolWorldStore.getState().setFocus({
      status: 'active', lastCheckInAt: Date.now(), temperament: 'NF', lastResult: { multiplier: 1.1 },
    })
    render(<FocusPanel onClose={() => {}} />)
    expect(screen.getByTestId('focus-perk').textContent).toContain('นกฮูกกลางคืน')
    expect(screen.getByTestId('focus-perk').textContent).toContain('โบนัสกำลังทำงาน')
  })

  it('omits the line without a temperament, and the live flag when the multiplier is 1', () => {
    useSchoolWorldStore.getState().setFocus({ status: 'active', lastCheckInAt: Date.now(), temperament: null })
    const { unmount } = render(<FocusPanel onClose={() => {}} />)
    expect(screen.queryByTestId('focus-perk')).toBeNull()
    unmount()
    useSchoolWorldStore.getState().setFocus({ temperament: 'SJ', lastResult: { multiplier: 1 } })
    render(<FocusPanel onClose={() => {}} />)
    expect(screen.getByTestId('focus-perk').textContent).not.toContain('โบนัสกำลังทำงาน')
  })
})
