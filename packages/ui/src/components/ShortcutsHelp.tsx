import * as React from 'react';
import { MdKeyboard } from 'react-icons/md';
import { styled } from 'styled-components';
import { actions, selectors } from '../store';

const MENU_ID = 'shortcuts-help';

const IconWrapper = styled.div`
  font-size: 1.1rem;
  cursor: pointer;
  position: relative;
  color: var(--light-text-color);
`;

const Panel = styled.div`
  position: absolute;
  top: 24px;
  right: 0;
  width: 300px;
  max-height: 70vh;
  overflow-y: auto;
  background-color: var(--primary-background-color);
  color: var(--text-color);
  box-shadow: var(--shadow-sm);
  border-radius: 8px;
  padding: 12px 16px;
  z-index: 100;
  font-size: 0.8rem;
`;

const GroupTitle = styled.div`
  font-weight: 700;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--dark-text-color);
  margin: 14px 0 6px;

  &:first-child {
    margin-top: 0;
  }
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 3px 0;
`;

const Keys = styled.span`
  font-family: monospace;
  background-color: var(--secondary-background-color);
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 0.75rem;
  white-space: nowrap;
`;

type Shortcut = { keys: string; description: string };
type Group = { title: string; shortcuts: Shortcut[] };

const groups: Group[] = [
  {
    title: 'Board — hovered/selected card',
    shortcuts: [
      { keys: 'a', description: 'Archive' },
      { keys: 'd', description: 'Delete (confirm)' },
      { keys: 'Ctrl/Cmd+D', description: 'Delete directly' },
      { keys: 'Space', description: 'Toggle select' },
      { keys: 'c', description: 'Duplicate' },
      { keys: 'Enter', description: 'Open card' },
    ],
  },
  {
    title: 'Board — anywhere',
    shortcuts: [
      { keys: 'c', description: 'Open Archived Cards (no card hovered)' },
      { keys: 'l', description: 'Open Archived List' },
      { keys: 'Esc', description: 'Clear selection' },
      { keys: 'Ctrl/Cmd+Wheel', description: 'Zoom layout (saved in file)' },
    ],
  },
  {
    title: 'Card view',
    shortcuts: [
      { keys: 'a', description: 'Archive this card' },
      { keys: 'd', description: 'Delete (confirm)' },
      { keys: 'Ctrl/Cmd+D', description: 'Delete directly' },
      { keys: 'Esc', description: 'Close' },
    ],
  },
  {
    title: 'Archived cards',
    shortcuts: [
      { keys: 'r', description: 'Restore hovered/open card' },
      { keys: 'd', description: 'Delete (confirm)' },
      { keys: 'Ctrl/Cmd+D', description: 'Delete directly' },
      { keys: 'Esc', description: 'Close' },
    ],
  },
];

export const ShortcutsHelp = () => {
  const menuId = selectors.useMenu();
  const setMenu = actions.useSetMenu();
  const isOpen = menuId === MENU_ID;

  return (
    <IconWrapper
      role="button"
      aria-label="Keyboard shortcuts"
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        setMenu(MENU_ID);
      }}
    >
      <MdKeyboard />
      {isOpen && (
        <Panel onClick={(e: React.MouseEvent) => e.stopPropagation()}>
          {groups.map((group) => (
            <div key={group.title}>
              <GroupTitle>{group.title}</GroupTitle>
              {group.shortcuts.map((shortcut) => (
                <Row key={`${group.title}-${shortcut.keys}-${shortcut.description}`}>
                  <span>{shortcut.description}</span>
                  <Keys>{shortcut.keys}</Keys>
                </Row>
              ))}
            </div>
          ))}
        </Panel>
      )}
    </IconWrapper>
  );
};
