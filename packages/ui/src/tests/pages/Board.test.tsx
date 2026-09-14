import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'jotai';
import { describe, expect, it } from 'vitest';
import { Board } from '../../pages/Board';
import { actions } from '../../store';
import { TestWrapper, createCard, createKanban, createList } from '../helpers';
import * as React from 'react';

const KanbanInitializer = ({
  kanban,
  title,
  children,
}: {
  kanban: ReturnType<typeof createKanban>;
  title?: string;
  children: React.ReactNode;
}) => {
  const setKanban = actions.useSetKanban();
  const setTitle = actions.useSetTitle();
  React.useEffect(() => {
    setKanban(kanban);
    if (title) setTitle(title);
  }, []);
  return <>{children}</>;
};

const renderBoard = (
  kanban = createKanban(),
  title = 'My Board',
) => {
  return render(
    <Provider>
      <TestWrapper>
        <KanbanInitializer kanban={kanban} title={title}>
          <Board />
        </KanbanInitializer>
      </TestWrapper>
    </Provider>,
  );
};

describe('Board', () => {
  it('renders the header with title', async () => {
    renderBoard(createKanban(), 'My Project');
    await screen.findByText('My Project');
    expect(screen.getByText('My Project')).toBeInTheDocument();
  });

  it('renders lists when kanban has lists', async () => {
    const list = createList({ id: 'l1', title: 'Backlog' });
    const kanban = createKanban({ lists: [list] });
    renderBoard(kanban);
    await screen.findByText('Backlog');
    expect(screen.getByText('Backlog')).toBeInTheDocument();
  });

  it('renders cards inside a list', async () => {
    const card = createCard({ id: 'c1', listId: 'l1', title: 'Fix bug' });
    const list = createList({ id: 'l1', title: 'To Do', cards: [card] });
    const kanban = createKanban({ lists: [list] });
    renderBoard(kanban);
    await screen.findByText('Fix bug');
    expect(screen.getByText('Fix bug')).toBeInTheDocument();
  });

  it('renders multiple lists', async () => {
    const lists = [
      createList({ id: 'l1', title: 'Backlog' }),
      createList({ id: 'l2', title: 'In Progress' }),
      createList({ id: 'l3', title: 'Done' }),
    ];
    const kanban = createKanban({ lists });
    renderBoard(kanban);
    await screen.findByText('Backlog');
    expect(screen.getByText('Backlog')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('shows filter search input in header', async () => {
    renderBoard();
    await screen.findByPlaceholderText('Filter cards');
    expect(screen.getByPlaceholderText('Filter cards')).toBeInTheDocument();
  });

  it('shows empty state in list with no cards', async () => {
    const list = createList({ id: 'l1', title: 'Empty List', cards: [] });
    const kanban = createKanban({ lists: [list] });
    renderBoard(kanban);
    await screen.findByText('Empty List');
    expect(screen.getByText('No cards')).toBeInTheDocument();
  });

  it('shows card count badge when list has cards', async () => {
    const cards = [
      createCard({ id: 'c1', listId: 'l1', title: 'Card 1' }),
      createCard({ id: 'c2', listId: 'l1', title: 'Card 2' }),
    ];
    const list = createList({ id: 'l1', title: 'To Do', cards });
    const kanban = createKanban({ lists: [list] });
    renderBoard(kanban);
    await screen.findByText('2');
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('filters cards by search text', async () => {
    const user = userEvent.setup();
    const cards = [
      createCard({ id: 'c1', listId: 'l1', title: 'Fix login bug' }),
      createCard({ id: 'c2', listId: 'l1', title: 'Add dark mode' }),
    ];
    const list = createList({ id: 'l1', title: 'Tasks', cards });
    const kanban = createKanban({ lists: [list] });
    renderBoard(kanban);

    await screen.findByText('Fix login bug');
    await user.type(screen.getByPlaceholderText('Filter cards'), 'login');

    // Wait for debounce
    await new Promise((r) => setTimeout(r, 400));
    expect(screen.queryByText('Add dark mode')).not.toBeInTheDocument();
    expect(screen.getByText('Fix login bug')).toBeInTheDocument();
  });

  it('directly deletes hovered card on Ctrl+d', async () => {
    const card = createCard({ id: 'c1', listId: 'l1', title: 'Hover Delete Target' });
    const list = createList({ id: 'l1', title: 'Tasks', cards: [card] });
    const kanban = createKanban({ lists: [list] });
    renderBoard(kanban);

    const cardEl = await screen.findByText('Hover Delete Target');
    // Hover over card
    const cardContainer = cardEl.closest('[tabindex="0"]')!;
    fireEvent.mouseEnter(cardContainer);

    // Press Ctrl + d
    fireEvent.keyDown(window, { key: 'd', ctrlKey: true });

    // The card should be deleted directly
    expect(screen.queryByText('Hover Delete Target')).not.toBeInTheDocument();
  });

  it('shows confirmation modal on "d" when hovered and deletes upon confirm', async () => {
    const card = createCard({ id: 'c1', listId: 'l1', title: 'Card To Confirm Delete' });
    const list = createList({ id: 'l1', title: 'Tasks', cards: [card] });
    const kanban = createKanban({ lists: [list] });
    renderBoard(kanban);

    const cardEl = await screen.findByText('Card To Confirm Delete');
    const cardContainer = cardEl.closest('[tabindex="0"]')!;
    fireEvent.mouseEnter(cardContainer);

    // Press 'd'
    fireEvent.keyDown(window, { key: 'd' });

    // Confirm dialog should be shown
    expect(screen.getByText('Delete Card')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to permanently delete/i)).toBeInTheDocument();

    // Confirm deletion
    const deleteBtns = screen.getAllByRole('button', { name: /Delete/i });
    const deleteBtn = deleteBtns[deleteBtns.length - 1];
    fireEvent.click(deleteBtn);

    // Card should now be deleted
    expect(screen.queryByText('Card To Confirm Delete')).not.toBeInTheDocument();
  });

  it('shows exactly one confirmation dialog and keeps the card when cancelled', async () => {
    const card = createCard({ id: 'c1', listId: 'l1', title: 'Card To Keep' });
    const list = createList({ id: 'l1', title: 'Tasks', cards: [card] });
    const kanban = createKanban({ lists: [list] });
    renderBoard(kanban);

    const cardEl = await screen.findByText('Card To Keep');
    const cardContainer = cardEl.closest('[tabindex="0"]')!;
    fireEvent.mouseEnter(cardContainer);

    fireEvent.keyDown(window, { key: 'd' });

    expect(screen.getAllByText('Delete Card')).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText('Delete Card')).not.toBeInTheDocument();
    expect(screen.getByText('Card To Keep')).toBeInTheDocument();
  });
});
