import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  addCards,
  addCheckBox,
  addList,
  archiveCard,
  archiveCards,
  fromJson,
  restoreCard,
  updateCard,
} from 'portable-kanban-core';

describe('fromJson', () => {
  const emptyKanban = fromJson(
    JSON.stringify({
      lists: [],
      settings: { labels: [] },
      archive: { lists: [], cards: [] },
    }),
  );

  const newList = () => ({
    id: randomUUID(),
    title: 'test',
    cards: [],
  });

  const newCard = (listId: string) => {
    return {
      id: 'card',
      listId,
      title: 'card',
      description: 'description',
      dueDate: undefined,
      labels: [],
      checkboxes: [],
      comments: [],
    };
  };

  it('kanban can parse', async () => {
    const data = await emptyKanban;
    expect(data?.lists.length).toBe(0);
  });

  it('kanban lists can parse', async () => {
    const data = await fromJson(
      JSON.stringify({
        lists: [
          {
            id: 'listId',
            title: 'title',
            cards: [
              {
                id: 'id',
                listId: 'listId',
                title: 'title',
                description: 'description',
                dueDate: undefined,
                labels: [],
                checkboxes: [],
                comments: [],
              },
            ],
          },
        ],
        settings: {
          labels: [],
        },
        archive: { lists: [], cards: [] },
      }),
    );
    expect(data?.lists.length).toBe(1);
    expect(data?.lists[0].cards.length).toBe(1);
    expect(data?.lists[0].cards[0].title).toBe('title');
  });

  it('edit list and cards', async () => {
    const data = await emptyKanban;
    const checkBox = { id: 'checkbox', title: 'checkbox', checked: true };
    const list = newList();
    const card = newCard(list.id);
    const lists = addCheckBox(addCards(addList(data.lists, list), list, [card]), list, card, checkBox);
    const kanban = { ...data, lists };
    expect(lists.length).toBe(1);
    expect(lists[0].cards.length).toBe(1);
    expect(lists[0].cards[0].checkboxes.length).toBe(1);
    expect(updateCard(lists, lists[0], { ...card, title: 'updated' })[0].cards[0].title).toBe('updated');
    expect(archiveCard(kanban, lists[0], card).archive.cards.length).toBe(1);
  });

  it('archive and restore cards', async () => {
    const data = await emptyKanban;
    const list = newList();
    const card = newCard(list.id);
    const lists = addCards(addList(data.lists, list), list, [card]);
    const kanban = { ...data, lists };
    const archived = archiveCard(kanban, kanban.lists[0], card);
    expect(archived.archive.cards.length).toBe(1);
    expect(archived.archive.cards[0].archivedFromList?.title).toBe(list.title);
    expect(archived.archive.cards[0].archivedAt).toBeDefined();
    expect(archived.archive.cards[0].activities?.length).toBe(1);
    expect(archived.archive.cards[0].activities?.[0].type).toBe('archived');

    const restored = restoreCard(archived, archived.archive.cards[0]);
    expect(restored.archive.cards.length).toBe(0);
    expect(restored.lists[0].cards[0].activities?.some((a) => a.type === 'restored')).toBe(true);
  });

  it('batch archive cards (archiveCards)', async () => {
    const data = await emptyKanban;
    const list = newList();
    const card1 = newCard(list.id);
    const card2 = { ...newCard(list.id), id: 'card2' };
    const lists = addCards(addList(data.lists, list), list, [card1, card2]);
    const kanban = { ...data, lists };

    const archived = archiveCards(kanban, [card1.id, card2.id]);
    expect(archived.archive.cards.length).toBe(2);
    expect(archived.lists[0].cards.length).toBe(0);
    expect(archived.archive.cards[0].archivedFromList?.title).toBe(list.title);
    expect(archived.archive.cards[1].archivedFromList?.title).toBe(list.title);
  });
});
