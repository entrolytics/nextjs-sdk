import { describe, expect, it } from 'vitest';

import { toFormFieldType } from './useFormTracking';

describe('toFormFieldType', () => {
  it('maps select controls to select', () => {
    expect(toFormFieldType('select-one')).toBe('select');
    expect(toFormFieldType('select-multiple')).toBe('select');
  });

  it('maps date and time inputs to date', () => {
    for (const type of ['date', 'datetime-local', 'month', 'week', 'time']) {
      expect(toFormFieldType(type)).toBe('date');
    }
  });

  it('maps search to text', () => {
    expect(toFormFieldType('search')).toBe('text');
  });

  it('keeps types the API accepts', () => {
    expect(toFormFieldType('email')).toBe('email');
    expect(toFormFieldType('textarea')).toBe('textarea');
  });

  it('maps any other type to other', () => {
    for (const type of ['range', 'color', 'button', 'reset', 'image']) {
      expect(toFormFieldType(type)).toBe('other');
    }
  });
});
