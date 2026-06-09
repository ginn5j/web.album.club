import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AlbumPicker } from '../AlbumPicker'

vi.mock('../AlbumSearch', () => ({
  AlbumSearch: () => <div data-testid="album-search-v1" />,
}))

vi.mock('../AlbumSearchV2', () => ({
  AlbumSearchV2: () => <div data-testid="album-search-v2" />,
}))

describe('AlbumPicker', () => {
  it('shows the Artist / Release search by default', () => {
    render(<AlbumPicker onSelect={vi.fn()} />)
    expect(screen.getByTestId('album-search-v2')).toBeTruthy()
    expect(screen.queryByTestId('album-search-v1')).toBeNull()
  })

  it('switches to the query search when its toggle is clicked', () => {
    render(<AlbumPicker onSelect={vi.fn()} />)
    fireEvent.click(screen.getByText('Query Search'))
    expect(screen.getByTestId('album-search-v1')).toBeTruthy()
    expect(screen.queryByTestId('album-search-v2')).toBeNull()
  })

  it('switches back to the Artist / Release search when toggled again', () => {
    render(<AlbumPicker onSelect={vi.fn()} />)
    fireEvent.click(screen.getByText('Query Search'))
    fireEvent.click(screen.getByText('Artist / Release'))
    expect(screen.getByTestId('album-search-v2')).toBeTruthy()
    expect(screen.queryByTestId('album-search-v1')).toBeNull()
  })
})
