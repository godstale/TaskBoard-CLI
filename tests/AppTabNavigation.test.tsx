import { describe, it, expect, vi } from 'vitest'
import { render } from 'ink-testing-library'
import React from 'react'
import { App } from '../src/App'
import { useTaskBoard } from '../src/useTaskBoard'
import { useSafeInput } from '../src/useSafeInput'

vi.mock('../src/useTaskBoard', () => ({
  useTaskBoard: vi.fn(),
}))

vi.mock('../src/useSafeInput', () => ({
  useSafeInput: vi.fn(),
}))

// Mock screens to avoid deep rendering issues
vi.mock('../src/screens/Dashboard', () => ({ Dashboard: () => null }))
vi.mock('../src/screens/TaskOperations', () => ({ TaskOperations: () => null }))
vi.mock('../src/screens/Workflows', () => ({ Workflows: () => null }))
vi.mock('../src/screens/Resources', () => ({ Resources: () => null }))
vi.mock('../src/screens/Settings', () => ({ Settings: () => null }))

describe('App Tab Navigation', () => {
  it('Tab 키를 누르면 다음 화면으로 전환된다', () => {
    const setScreen = vi.fn()
    ;(useTaskBoard as any).mockReturnValue({
      screen: 'dashboard',
      setScreen,
      selectedWorkflowId: 'wf1',
      workflows: [],
      project: { title: 'Test' },
      reload: vi.fn(),
    })

    let inputHandler: any
    ;(useSafeInput as any).mockImplementation((handler: any) => {
      inputHandler = handler
    })

    render(<App dbPath="test.db" />)

    // Simulate Tab key
    inputHandler('', { tab: true, shift: false })

    // dashboard is at index 1, next is taskops (index 2)
    expect(setScreen).toHaveBeenCalledWith('taskops')
  })

  it('Shift + Tab 키를 누르면 이전 화면으로 전환된다', () => {
    const setScreen = vi.fn()
    ;(useTaskBoard as any).mockReturnValue({
      screen: 'dashboard',
      setScreen,
      selectedWorkflowId: 'wf1',
      workflows: [],
      project: { title: 'Test' },
      reload: vi.fn(),
    })

    let inputHandler: any
    ;(useSafeInput as any).mockImplementation((handler: any) => {
      inputHandler = handler
    })

    render(<App dbPath="test.db" />)

    // Simulate Shift + Tab key
    inputHandler('', { tab: true, shift: true })

    // dashboard is at index 1, previous is workflows (index 0)
    expect(setScreen).toHaveBeenCalledWith('workflows')
  })

  it('워크플로우가 선택되지 않았을 때 Workflows 화면에서는 전환되지 않는다', () => {
    const setScreen = vi.fn()
    ;(useTaskBoard as any).mockReturnValue({
      screen: 'workflows',
      setScreen,
      selectedWorkflowId: null,
      workflows: [],
      project: { title: 'Test' },
      reload: vi.fn(),
    })

    let inputHandler: any
    ;(useSafeInput as any).mockImplementation((handler: any) => {
      inputHandler = handler
    })

    render(<App dbPath="test.db" />)

    // Simulate Tab key
    inputHandler('', { tab: true, shift: false })
    expect(setScreen).not.toHaveBeenCalled()

    // Simulate Shift + Tab key
    inputHandler('', { tab: true, shift: true })
    expect(setScreen).not.toHaveBeenCalled()
  })
})
