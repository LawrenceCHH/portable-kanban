import { render, screen } from '@testing-library/react';
import { Provider } from 'jotai';
import { describe, expect, it } from 'vitest';
import * as React from 'react';
import { ArchiveCards } from '../../pages/ArchiveCards';
import { TestWrapper, createCard } from '../helpers';

describe('ArchiveCards page', () => {
  it('renders archive cards list without crashing', async () => {
    const card = createCard({
      id: 'c1',
      title: 'Archived Card in List',
      archivedFromList: { id: 'l1', title: 'Backlog' },
    });

    render(
      <Provider>
        <TestWrapper>
          <ArchiveCards cards={[card]} />
        </TestWrapper>
      </Provider>,
    );

    expect(screen.getByText('Archive Cards')).toBeInTheDocument();
    expect(screen.getByText('Archived Card in List')).toBeInTheDocument();
    expect(screen.getByText('Block: Backlog')).toBeInTheDocument();
  });

  it('renders empty state when no cards are archived', async () => {
    render(
      <Provider>
        <TestWrapper>
          <ArchiveCards cards={[]} />
        </TestWrapper>
      </Provider>,
    );

    expect(screen.getByText('Archive Cards')).toBeInTheDocument();
    expect(screen.getByText('No archived cards')).toBeInTheDocument();
  });
});
