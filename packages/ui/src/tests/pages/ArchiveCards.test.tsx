import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'jotai';
import { describe, expect, it } from 'vitest';
import * as React from 'react';
import { ArchiveCards } from '../../pages/ArchiveCards';
import { actions, selectors } from '../../store';
import { TestWrapper, createCard, createKanban } from '../helpers';

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

  it('renders distinct uid tags for cards sharing the same title', async () => {
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

  it('Ctrl+D on a hovered card only deletes that card, even when another card shares its id', async () => {
    // Both cards share `id: 'dup-id'` (e.g. from hand-edited/merged .kanban files);
    // only `uid` tells them apart. The hover shortcut must key off uid, not id.
    const card1 = createCard({
      id: 'dup-id',
      uid: 'card-1-uid',
      title: 'Duplicate Title',
      archivedFromList: { id: 'l1', title: 'Backlog' },
    });
    const card2 = createCard({
      id: 'dup-id',
      uid: 'card-2-uid',
      title: 'Duplicate Title',
      archivedFromList: { id: 'l1', title: 'Backlog' },
    });

    const ArchiveCardsFromStore = () => {
      const setKanban = actions.useSetKanban();
      const archiveCards = selectors.useArchiveCards();
      React.useEffect(() => {
        setKanban(createKanban({ archive: { lists: [], cards: [card1, card2] } }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return <ArchiveCards cards={archiveCards} />;
    };

    const { container } = render(
      <Provider>
        <TestWrapper>
          <ArchiveCardsFromStore />
        </TestWrapper>
      </Provider>,
    );

    const titles = await screen.findAllByText('Duplicate Title');
    expect(titles).toHaveLength(2);
    const firstCardContainer = titles[0].closest('[tabindex="0"]');
    expect(firstCardContainer).not.toBeNull();

    fireEvent.mouseEnter(firstCardContainer!);
    fireEvent.keyDown(window, { key: 'd', ctrlKey: true });

    const remainingTitles = await screen.findAllByText('Duplicate Title');
    expect(remainingTitles).toHaveLength(1);
    expect(screen.getByText('#card-2-u')).toBeInTheDocument();
    expect(screen.queryByText('#card-1-u')).not.toBeInTheDocument();
    expect(container).toBeTruthy();
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

