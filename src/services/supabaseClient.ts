import 'react-native-url-polyfill/auto';
import {createClient} from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gduxlotlifugsvdcopep.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_LndCahcsg_FSYeoSmdgoAw_uuz2OxLT';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
  },
});

