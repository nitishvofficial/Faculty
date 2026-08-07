const SUPABASE_URL = 'https://gduxlotlifugsvdcopep.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_LndCahcsg_FSYeoSmdgoAw_uuz2OxLT';
fetch(SUPABASE_URL + '/rest/v1/faculties?select=id,faculty_id,name,face_embedding', {
  headers: {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
  }
}).then(r => r.json()).then(data => {
  data.forEach(f => {
    let status = 'OK';
    let len = 0;
    try {
      let rawEmbedding = f.face_embedding;
      if (!rawEmbedding) status = 'NULL/MISSING';
      else {
        if (typeof rawEmbedding === 'string') rawEmbedding = JSON.parse(rawEmbedding);
        if (typeof rawEmbedding === 'object' && !Array.isArray(rawEmbedding)) rawEmbedding = Object.values(rawEmbedding);
        if (Array.isArray(rawEmbedding)) {
          len = rawEmbedding.length;
          if (len === 0) status = 'EMPTY ARRAY';
        } else {
          status = 'INVALID FORMAT';
        }
      }
    } catch(e) {
      status = 'PARSE ERROR: ' + e.message;
    }
    console.log(`Faculty: ${f.name} (ID: ${f.faculty_id}) - Embedding Status: ${status} (Length: ${len})`);
  });
}).catch(console.error);
