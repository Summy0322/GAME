const test=require('node:test'),assert=require('node:assert/strict');
const {audit}=require('../scripts/check-assets.cjs');
test('all migrated assets retain original bytes, exact paths and valid runtime/preload references without identical duplicates',()=>{
    const result=audit();assert.deepEqual(result.errors,[]);
    assert.equal(result.files.length,new Set(result.mapping.assets.map(row=>row.path)).size);
    assert.equal(result.bytes,result.mapping.afterBytes);
});
