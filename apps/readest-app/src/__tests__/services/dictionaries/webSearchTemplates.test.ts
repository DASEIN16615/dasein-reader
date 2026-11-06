import { describe, expect, it } from 'vitest';

import { BUILTIN_WEB_SEARCH_IDS } from '@/services/dictionaries/types';
import {
  BUILTIN_WEB_SEARCHES,
  getBuiltinWebSearch,
  substituteUrlTemplate,
} from '@/services/dictionaries/webSearchTemplates';

describe('Goodreads built-in web search', () => {
  it('is registered as a built-in template', () => {
    const tpl = getBuiltinWebSearch(BUILTIN_WEB_SEARCH_IDS.goodreads);
    expect(tpl).toBeDefined();
    expect(tpl?.name).toBe('Goodreads');
  });

  it('is included in the built-in list', () => {
    const ids = BUILTIN_WEB_SEARCHES.map((t) => t.id);
    expect(ids).toContain(BUILTIN_WEB_SEARCH_IDS.goodreads);
  });

  it('produces a Goodreads search URL when the word is substituted', () => {
    const tpl = getBuiltinWebSearch(BUILTIN_WEB_SEARCH_IDS.goodreads)!;
    expect(substituteUrlTemplate(tpl.urlTemplate, 'The Dispossessed')).toBe(
      'https://www.goodreads.com/search?q=The%20Dispossessed',
    );
  });
});

describe('Bing Dictionary and Cambridge Dictionary built-in search', () => {
  it('registers Bing Dictionary with cn.bing.com template', () => {
    const tpl = getBuiltinWebSearch(BUILTIN_WEB_SEARCH_IDS.bing);
    expect(tpl).toBeDefined();
    expect(tpl?.name).toBe('Bing Dictionary');
    expect(substituteUrlTemplate(tpl!.urlTemplate, 'epistemology')).toBe(
      'https://cn.bing.com/dict/search?q=epistemology',
    );
  });

  it('registers Cambridge Dictionary with English-Chinese simplified template', () => {
    const tpl = getBuiltinWebSearch(BUILTIN_WEB_SEARCH_IDS.cambridge);
    expect(tpl).toBeDefined();
    expect(tpl?.name).toBe('Cambridge Dictionary');
    expect(substituteUrlTemplate(tpl!.urlTemplate, 'phenomenology')).toBe(
      'https://dictionary.cambridge.org/search/direct/?datasetsearch=english-chinese-simplified&q=phenomenology',
    );
  });
});
