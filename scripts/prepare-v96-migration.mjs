import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';
const source=process.argv[2], outDir=process.argv[3]||'migration/output';
if(!source) throw new Error('Usage: node scripts/prepare-v96-migration.mjs <source.xlsx> [output-dir]');
fs.mkdirSync(outDir,{recursive:true});
const wb=XLSX.readFile(source,{cellDates:true,dense:false});
for(const sheet of ['Project Site','Item Master','BOM Data']) if(!wb.SheetNames.includes(sheet)) throw new Error(`Missing required sheet: ${sheet}`);
const norm=v=>String(v??'').trim();
function data(sheet,must){const grid=XLSX.utils.sheet_to_json(wb.Sheets[sheet],{header:1,defval:'',raw:false}); const i=grid.findIndex(r=>must.every(h=>r.some(c=>norm(c)===h))); if(i<0) throw new Error(`Could not locate header row in ${sheet}`); const h=grid[i].map(norm); return grid.slice(i+1).map(r=>Object.fromEntries(h.map((x,j)=>[x,r[j]??'']))).filter(r=>Object.values(r).some(v=>norm(v)));}
const pr=data('Project Site',['Site Code']), ir=data('Item Master',['Item Code','Item Name']), br=data('BOM Data',['Project Code','Item Code','Approved BOM Qty']);
const warnings=[],rejects=[];
const projects=pr.map(r=>({code:norm(r['Site Code']),name:norm(r['Site Name']||r['Site Code']),location:norm(r['Location']),manager:norm(r['Manager']||r['Project Manager']),startDate:norm(r['Start Date']),status:/closed|inactive/i.test(norm(r['Status']))?'Closed':'Active'})).filter(r=>r.code && !/^hidden$/i.test(norm(pr.find(x=>norm(x['Site Code'])===r.code)?.['Status'])));
const projectCodes=new Set(projects.map(r=>r.code));
const items=ir.map(r=>{const code=norm(r['Item Code']),unit=norm(r['Unit']); if(code&&!unit) warnings.push({type:'UOM_REVIEW',code,message:'Missing UOM; review later. Never auto-convert quantity.'}); return {code,name:norm(r['Item Name']),khmer:norm(r['Item Khmer']),type:norm(r['Type']),category:norm(r['Category']),unit:unit||'REVIEW',min:Number(r['Min Level']||0)||0,status:/inactive/i.test(norm(r['Status']))?'Inactive':'Active',uomReview:!unit};}).filter(r=>r.code);
const itemCodes=new Set(items.map(r=>r.code));
for(const code of new Set(items.map(x=>x.code).filter((c,i,a)=>a.indexOf(c)!==i))) rejects.push({type:'DUPLICATE_ITEM',code});
const num=v=>Number(String(v??'').replaceAll(',',''))||0;
const bom=br.map((r,i)=>({id:`MIG-BOM-${String(i+1).padStart(5,'0')}`,site:norm(r['Project Code']),code:norm(r['Item Code']),costCode:norm(r['QS Cost Code']||r['Cost Code Control']),approvedQty:num(r['Approved BOM Qty']),originalQty:num(r['Original BOM Qty']),approvedBy:norm(r['Approved By'])})).filter(r=>r.site&&r.code);
for(const x of bom){if(!projectCodes.has(x.site))rejects.push({type:'UNKNOWN_SITE',site:x.site,code:x.code}); if(!itemCodes.has(x.code))rejects.push({type:'UNKNOWN_ITEM',site:x.site,code:x.code}); if(x.approvedQty<0)rejects.push({type:'NEGATIVE_BOM',site:x.site,code:x.code}); if(!x.costCode)warnings.push({type:'COST_CODE_REVIEW',site:x.site,code:x.code});}
const result={generatedAt:new Date().toISOString(),source:path.basename(source),scope:['Project/Site','Item Master','BOM'],note:'Opening Current Stock is intentionally NOT generated from Excel Current Stock. It must come from verified Physical Count.',counts:{projects:projects.length,items:items.length,bom:bom.length,warnings:warnings.length,rejects:rejects.length},projects,items,bom,warnings,rejects};
fs.writeFileSync(path.join(outDir,'migration-preview.json'),JSON.stringify(result,null,2)); fs.writeFileSync(path.join(outDir,'migration-summary.txt'),[`Projects: ${projects.length}`,`Items: ${items.length}`,`BOM lines: ${bom.length}`,`Warnings: ${warnings.length}`,`Rejects: ${rejects.length}`,'Opening Stock: WAITING FOR VERIFIED PHYSICAL COUNT'].join('\n')); console.log(JSON.stringify(result.counts)); if(rejects.length)process.exitCode=2;
