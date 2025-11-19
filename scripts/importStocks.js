import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function importStocks() {
  try {
    console.log('Reading stock.json...');
    const stockJsonPath = join(__dirname, '../public/assets/stock.json');
    let fileContent = readFileSync(stockJsonPath, 'utf-8').trim();

    if (!fileContent.startsWith('[')) {
      fileContent = '[' + fileContent;
    }
    if (!fileContent.endsWith(']')) {
      if (fileContent.endsWith(',')) {
        fileContent = fileContent.slice(0, -1) + ']';
      } else {
        fileContent = fileContent + ']';
      }
    }

    const stocksData = JSON.parse(fileContent);

    if (!Array.isArray(stocksData)) {
      console.error('stock.json is not an array');
      process.exit(1);
    }

    console.log(`Found ${stocksData.length} stocks in JSON file`);

    const batchSize = 100;
    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (let i = 0; i < stocksData.length; i += batchSize) {
      const batch = stocksData.slice(i, i + batchSize);

      const stocksToInsert = batch
        .filter(stock => stock.name && /^\d+[A-Z]?$/.test(stock.name))
        .map(stock => ({
          code: stock.name,
          name: stock.description || '',
          market: stock.exchange || 'TSE',
          industry: ''
        }));

      if (stocksToInsert.length === 0) {
        skipped += batch.length;
        continue;
      }

      const { data, error } = await supabase
        .from('stocks')
        .upsert(stocksToInsert, {
          onConflict: 'code',
          ignoreDuplicates: true
        });

      if (error) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, error.message);
        errors += stocksToInsert.length;
      } else {
        imported += stocksToInsert.length;
        console.log(`Imported batch ${i / batchSize + 1}: ${stocksToInsert.length} stocks (Total: ${imported})`);
      }
    }

    console.log('\n=== Import Summary ===');
    console.log(`Total stocks in file: ${stocksData.length}`);
    console.log(`Successfully imported: ${imported}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Errors: ${errors}`);

    const { count, error: countError } = await supabase
      .from('stocks')
      .select('*', { count: 'exact', head: true });

    if (!countError) {
      console.log(`Total stocks in database: ${count}`);
    }

  } catch (error) {
    console.error('Error importing stocks:', error);
    process.exit(1);
  }
}

importStocks();
