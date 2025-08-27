import { slugify } from '../slugify';

describe('slugify', () => {
  describe('Basic functionality', () => {
    it('should convert simple text to slug', () => {
      expect(slugify('Hello World')).toBe('hello-world');
      expect(slugify('This is a Test')).toBe('this-is-a-test');
    });

    it('should handle accented characters', () => {
      expect(slugify('Café au lait')).toBe('cafe-au-lait');
      expect(slugify('Hélichryse à l\'huile')).toBe('helichryse-a-l-huile');
      expect(slugify('Bâton de fumigation')).toBe('baton-de-fumigation');
      expect(slugify('Crème régénérante')).toBe('creme-regenerante');
    });

    it('should handle special characters', () => {
      expect(slugify('Price: 10€')).toBe('price-10');
      expect(slugify('100% Natural!')).toBe('100-natural');
      expect(slugify('Email@example.com')).toBe('email-example-com');
      expect(slugify('Phone: +33 6 12 34 56 78')).toBe('phone-33-6-12-34-56-78');
    });

    it('should handle multiple spaces and hyphens', () => {
      expect(slugify('Too    many     spaces')).toBe('too-many-spaces');
      expect(slugify('Multiple---hyphens')).toBe('multiple-hyphens');
      expect(slugify('  Leading and trailing spaces  ')).toBe('leading-and-trailing-spaces');
    });

    it('should handle empty or invalid input', () => {
      expect(slugify('')).toBe('');
      expect(slugify('   ')).toBe('');
      expect(slugify('!!!')).toBe('');
      expect(slugify('---')).toBe('');
    });

    it('should handle numbers', () => {
      expect(slugify('Product 123')).toBe('product-123');
      expect(slugify('123')).toBe('123');
      expect(slugify('Version 2.0')).toBe('version-2-0');
    });

    it('should handle mixed case consistently', () => {
      expect(slugify('CamelCase')).toBe('camelcase');
      expect(slugify('UPPERCASE')).toBe('uppercase');
      expect(slugify('MiXeD CaSe')).toBe('mixed-case');
    });
  });

  describe('French text handling', () => {
    it('should handle French product names', () => {
      expect(slugify('Baume à lèvres')).toBe('baume-a-levres');
      expect(slugify('Huile d\'argan')).toBe('huile-d-argan');
      expect(slugify('Crème de jour')).toBe('creme-de-jour');
      expect(slugify('Sérum anti-âge')).toBe('serum-anti-age');
    });

    it('should handle French special characters', () => {
      expect(slugify('Œuf de Pâques')).toBe('oeuf-de-paques');
      expect(slugify('Cœur de palmier')).toBe('coeur-de-palmier');
      expect(slugify('Gruyère râpé')).toBe('gruyere-rape');
    });
  });

  describe('Edge cases', () => {
    it('should handle very long strings', () => {
      const longString = 'This is a very long product name that might exceed typical length limits but should still be properly slugified without any issues';
      const result = slugify(longString);
      expect(result).toBe('this-is-a-very-long-product-name-that-might-exceed-typical-length-limits-but-should-still-be-properly-slugified-without-any-issues');
      expect(result).not.toContain('  ');
      expect(result).not.toContain('--');
    });

    it('should handle strings with only special characters', () => {
      expect(slugify('@#$%^&*()')).toBe('');
      expect(slugify('<<<>>>')).toBe('');
      expect(slugify('{}[]|')).toBe('');
    });

    it('should handle unicode characters', () => {
      expect(slugify('こんにちは')).toBe('konnichiha');
      expect(slugify('Привет')).toBe('privet');
      expect(slugify('😀 emoji test')).toBe('emoji-test');
    });

    it('should be idempotent', () => {
      const slug = 'already-a-slug';
      expect(slugify(slug)).toBe(slug);
      expect(slugify(slugify('Test String'))).toBe('test-string');
    });
  });

  describe('Performance', () => {
    it('should handle repeated calls efficiently', () => {
      const start = Date.now();
      for (let i = 0; i < 1000; i++) {
        slugify(`Product ${i} with special chars éàù`);
      }
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // Should process 1000 strings in less than 100ms
    });
  });
});