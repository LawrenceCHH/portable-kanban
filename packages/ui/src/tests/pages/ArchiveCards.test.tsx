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

  it('handles multiple cards with duplicate names independently on delete shortcut', async () => {
    const card1 = createCard({
      id: 'c1',
      uid: 'c1-unique-uid',
      title: 'Duplicate Title',
      archivedFromList: { id: 'l1', title: 'Backlog' },
    });
    const card2 = createCard({
      id: 'c2',
      uid: 'c2-unique-uid',
      title: 'Duplicate Title',
      archivedFromList: { id: 'l1', title: 'Backlog' },
    });

    render(
      <Provider>
        <TestWrapper>
          <ArchiveCards cards={[card1, card2]} />
        </TestWrapper>
      </Provider>,
    );

    expect(screen.getByText('#c1-uniqu')).toBeInTheDocument();
    expect(screen.getByText('#c2-uniqu')).toBeInTheDocument();
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

