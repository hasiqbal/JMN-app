import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const constantsPath = resolve(root, 'constants/prayerNotifications.ts');
const appConfigPath = resolve(root, 'app.config.ts');

function readText(filePath) {
  return readFileSync(filePath, 'utf8');
}

function extractAdhaanSoundFiles(constantsText) {
  const matches = [...constantsText.matchAll(/soundFile:\s*'([^']+)'/g)];
  return matches.map((match) => match[1]);
}

function extractIqamahSoundFile(constantsText) {
  const match = constantsText.match(/IQAMAH_SOUND_FILE\s*=\s*'([^']+)'/);
  return match?.[1] ?? null;
}

function extractWhitelistedNotificationSounds(appConfigText) {
  const soundsBlock = appConfigText.match(/sounds:\s*\[([\s\S]*?)\]/);
  if (!soundsBlock) return [];

  const fileMatches = [...soundsBlock[1].matchAll(/\.\/assets\/audio\/([^'"\s,]+\.mp3)/g)];
  return fileMatches.map((match) => match[1]);
}

const constantsText = readText(constantsPath);
const appConfigText = readText(appConfigPath);

const adhaanSoundFiles = extractAdhaanSoundFiles(constantsText);
const iqamahSoundFile = extractIqamahSoundFile(constantsText);
const expected = new Set([...adhaanSoundFiles, ...(iqamahSoundFile ? [iqamahSoundFile] : [])]);
const whitelisted = new Set(extractWhitelistedNotificationSounds(appConfigText));

const missingFromWhitelist = [...expected].filter((soundFile) => !whitelisted.has(soundFile));
const notUsedByPrayerNotifications = [...whitelisted].filter((soundFile) => !expected.has(soundFile));

if (expected.size === 0) {
  console.error('[verify-notification-sounds] No prayer notification sounds found in constants/prayerNotifications.ts');
  process.exit(1);
}

if (missingFromWhitelist.length || notUsedByPrayerNotifications.length) {
  if (missingFromWhitelist.length) {
    console.error('[verify-notification-sounds] Missing from expo-notifications sounds whitelist:', missingFromWhitelist.join(', '));
  }
  if (notUsedByPrayerNotifications.length) {
    console.error('[verify-notification-sounds] Whitelisted but unused by prayer notifications:', notUsedByPrayerNotifications.join(', '));
  }
  process.exit(1);
}

console.log('[verify-notification-sounds] OK:', [...expected].join(', '));
