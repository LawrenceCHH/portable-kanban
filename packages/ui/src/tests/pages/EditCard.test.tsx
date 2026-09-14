import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'jotai';
import { describe, expect, it } from 'vitest';
import * as React from 'react';
import { EditCard } from '../../pages/EditCard';
import { actions } from '../../store';
import { TestWrapper, createCard, createKanban, createList } from '../helpers';

const KanbanInitializer = ({
  kanban,
  children,
}: {
  kanban: ReturnType<typeof createKanban>;
  children: React.ReactNode;
}) => {
  const setKanban = actions.useSetKanban();
  React.useEffect(() => {
    setKanban(kanban);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <>{children}</>;
};

const renderEditCard = (kanban: ReturnType<typeof createKanban>, path: string) =>
  render(
    <Provider>
      <TestWrapper initialPath={path}>
        <KanbanInitializer kanban={kanban}>
          <EditCard />
        </KanbanInitializer>
      </TestWrapper>
    </Provider>,
  );

describe('EditCard page', () => {
  it('shows exactly one confirmation dialog and keeps the card when cancelled', async () => {
    const card = createCard({ id: 'c1', listId: 'l1', title: 'Card To Keep' });
    const list = createList({ id: 'l1', title: 'Tasks', cards: [card] });
    const kanban = createKanban({ lists: [list] });
    renderEditCard(kanban, '/list/l1/card/c1');

    const deleteButtons = await screen.findAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    expect(screen.getAllByText(/permanently delete/i)).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByText(/permanently delete/i)).not.toBeInTheDocument();
    // The editor is still open on the (undeleted) card — its Delete button is still there.
    expect(screen.getAllByText('Delete')).toHaveLength(1);
  });

  it('deletes the card only after confirming', async () => {
    const card = createCard({ id: 'c1', listId: 'l1', title: 'Card To Remove' });
    const list = createList({ id: 'l1', title: 'Tasks', cards: [card] });
    const kanban = createKanban({ lists: [list] });
    renderEditCard(kanban, '/list/l1/card/c1');

    const deleteButtons = await screen.findAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    const confirmButtons = screen.getAllByRole('button', { name: /Delete/i });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);

    expect(screen.queryByText(/permanently delete/i)).not.toBeInTheDocument();
  });
});
