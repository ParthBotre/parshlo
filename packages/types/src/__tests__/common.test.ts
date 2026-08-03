import { describe, expect, it } from 'vitest';

import { Gstin, IndianMobile, IndianPin, OptionalIndianPin, Pan } from '../common.js';

describe('GSTIN validation', () => {
  it('accepts a valid GSTIN', () => {
    expect(Gstin.parse('27aapfu0939f1zv')).toBe('27AAPFU0939F1ZV');
  });

  it('rejects malformed GSTIN', () => {
    expect(() => Gstin.parse('INVALID-GST')).toThrow();
    expect(() => Gstin.parse('27AAPFU0939F1Z')).toThrow(); // too short
  });
});

describe('PAN validation', () => {
  it('accepts a valid PAN', () => {
    expect(Pan.parse('aapfu0939f')).toBe('AAPFU0939F');
  });
  it('rejects malformed PAN', () => {
    expect(() => Pan.parse('AAPFU0939')).toThrow();
    expect(() => Pan.parse('AAPF0U939F')).toThrow();
  });
});

describe('IndianMobile validation', () => {
  it('accepts 10-digit', () => {
    expect(IndianMobile.parse('9876543210')).toBe('9876543210');
  });
  it('accepts +91 prefix', () => {
    expect(IndianMobile.parse('+91 9876543210')).toBe('+91 9876543210');
  });
  it('rejects bad numbers', () => {
    expect(() => IndianMobile.parse('1234567890')).toThrow(); // can't start with 1
    expect(() => IndianMobile.parse('98765')).toThrow();
  });
});

describe('IndianPin validation', () => {
  it('accepts 6-digit PIN', () => {
    expect(IndianPin.parse('560001')).toBe('560001');
  });
  it('allows optional PIN to be omitted or blank', () => {
    expect(OptionalIndianPin.parse(undefined)).toBeUndefined();
    expect(OptionalIndianPin.parse('')).toBe('');
    expect(OptionalIndianPin.parse(' 560001 ')).toBe('560001');
  });
  it('rejects bad PIN', () => {
    expect(() => IndianPin.parse('060001')).toThrow();
    expect(() => IndianPin.parse('56000')).toThrow();
    expect(() => OptionalIndianPin.parse('56000')).toThrow();
  });
});
