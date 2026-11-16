#!/usr/bin/env node

/* eslint-disable no-undef */

/**
 * PWA ikonlarını oluşturur
 *
 * Sharp kullanarak basit placeholder ikonlar üretir.
 * Kullanım: node scripts/generate-icons.mjs
 */

import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const publicDir = join(__dirname, '..', 'public');

/**
 * Gradyan arka planlı ikon oluştur
 *
 * @param {number} size - İkon boyutu (px)
 * @param {boolean} maskable - Maskable ikon mu (güvenli alan gerekir)
 * @returns {Promise<Buffer>} - PNG buffer
 */
async function createIcon(size, maskable = false) {
  // Gradyan arka plan oluştur (mavi-mor gradyan)
  const gradient = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" fill="url(#grad)" />
    </svg>
  `;

  // Maskable için içerik merkezde %80 alanda kalmalı
  const contentSize = maskable ? size * 0.5 : size * 0.7;

  // Beyaz daire + "DP" yazısı (basit şekiller)
  const overlay = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <circle 
        cx="${size / 2}" 
        cy="${size / 2}" 
        r="${contentSize / 2}" 
        fill="white" 
        opacity="0.9"
      />
      <text
        x="${size / 2}"
        y="${size / 2 + contentSize * 0.15}"
        font-family="Arial, sans-serif"
        font-size="${contentSize * 0.4}"
        font-weight="bold"
        fill="#3b82f6"
        text-anchor="middle"
      >DP</text>
    </svg>
  `;

  // İki SVG'yi birleştir
  const combined = Buffer.from(gradient);
  const overlayBuffer = Buffer.from(overlay);

  return sharp(combined)
    .composite([{ input: overlayBuffer }])
    .png()
    .toBuffer();
}

/**
 * Tüm ikonları oluştur
 */
async function generateIcons() {
  console.log('🎨 PWA ikonları oluşturuluyor...\n');

  // public klasörü var mı kontrol et
  await mkdir(publicDir, { recursive: true });

  const icons = [
    { name: 'icon-192.png', size: 192, maskable: false },
    { name: 'icon-512.png', size: 512, maskable: false },
    { name: 'icon-512-maskable.png', size: 512, maskable: true },
    { name: 'apple-touch-icon.png', size: 180, maskable: false },
  ];

  for (const icon of icons) {
    const buffer = await createIcon(icon.size, icon.maskable);
    const outputPath = join(publicDir, icon.name);

    await sharp(buffer).toFile(outputPath);

    console.log(`✓ ${icon.name} (${icon.size}x${icon.size}${icon.maskable ? ', maskable' : ''})`);
  }

  console.log('\n✅ Tüm ikonlar oluşturuldu!');
  console.log(`📁 Konum: ${publicDir}\n`);
}

// Script çalıştır
generateIcons().catch((error) => {
  console.error('❌ Hata:', error.message);
  process.exit(1);
});
