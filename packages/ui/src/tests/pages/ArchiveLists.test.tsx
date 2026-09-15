import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'jotai';
import { describe, expect, it } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { ArchiveLists } from '../../pages/ArchiveLists';
import { TestWrapper } from '../helpers';

describe('ArchiveLists page', () => {
  it('renders the archived lists', () => {
    render(
      <Provider>
        <TestWrapper>
          <ArchiveLists lists={[{ id: 'l1', title: 'Old Backlog' }]} />
        </TestWrapper>
      </Provider>,
    );

    expect(screen.getByText('Archive Lists')).toBeInTheDocument();
    expect(screen.getByText('Old Backlog')).toBeInTheDocument();
  });

  it('closes back to the board when pressing Escape', async () => {
    render(
      <Provider>
        <TestWrapper initialPath="/archive/lists">
          <Routes>
            <Route path="/" element={<div>Board Page</div>} />
            <Route path="/archive/lists" element={<ArchiveLists lists={[{ id: 'l1', title: 'Old Backlog' }]} />} />
          </Routes>
        </TestWrapper>
      </Provider>,
    );

    await screen.findByText('Archive Lists');

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(await screen.findByText('Board Page')).toBeInTheDocument();
    expect(screen.queryByText('Archive Lists')).not.toBeInTheDocument();
  });
});
