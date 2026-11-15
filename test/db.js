import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
export function database(path=':memory:') {
  const sql=new DatabaseSync(path);sql.exec('PRAGMA foreign_keys=ON');
  for(const file of readdirSync(new URL('../migrations/',import.meta.url)).sort())sql.exec(readFileSync(new URL('../migrations/'+file,import.meta.url),'utf8'));
  const db={sql,queries:0,maxBinds:0,prepare(query){
    const statement={values:[],bind(...values){if(values.length>100)throw new Error('D1 bind limit exceeded');if(values.some(v=>v===undefined))throw new Error('Undefined binding');db.maxBinds=Math.max(db.maxBinds,values.length);this.values=values;return this;},
      async first(){db.queries++;return sql.prepare(query).get(...this.values)??null;},
      async all(){db.queries++;return {results:sql.prepare(query).all(...this.values)};},
      async run(){db.queries++;return {meta:sql.prepare(query).run(...this.values),success:true};}};return statement;
  },async batch(statements){sql.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.all());sql.exec('COMMIT');return results;}catch(e){sql.exec('ROLLBACK');throw e;}}};
  return db;
}
