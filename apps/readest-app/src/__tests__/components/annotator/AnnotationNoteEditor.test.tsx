import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => (key: string) => key,
}));

import AnnotationNoteEditor from '@/app/reader/components/annotator/AnnotationNoteEditor';

describe('AnnotationNoteEditor cognitive tags', () => {
  afterEach(() => {
    cleanup();
  });
  it('renders cognitive taxonomy buttons (观点, 疑问, 反驳, 联系, 待查)', () => {
    render(<AnnotationNoteEditor value='' onSave={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getByText('观点')).toBeDefined();
    expect(screen.getByText('疑问')).toBeDefined();
    expect(screen.getByText('反驳')).toBeDefined();
    expect(screen.getByText('联系')).toBeDefined();
    expect(screen.getByText('待查')).toBeDefined();
  });

  it('toggles a cognitive tag into the editor text when clicked', () => {
    const handleSave = vi.fn();
    render(
      <AnnotationNoteEditor value='This is interesting' onSave={handleSave} onCancel={vi.fn()} />,
    );

    // Click 疑问 tag
    const questionBtn = screen.getByText('疑问').closest('button')!;
    fireEvent.click(questionBtn);

    // Save and check content
    const saveBtn = screen.getByText('Save');
    fireEvent.click(saveBtn);

    expect(handleSave).toHaveBeenCalledWith('#疑问 This is interesting');
  });

  it('removes the tag when clicked a second time', () => {
    const handleSave = vi.fn();
    render(
      <AnnotationNoteEditor value='#疑问 Existing note' onSave={handleSave} onCancel={vi.fn()} />,
    );

    // Click 疑问 tag to toggle off
    const questionBtn = screen.getByText('疑问').closest('button')!;
    fireEvent.click(questionBtn);

    // Save and check content
    const saveBtn = screen.getByText('Save');
    fireEvent.click(saveBtn);

    expect(handleSave).toHaveBeenCalledWith('Existing note');
  });
});
