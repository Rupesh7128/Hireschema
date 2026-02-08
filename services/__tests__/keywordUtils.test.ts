import { describe, it, expect } from 'vitest';
import { includesKeyword, prioritizeKeywords } from '../keywordUtils';

describe('keywordUtils', () => {
  describe('includesKeyword', () => {
    it('matches simple keywords with word boundaries', () => {
      expect(includesKeyword('Skills: Excel, SQL', 'Excel')).toBe(true);
      expect(includesKeyword('Skills: Excellent communication', 'Excel')).toBe(false);
    });

    it('matches multi-word keywords with flexible whitespace', () => {
      expect(includesKeyword('Tools: Power   BI, Tableau', 'Power BI')).toBe(true);
    });

    it('treats MS Excel and Microsoft Excel as Excel equivalents', () => {
      expect(includesKeyword('Tools: Microsoft Excel', 'MS Excel')).toBe(true);
      expect(includesKeyword('Tools: MS Excel', 'Microsoft Excel')).toBe(true);
      expect(includesKeyword('Tools: Excel', 'Microsoft Excel')).toBe(true);
    });

    it('treats AWS and Amazon Web Services as equivalents', () => {
      expect(includesKeyword('Skills: Amazon Web Services (AWS)', 'AWS')).toBe(true);
      expect(includesKeyword('Skills: AWS', 'Amazon Web Services')).toBe(true);
    });
  });

  describe('prioritizeKeywords', () => {
    it('prioritizes common hard-skill keywords like Excel', () => {
      const out = prioritizeKeywords(['Communication', 'Excel', 'Teamwork']);
      expect(out[0]).toBe('Excel');
    });

    it('dedupes keywords case-insensitively', () => {
      const out = prioritizeKeywords(['Excel', 'excel', 'MS Excel']);
      const normalized = out.map(k => k.toLowerCase());
      expect(new Set(normalized).size).toBe(out.length);
    });
  });
});
