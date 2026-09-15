import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'jotai';
import { describe, expect, it } from 'vitest';
import { ShortcutsHelp } from '../../components/ShortcutsHelp';

describe('ShortcutsHelp', () => {
  it('shows the shortcuts panel only after clicking the icon', () => {
    render(
      <Provider>
        <ShortcutsHelp />
      </Provider>,
    );

    expect(screen.queryByText('Open Archived List')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Keyboard shortcuts' }));

    expect(screen.getByText('Open Archived List')).toBeInTheDocument();
    expect(screen.getByText('l')).toBeInTheDocument();
  });
});
