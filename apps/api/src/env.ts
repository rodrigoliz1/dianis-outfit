import * as dotenv from 'dotenv';
import path from 'path';

// Load from root workspace
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
// Load API specific env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
