import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ptmttmqprbullvgulyhb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0bXR0bXFwcmJ1bGx2Z3VseWhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMTMyMzksImV4cCI6MjA4ODU4OTIzOX0.D_wwsIH1zNow7gTwOCVSBalWgt629ZPdKZWl4jL9SNk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
