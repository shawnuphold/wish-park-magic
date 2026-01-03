import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });
console.log('ANTHROPIC_API_KEY exists:', Boolean(process.env.ANTHROPIC_API_KEY));
console.log('First 10 chars:', process.env.ANTHROPIC_API_KEY?.substring(0, 10) || 'undefined');
