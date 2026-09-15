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

  it('renders archived cards newest-first by archivedAt', async () => {
    const oldest = createCard({ id: 'c1', title: 'Oldest', archivedAt: '2026-01-01T00:00:00.000Z' });
    const newest = createCard({ id: 'c2', title: 'Newest', archivedAt: '2026-03-01T00:00:00.000Z' });
    const middle = createCard({ id: 'c3', title: 'Middle', archivedAt: '2026-02-01T00:00:00.000Z' });

    render(
      <Provider>
        <TestWrapper>
          <ArchiveCards cards={[oldest, newest, middle]} />
        </TestWrapper>
      </Provider>,
    );

    const titles = screen.getAllByText(/^(Oldest|Newest|Middle)$/).map((el) => el.textContent);
    expect(titles).toEqual(['Newest', 'Middle', 'Oldest']);
  });

  it('keys cards sharing the same title by their distinct uid, without displaying it', async () => {
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

    const { container } = render(
      <Provider>
        <TestWrapper>
          <ArchiveCards cards={[card1, card2]} />
        </TestWrapper>
      </Provider>,
    );

    expect(await screen.findAllByText('Duplicate Title')).toHaveLength(2);
    expect(container.querySelector('[data-uid="c1-unique-uid"]')).not.toBeNull();
    expect(container.querySelector('[data-uid="c2-unique-uid"]')).not.toBeNull();
    expect(screen.queryByText('#c1-uniqu')).not.toBeInTheDocument();
    expect(screen.queryByText('#c2-uniqu')).not.toBeInTheDocument();
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
    expect(container.querySelector('[data-uid="card-2-uid"]')).not.toBeNull();
    expect(container.querySelector('[data-uid="card-1-uid"]')).toBeNull();
  });

  it('restores the hovered card when pressing "r"', async () => {
    const card1 = createCard({
      id: 'c1',
      uid: 'card-1-uid',
      title: 'Card One',
      listId: 'list-1',
      archivedFromList: { id: 'list-1', title: 'Backlog' },
    });
    const card2 = createCard({
      id: 'c2',
      uid: 'card-2-uid',
      title: 'Card Two',
      listId: 'list-1',
      archivedFromList: { id: 'list-1', title: 'Backlog' },
    });

    const ArchiveCardsFromStore = () => {
      const setKanban = actions.useSetKanban();
      const archiveCards = selectors.useArchiveCards();
      React.useEffect(() => {
        setKanban(
          createKanban({
            lists: [{ id: 'list-1', title: 'Backlog', cards: [] }],
            archive: { lists: [], cards: [card1, card2] },
          }),
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return <ArchiveCards cards={archiveCards} />;
    };

    render(
      <Provider>
        <TestWrapper>
          <ArchiveCardsFromStore />
        </TestWrapper>
      </Provider>,
    );

    const cardOneTitle = await screen.findByText('Card One');
    const cardOneContainer = cardOneTitle.closest('[tabindex="0"]');
    expect(cardOneContainer).not.toBeNull();

    fireEvent.mouseEnter(cardOneContainer!);
    fireEvent.keyDown(window, { key: 'r' });

    expect(screen.queryByText('Card One')).not.toBeInTheDocument();
    expect(screen.getByText('Card Two')).toBeInTheDocument();
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

