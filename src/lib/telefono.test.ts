import { describe, expect, it } from 'vitest';
import { doveSiamo } from './telefono';

describe('da dove è aperto il villaggio', () => {
  it('riconosce iPhone, Android e computer', () => {
    expect(doveSiamo('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1')).toBe('iphone');
    expect(doveSiamo('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36')).toBe('android');
    expect(doveSiamo('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15', 0)).toBe('computer');
  });
  it('iPad che si finge Mac', () => {
    expect(doveSiamo('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15', 5)).toBe('iphone');
  });
  it('browser dentro WhatsApp, Instagram, Telegram', () => {
    expect(doveSiamo('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Instagram 350.0')).toBe('dentro-app');
    expect(doveSiamo('Mozilla/5.0 (Linux; Android 14; wv) AppleWebKit/537.36 Version/4.0 Chrome/130.0 Mobile Safari/537.36 WhatsApp/2.24')).toBe('dentro-app');
  });
});
