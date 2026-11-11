import { Platform } from 'react-native';

export const colors = {
  ink: '#0E1424',
  shelf: '#172038',
  shelfHi: '#222D4E',
  line: '#2A3659',
  mist: '#9AA6C4',
  paper: '#EAF0FF',
  verdigris: '#6EE0C4',
  rose: '#F08BA8',
};

export const serif = Platform.select({ ios: 'Georgia', default: 'serif' }) as string;

export const LANGS = [
  { label: 'All', code: null },
  { label: 'English', code: 'en' },
  { label: 'French', code: 'fr' },
  { label: 'Finnish', code: 'fi' },
  { label: 'German', code: 'de' },
] as const;

export const TOPICS = [
  { label: 'All', value: null },
  { label: 'Fiction', value: 'fiction' },
  { label: 'Children', value: 'children' },
  { label: 'Science Fiction', value: 'science fiction' },
  { label: 'Poetry', value: 'poetry' },
] as const;
