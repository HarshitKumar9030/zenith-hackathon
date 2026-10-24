await artifactSession.run(async ({presentation,session})=>{
const fs=await import('node:fs/promises');
presentation.slides.keep([]);
presentation.theme.defaultFont='Arial';
const C={ink:'#173F30',muted:'#66766D',cream:'#F6F7F1',sage:'#DFE9D5',purple:'#7770AA',lav:'#ECE9F5',white:'#FFFFFF'};
let n=0;
function text(s,t,x,y,w,h,size=28,color=C.ink,bold=false){const sh=s.shapes.add({geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});sh.text=t;sh.text.style={fontFamily:'Arial',fontSize:size,color,bold};return sh;}
function slide(title,sub='',dark=false){const s=presentation.slides.add({width:1280,height:720,background:{fill:dark?C.ink:C.cream}});n++;text(s,title,64,54,1152,110,46,dark?C.white:C.ink,true);if(sub)text(s,sub,66,164,1130,66,24,dark?'#D7E3D5':C.muted);text(s,`Waste Right     ${String(n).padStart(2,'0')}`,66,672,1000,20,12,dark?'#B9CAB8':C.muted);return s;}
async function image(s,path,x,y,w,h){s.images.add({path,alt:path.split('/').pop(),fit:'contain',position:{left:x,top:y,width:w,height:h}});}
function pair(s,a,b,y=270){for(const [i,col] of [a,b].entries()){const x=66+i*590;text(s,col[0],x,y,530,60,30,C.ink,true);text(s,col[1],x,y+76,520,230,25,C.muted);}}
function rows(s,items,y=260,gap=108){items.forEach((a,i)=>{text(s,a[0],66,y+i*gap,310,75,28,C.ink,true);text(s,a[1],390,y+i*gap,795,85,25,C.muted)})}
const root='/Users/harshit/Documents/zenith-hacakthon';

const scripts=[
[15,'Waste Right makes household waste collection easier. Residents scan and confirm their waste, helpers collect and weigh it, and proposed local hubs handle segregation and processing. Our goal is a simpler, accountable collection service.'],
[20,'Residents face confusing mixed packaging, repeated forms and unclear final charges. Collection partners need organised jobs, usable addresses and visible earnings. Even after identifying an item, someone still has to collect, weigh and route it. We connect those steps through one shared collection record.'],
[20,'The resident scans or describes the waste, corrects the suggestions and books a pickup. A helper records actual material and weight; the resident reviews the receipt. Separate helper and Operations workspaces track work, earnings and disputes. Daily confirmed scanning earns points toward pickup credits.'],
[30,'We accept both segregated and unsegregated pickups. Unsegregated loads do not require separation at home. Our proposed hubs receive, weigh and segregate the material. Suitable organics enter planned on-site composting or go to a contracted processor. Recyclables follow suitable recovery routes; contaminated or hazardous material needs separate handling. Hubs are planned operations, not facilities we claim are already running.'],
[25,'Basic starts at ten rupees with two kilograms included. Gold is 399 for fourteen monthly pickups with eight kilograms each; Platinum is 469 for twenty-four with ten kilograms each. Membership pickups include segregation. Extra weight costs three rupees per kilogram. Basic and reward mixed waste adds five rupees per measured kilogram for sorting.'],
[25,'The main app combines image understanding, packaging OCR and human confirmation. Separately, we fine-tuned an organic-waste segmentation model on 450 images. It achieved 66.13 percent foreground mean IoU on 67 held-out images. That measures region overlap, not item accuracy. The dataset is from one household and a fixed camera; phone-camera validation is still needed.'],
[20,'Our sustainability goal is measured recovery: track accepted organic material, contamination and the processing destination. We plan prompt hub sorting and controlled composting. Scaling requires dense local routes, sufficient hub capacity and worthwhile helper earnings. GOBARdhan and NAMASTE are potential partnership or support routes; no award is documented.'],
[20,'The prototype connects scanning to collection records. Revenue combines fees, subscriptions and actual recovery. The ten-rupee Basic fee leaves two rupees after base helper pay, before other costs. We seek a four-week, fifty-household pilot to test collection reliability, helper earnings and route economics.']
];
function notes(s,i,source=''){s.speakerNotes.text=`SLIDE ${i+1} / ${scripts[i][0]} seconds\n\nSAY:\n${scripts[i][1]}\n\nEVIDENCE / LIMITS:\n${source}`;}
let s=slide('Waste Right','The problem: household waste needs a simpler collection route');
text(s,'Scan. Confirm.\nGet it collected.',66,280,660,150,53,C.ink,true);
text(s,'Mixed waste, human checks\nand proposed local processing hubs',66,485,640,100,29,C.muted);
await image(s,root+'/docs/presentation-assets/final/cover.png',790,230,390,360);
notes(s,0,'Product concept from founder requirements. Illustration depicts the concept, not an operating facility. Hubs and on-site composting are proposed.');
s=slide('Pain points','Identification alone does not arrange collection');
pair(s,['Residents','Mixed packaging is confusing.\nBooking takes too many steps.\nFinal weight and fees are unclear.'],['Collection partners','Jobs need organising.\nMaterials and weight need checking.\nEarnings and dues need clear records.']);
notes(s,1,'Product problem framing from supplied requirements; no survey, market-size or adoption statistic is claimed.');
s=slide('Our solution','One record connects the resident, helper and Operations');
rows(s,[['Scan and confirm','Phone camera or description. Correct or remove mistaken suggestions.'],['Book and collect','Choose a pickup. The helper verifies material and records actual weight.'],['Review and repeat','Accept the receipt, resolve issues and earn scan-day pickup credits.']]);
notes(s,2,'Implemented prototype flow in live-camera.tsx, dashboard.tsx, quick-pickup.tsx and service APIs. One point per first confirmed India day; ten points per credit; at most two monthly. Credit covers Basic fee, not applicable extras.');
s=slide('The complete collection route','Household → collection → proposed hub → suitable destination');
rows(s,[['Receive and segregate','Accept segregated or mixed loads. Unsegregated service needs no home sorting.'],['Process suitable organics','Plan hub composting where feasible, or hand over to a processing partner.'],['Route other materials','Send suitable recyclables for recovery; isolate rejected and specialist waste.']],245,112);
text(s,'Hub facilities and processing agreements are proposed; quality and capacity need validation.',66,613,1130,38,20,C.purple,true);
notes(s,3,'Latest founder clarification: segregation for mixed pickups takes place at proposed hubs, with planned on-site composting. No operating hub, compost yield, plant capacity, processor agreement or guaranteed acceptance is asserted.');
s=slide('Plans and measured charges','Monthly passes include segregation; Basic is pay per pickup');
const values=[['','Basic','Gold','Platinum'],['Price','₹10 / pickup','₹399 / month','₹469 / month'],['Pickups','1','14 / month','24 / month'],['Included per pickup','2 kg','8 kg','10 kg']];
const table=s.tables.add({rows:values.length,columns:4,left:66,top:245,width:1148,height:230,values});table.columnWidths=[310,270,284,284];
for(let r=0;r<values.length;r++)for(let c=0;c<4;c++)table.cells.block({row:r,column:c,rowCount:1,columnCount:1}).assign({fill:r===0?C.ink:(r%2?C.white:C.sage),textStyle:{typeface:'Arial',fontSize:22,color:r===0?C.white:C.ink,bold:r===0||c===0}});
text(s,'Extra weight: ₹3/kg above the included allowance',66,507,1130,55,29,C.purple,true);
text(s,'Basic/reward mixed sorting: ₹5/kg. Evening fees: ₹5–₹7.\nHelper weighs; resident reviews the measured receipt.',66,578,1140,70,23,C.muted);
notes(s,4,'Sources: catalog.ts, pickup-pricing.ts, service.ts, docs/excess-weight.md. Monthly included limits: Gold112kg, Platinum240kg. Fractions of excess charged proportionally. Membership eligibility/monthly allowance still applies. Standard hours7am-before2pm; break2-5pm; evening5-7pm. No automatic pass renewal.');
s=slide('AI assistance, human verification','The app and trained research model have distinct roles');
pair(s,['Main app','Image understanding + packaging OCR\nResident corrects the suggestions\nHelper checks material and weight'],['Research model','450 labelled images\n67 held-out test images\n66.13% foreground mean IoU']);
text(s,'IoU is region overlap, not item accuracy. One-household data; phone validation remains.',66,606,1140,46,21,C.purple,true);
notes(s,5,'Sources: classify API; live-camera.tsx; model/training/HOUSEHOLD_V2.md; household-v2-results.json. Fine-tuned DeepLabV3 MobileNetV3-Large on Colab T4. Split315/68/67 grouped by capture day and duplicate clusters. Dataset Wolling/Pal TU Wien, CC BY4.0, https://doi.org/10.48436/27k90-dvw73 . Separate local inference service; not integrated as the main app identification model. No A/B-test win or general phone accuracy claimed.');
s=slide('Sustainability and scale','Measure recovery, then repeat a working locality model');
rows(s,[['Quality and impact','Prompt hub sorting, controlled composting and records of accepted and rejected kg.'],['Local expansion','Dense routes, sufficient hub capacity, clear helper pay and measured operating costs.'],['Public programmes','Explore GOBARdhan processing partnerships and eligible NAMASTE support.']],245,112);
text(s,'Proposed partnerships. No government award or quantified carbon saving is claimed.',66,615,1140,35,21,C.purple,true);
notes(s,6,'Operating controls are proposed, not field-tested. Composting principles: https://www.epa.gov/sustainable-management-food/composting . GOBARdhan official launch: https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=2317937&lang=2&reg=48 . NAMASTE waste-picker component: https://www.pib.gov.in/PressReleasePage.aspx?PRID=2134303&lang=2&reg=48 . Eligibility is separate from Waste Right signup. Benefits and emissions depend on actual operating conditions.');
s=slide('Next: prove the locality economics','A four-week pilot with 50 households and two helpers',true);
text(s,'Prototype built',66,267,1080,55,36,C.white,true);
text(s,'Scans, bookings, helper records, receipts and disputes',66,335,1130,60,28,'#D7E3D5');
text(s,'Revenue: pickup fees, subscriptions and actual recovery',66,394,1140,48,25,'#D7E3D5');
text(s,'₹10 fee − ₹8 base helper pay = ₹2 before other costs',66,464,1140,60,29,'#D7E3D5');
text(s,'Seeking a pilot location and processing arrangement',66,560,1140,70,33,C.white,true);
notes(s,7,'Pilot scope is a target, not traction. Revenue combines fees, passes and actual recovery proceeds; public support only after entitlement and receipt. ₹2 is not profit. Hub staff/rent, sorting, transport, processing, rejection, payment fees and overhead need costing. Helper pilot policy also includes sorting/recovery shares. Latest suite39 tests plus production build, not evidence of field outcomes.');
nodeRepl.write({slides:presentation.slides.items.length,speakingSeconds:scripts.reduce((a,b)=>a+b[0],0),scriptWords:scripts.map(x=>x[1]).join(' ').split(/\s+/).length});
const fs2=await import('node:fs/promises');
await fs2.mkdir(root+'/tmp/pdfs/three-minute',{recursive:true});
for(let i=0;i<8;i++){const b=await presentation.export({format:'png',slide:presentation.slides.getItem(i),scale:1});await fs2.writeFile(root+'/tmp/pdfs/three-minute/slide-'+String(i+1).padStart(2,'0')+'.png',new Uint8Array(await b.arrayBuffer()));}
},{artifactType:'presentation'});
