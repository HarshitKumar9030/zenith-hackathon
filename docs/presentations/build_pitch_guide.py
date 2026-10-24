"""Build the presenter guide using ReportLab; run from the repository root."""
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZipFile
from html import escape
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'output/pdf/Waste-Right-Presenter-Guide.pdf'
OUT.parent.mkdir(parents=True,exist_ok=True)
for name,file in [('Noto','NotoSans-Regular.ttf'),('NotoBold','NotoSans-Bold.ttf')]:
 pdfmetrics.registerFont(TTFont(name,str(ROOT/'web-app/src/assets'/file)))
INK='#173F30';MUTED='#617169';PURPLE='#66538F';CREAM='#F7F8F2';TEAL='#008C7E'
W,H=595.28,841.89
c=canvas.Canvas(str(OUT),pagesize=(W,H));c.setTitle('Waste Right | Presenter guide');c.setAuthor('Waste Right')
page_no=0

def para(text,x,y,width,size=11,color=INK,bold=False,leading=None):
 st=ParagraphStyle('p',fontName='NotoBold' if bold else 'Noto',fontSize=size,leading=leading or size*1.48,textColor=HexColor(color),spaceAfter=0)
 p=Paragraph(escape(text).replace('\n','<br/>'),st);_,h=p.wrap(width,1000)
 assert y-h>48,(page_no,text[:50],y,h)
 p.drawOn(c,x,y-h);return y-h

def line(label,text,y,size=10.5):
 y=para(label.upper(),44,y,507,8,PURPLE,True)-8
 return para(text,44,y,507,size)-17

def new(title,sub=''):
 global page_no
 if page_no:c.showPage()
 page_no+=1;c.bookmarkPage(f'page-{page_no}');c.addOutlineEntry(title.replace('\n',' '),f'page-{page_no}',level=0);c.setFillColor(HexColor(CREAM));c.rect(0,0,W,H,fill=1,stroke=0)
 c.setFillColor(HexColor(TEAL));c.rect(44,H-44,38,4,fill=1,stroke=0)
 para('WASTE RIGHT / PRESENTER GUIDE',96,H-37,440,8,MUTED,True)
 y=para(title,44,H-75,507,25,INK,True)
 if sub:y=para(sub,44,y-12,507,10.5,MUTED)
 c.setStrokeColor(HexColor('#D9E1D5'));c.line(44,48,W-44,48)
 c.setFont('Noto',8);c.setFillColor(HexColor(MUTED));c.drawString(44,30,'24 OCTOBER 2026  •  SPEAKER COPY');c.drawRightString(W-44,30,f'{page_no:02d}')
 return y-27

def block(title,body,y):return line(title,body,y)

# Goal, speakable script, visual cue, transition, accuracy guard, seconds.
S=[
('Introduce the service in one sentence.','Waste Right helps households get waste collected without having to identify every material themselves. A phone scan starts the process, the resident confirms the items, and a helper collects and weighs them. Our proposed hubs then segregate mixed loads and route suitable materials into recovery or processing.','Look at the audience, not the cover. Pause after the project name.','First, here is the problem we are solving.','Hubs and composting facilities are proposed, not demonstrated operating assets.',15),
('Define a specific household problem.','A household can have food scraps, a plastic container and mixed packaging in the same bag. Knowing what each item is does not by itself arrange collection or prove where the material goes. We are building a simpler connection between the household, collection work and processing.','Use one familiar waste example; avoid invented national statistics.','That creates problems on both sides of the pickup.','This is problem framing, not a completed customer survey.',20),
('Explain resident and helper pain separately.','Residents face confusing materials, repeated forms and uncertain charges. Collection partners need clear jobs, usable addresses, measured receipts and visible earnings. Waste Right connects these needs through one collection record rather than asking either side to manage everything independently.','Point first to residents, then to collection partners.','Our features directly address those points.','Do not claim a measured percentage of effort saved.',20),
('Connect features to specific problems.','The camera and description options make it easier to start. Confirmation lets the resident correct the suggestions. Scheduling reuses collection details and shows charges. Helpers record weight, residents review the receipt, and Operations handles payment records and disputes. The value is the complete workflow.','Name the problem before each feature.','Here is how the whole service connects.','AI suggestions are not final physical verification.',20),
('Explain the complete chain, including the latest hub model.','The resident scans, confirms and schedules. A helper collects and records weight. Segregated loads are checked; unsegregated loads go to a proposed hub for sorting. Suitable organics enter planned hub composting or a processing partner. Recyclables and unsuitable items follow separate routes. Records connect the stages.','Trace resident to helper to hub to destination with your hand.','Let us walk through the resident experience.','The slide predates the explicit hub model. Explain this updated chain verbally.',25),
('Show that the resident flow is short.','The resident uses the live camera or a description, confirms what is present, and chooses collection details. They do not need a weighing scale. The helper records actual weight later, and the resident can review the resulting charges and report a problem. Saved details reduce repeat form filling.','If demonstrating, show one flow rather than every settings option.','The confirmation step is important because AI can be wrong.','Do not promise instant collection; availability still matters.',20),
('Show human control over AI.','AI suggests likely items and materials, but the resident can remove a mistaken suggestion or correct mixed materials. This matters when a frame is unclear or packaging hides contents. At collection, the helper checks what is physically present and measures weight. Each person has a clear responsibility.','Mention the remove-item control.','Here is a simple mixed-waste example.','Neither AI nor a photograph establishes chemical safety or microbial quality.',20),
('Explain mixed collection without forcing home segregation.','Imagine fruit scraps and a plastic food container together. The app can suggest both, and the resident confirms them. If they choose unsegregated pickup, they do not have to separate the materials at home. The hub handles segregation and checks whether the recovered organic fraction is suitable for processing.','Explicitly correct the older slide phrase about keeping materials separate.','The next question is where each material goes.','Home segregation is optional for the unsegregated service.',20),
('Make the hub model easy to understand.','Our proposed hubs receive and weigh incoming loads, segregate mixed material and record accepted fractions. We plan on-site composting where space, process controls and approvals permit it. Suitable organics can also go to a contracted biogas partner. Recyclables go to suitable buyers; hazardous items need specialist handling.','Say household, hub, processing and destination in that order.','That operating model is supported by these service plans.','Do not imply all collected organic material becomes saleable compost.',25),
('State the current prices without ambiguity.','Basic starts at ₹10 and includes 2 kg. Gold is ₹399 for 14 pickups a month, with 8 kg included per pickup. Platinum is ₹469 for 24 pickups, with 10 kg included. Membership pickups include segregation. Extra weight above the per-pickup allowance costs ₹3 per kg after helper weighing.','Read prices slowly; point to the relevant table column.','Now I will separate the base fee from possible extra charges.','The deck table predates paid excess weight. Limits are included allowances, not universal hard stops.',30),
('Explain the final bill with one example.','Basic and reward pickups add ₹5 per kg for unsegregated waste; membership pickups include segregation. Extra weight costs ₹3 per kg above the included allowance. In standard hours, 3 kg of segregated Basic waste costs ₹10 plus ₹3, or ₹13. The resident reviews measured additions before payment.','Use only one example, then pause.','The helper workflow makes that measurement and receipt possible.','Evening fees remain separate: ₹5-₹7 between 5 and 7 pm; no pickup from 2 to 5 pm.',25),
('Show that helpers have a purpose-built workspace.','Helpers have their own collection workspace, with English and Hindi support. They can find jobs, review collection details, accept work and record weight. Search and grid or list layouts make the queue easier to navigate. Operations approval is required before someone can work as a collector.','Identify the queue and weight-entry step in the screenshot.','We also make their compensation visible.','The screenshot contains synthetic records, not customer traction.',20),
('Explain helper pay honestly.','Our pilot policy records ₹8 base pay per completed pickup, plus half of sorting service value and 40 percent of positive net recovery. Earned pay, recorded payments and outstanding amounts are shown separately. These rates still need field validation against route time, travel costs and actual take-home earnings.','Emphasise earned, paid and due as three different values.','Operations coordinates those records and resolves exceptions.','₹8 is per pickup, not a claim of an adequate hourly wage. Payment recording is not a bank transfer.',25),
('Make Operations understandable.','Operations manages collections, helper approvals, payment records and issues. It can review one collection at a time, record an actual transfer and account for buyer proceeds and direct costs. This separates household convenience from the administrative work needed to deliver the service reliably.','Do not read internal field names aloud.','Residents also get a reason to keep participating.','Recording a transfer reference does not move money.',20),
('Explain rewards without encouraging more waste.','A resident earns one point on the first confirmed scan day. Ten points unlock a Basic pickup credit, with up to two redemptions per calendar month. We reward participation, not the amount of waste produced. The credit covers the Basic collection fee; applicable sorting, excess weight and evening charges remain.','Say first scan day, not every scan.','Participation also creates a useful personal record.','Repeated scans on one day do not multiply points.',20),
('Describe the certificate accurately.','After a qualifying completed organic collection, the resident can download a Waste Right participation record. It includes their account name, participation ID, completed organic pickups and helper-recorded organic weight. It gives the resident a record of activity without turning an unverified environmental estimate into an official credential.','Point to issuer, ID and measured totals.','The service also needs sustainable financial support.','Waste Right is the issuer. No government issuance, Aadhaar linkage or DigiLocker verification is active.',20),
('Explain revenue sources, not profit claims.','The model combines Basic pickup fees, monthly passes and actual material recovery income. We must subtract collection, sorting, transport, processing, payment and overhead costs. Public support is additional only when eligibility is established and money is actually received. A grant is not recurring customer revenue.','Name three ordinary revenue sources before discussing support.','A ₹10 pickup shows why cost discipline matters.','Do not count a processor’s full gas or compost sales as our revenue without an agreement.',25),
('Own the difficult economics.','A ₹10 Basic fee minus ₹8 base helper pay leaves ₹2 before other costs. That is not profit. Our pilot must test whether dense routes, subscription income and actual recovery cover the remaining costs. Hub staffing, composting, rent, rejected waste and working capital must be part of the calculation.','Pause after saying that is not profit.','Partnerships may help, but they are not assumptions we can treat as cash.','Do not defend affordability by inventing a government payment per kg.',25),
('Position GOBARdhan as a potential processing route.','GOBARdhan is relevant to the proposed biogas-partner route and feedstock aggregation. We would need agreed acceptance terms, the relevant eligibility and approvals, and a documented commercial or public arrangement. Our near-term role is collection and aggregation; the programme itself does not prove that Waste Right has an award.','Keep programme context short.','Other public routes have different purposes and conditions.','A composting hub is not automatically an eligible CBG project. See official source [1].',20),
('Handle historical funding without distracting the pitch.','Municipal service arrangements and competitive startup awards are separate opportunities. The ₹25 lakh Swachhata Startup Challenge reference is a historical 2022 competition, not money secured by Waste Right. We would verify any new call and local procurement route before treating it as an opportunity.','Optional slide: skip in a short pitch.','Any actual support needs transparent accounting.','Removed landing-page cards do not change this historical deck reference. Do not call the 2022 window open.',15),
('Separate the government scheme from company benefit policy.','Our policy would allocate half of attributable support actually received to the resident as a recorded credit. That is a Waste Right allocation policy, not a government-set entitlement. The published MDA reference concerns eligible fertiliser output, not raw household input waste; current continuation and terms require confirmation.','Distinguish support received from projected support.','Collection partners also need support beyond a per-pickup rate.','MDA’s March 2026 update said the scheme was concluding that year. See [2].',20),
('Address social sustainability.','Alongside clear pay records, our operating plan needs safety equipment, training and accessible dispute handling. Eligible waste pickers may access NAMASTE benefits through the official validation process. Signing up in Waste Right does not automatically enrol a helper or establish eligibility for government benefits.','Keep the focus on workers, not the scheme name.','Now I will explain what AI does in this service.','Use potential or eligibility-based support, not guaranteed benefits. See [3].',20),
('Explain the app AI in plain words.','The main app uses image understanding to suggest materials and OCR to read visible packaging text. The resident reviews those suggestions. AI helps organise a collection, but it does not weigh the waste, verify freshness or replace hub inspection. The physical handover remains a human-verified step.','Avoid an unverified provider version name.','Separately, we have trained an organic-waste research model.','Keep the main app provider path distinct from the trained model service.',25),
('Present the trained model with its real limitations.','We fine-tuned DeepLabV3 with a MobileNetV3-Large backbone to segment organic regions and visible contaminants. The dataset has 450 labelled images; 67 were held out for testing. Foreground mean IoU was 66.13 percent. IoU measures region overlap, not item accuracy. The data is from one household and a fixed camera.','Explain IoU before saying the number if the audience is nontechnical.','The architecture lets us evaluate the research model separately.','No phone-camera generalisation, cross-household validation or A/B-test win has been established.',30),
('Explain architecture only as needed.','The web app connects residents, helpers and Operations. MongoDB stores accounts and collection records. Image understanding and OCR support the scan flow. Our trained model runs through a separate inference API, so it can be evaluated and improved before replacing any part of the main identification path.','Avoid listing every library; explain separation of responsibilities.','Here is what the prototype proves today.','A local inference service is not evidence of a deployed production model.',20),
('Distinguish a working prototype from a live service.','The prototype includes scanning, confirmation, scheduling, helper records, receipts, disputes and certificates. The latest code has 39 passing automated tests and a production build. Those checks do not prove field reliability, real payment delivery or phone-camera performance. Live operations, processor agreements and a locality pilot remain next steps.','Mention the newer 39-test count rather than the slide’s older 31.','The pilot is designed to test those remaining questions.','Physical phone switching and end-to-end live financial operations are not claimed verified.',25),
('Present a measurable pilot, not invented traction.','We propose one campus or housing cluster, 50 households, two approved helpers and a four-week pilot. We will measure reliability, route time, accepted material, rejection rate, repeat use and disputes. We will also calculate helper hourly take-home and contribution after direct costs before deciding whether to expand.','Stress proposed targets.','That leads to our specific request.','These are planned targets, not current users or results.',25),
('Finish with a clear request.','We are seeking a pilot location, collection partners and a suitable processing arrangement. We want to demonstrate reliable pickups, worthwhile helper earnings and accountable material handling in one locality. With those results, we can decide whether and how to repeat the model in nearby areas. Thank you.','Stop speaking. Let the ask remain on screen.','Invite questions if the format permits.','Do not append an uncosted investment ask or claim signed partners.',20),
('Use as a reference, not the main narrative.','This appendix contains the detailed reward, history and certificate rules. I can explain a specific rule if useful. The main principle is that rewards follow confirmed participation and financial benefits need a completed, accepted record.','Open only when asked about a rule.','Return to the relevant example or closing slide.','Reward credits do not waive extra-weight, sorting or evening charges.',0),
('Use one arithmetic example to resolve a question.','For a standard-hour 3 kg mixed Basic pickup, the base fee is ₹10, hub sorting is ₹15 and excess weight is ₹3, making ₹28 before any applicable evening fee. For a Gold 9 kg pickup, segregation is included and the extra 1 kg costs ₹3.','Use these updated examples, which supplement the older appendix.','Does that clarify the charge breakdown?','Examples are policy calculations, not actual transactions. Recovery shares apply to the defined positive net pool.',0),
('Make evidence available without reading a bibliography.','The source notes distinguish application policy, model evaluation and official programme references. We have deliberately separated prototype functions from proposed operating facilities and funding. We can show the supporting record for a specific figure rather than treating every claim as already proven.','Keep this as backup.','Return to the closing ask if the session is ending.','Sources support programme facts, not a claim of Waste Right selection or endorsement.',0),
]
assert len(S)==31
with ZipFile(ROOT/'docs/presentations/Waste-Right-Complete-Pitch-2026-10-24.pptx') as z:
 titles=[]
 for i in range(1,32):
  el=ET.fromstring(z.read(f'ppt/slides/slide{i}.xml'));titles.append(el.find('.//{http://schemas.openxmlformats.org/drawingml/2006/main}t').text)

y=new('Pitch the service.\nExplain the proof.','A practical speaking guide for the 31-slide Waste Right presentation')
y=para('Waste Right',44,y-30,507,42,TEAL,True)-28
y=para('Slide-by-slide scripts, transitions, timing, a demo route and judge-question preparation.',44,y,470,19)-30
y=line('Your central message','A low-effort household collection service, supported by human checks and proposed local segregation and processing hubs.',y,14)
y=line('How to use this guide','Read the briefing first. Rehearse the scripts aloud, then replace exact wording with your own natural phrasing. Keep the factual distinctions and numbers intact.',y)
y=line('Current as of','24 October 2026. Uses the current ₹10 / ₹399 / ₹469 catalog and the latest ₹3/kg excess-weight rule.',y)
y=line('Designed for','A self-contained judging presentation. Short-route options are included; the appendices are reference material, not compulsory speaking time.',y)

y=new('Before you rehearse','The operating model has changed since the deck was exported')
for a,b in [
('1 / State the hub model','Unsegregated pickup does not require household segregation. Mixed waste is sorted at proposed hubs; suitable organics may enter planned on-site composting or go to a processing partner. Explain this on slides 5, 8 and 9.'),
('2 / Clarify included weight','Slides 10, 11, 29 and 30 predate the ₹3/kg excess rule. Present 2/8/10 kg as included per-pickup allowances. Fractions are proportional; the helper measures and the resident approves the receipt. Monthly plan eligibility still applies.'),
('3 / Keep implementation separate','The app is a prototype. Hub facilities, field operations, compost quality, processor contracts and economics need operational validation. Say proposed when describing facilities that are not operating.'),
('4 / Keep AI paths separate','Main app: image understanding plus OCR and human review. Research: separate trained segmentation model. Do not imply the trained model already powers the main app.'),
('5 / Update the evidence count','Slide 26 says 31 tests; the latest code passes 39. No formal A/B test, live bank-transfer verification or physical-phone validation is claimed.'),
('6 / Do not imply an official credential','The certificate is issued by Waste Right using the account-profile name. Government partnership, grant award, Aadhaar linking and DigiLocker verification are not established.')]:y=block(a,b,y)

y=new('Choose a route and keep time','The slide numbers match the current complete pitch')
for a,b in [
('Full walkthrough / about 12 minutes','Slides 1-28 take about 10 minutes 15 seconds at the suggested timings, with roughly 1 minute 45 seconds for pauses and navigation. Reserve 29-31 for questions. A live demo requires additional time or fewer slides.'),
('Five-minute route / 4:45 speaking + 0:15 buffer','1 (15s), 2 (20s), 3 (20s), 4 (20s), 5 (25s), 9 (25s), 10 (30s), 18 (25s), 23 (25s), 24 (30s), 27 (25s), 28 (25s). Explain fees briefly on slide 10. Practise the slide jumps in advance.'),
('Three-minute route / 2:50 speaking + 0:10 buffer','1 (15s), 2 (20s), 5 (25s), 9 (25s), 10 (25s), 24 (20s), 27 (20s), 28 (20s). Use plain language and one AI result; do not attempt an app demo.'),
('When nobody will ask questions','Include the hub flow, fees, who confirms weight, the AI limitation, revenue logic and the pilot ask within the main route. Do not hide essential facts in the appendix.'),
('Speaking roles','One speaker is simplest. If sharing: speaker A handles problem and resident flow; B handles hubs, pricing and operations; C handles AI, validation and the ask. Introduce the next subject rather than saying over to my teammate.'),
('Page map','Pages 4-19: every slide. Page 20: hub quality and sustainability. Pages 21-23: judge questions. Page 24: demo. Page 25: rehearsal and fallback. Page 26: evidence.')]:y=block(a,b,y)

for start in range(0,31,2):
 y=new(f'Speaking notes / {start+1:02d}-{min(start+2,31):02d}','Suggested words, delivery cues and transitions')
 for j in range(start,min(start+2,31)):
  goal,script,cue,transition,guard,secs=S[j]
  y=para(f'{j+1:02d}  {titles[j]}',44,y,507,15,INK,True)-8
  y=para(('REFERENCE ONLY' if secs==0 else f'{secs} SECONDS')+'  /  '+goal,44,y,507,9,PURPLE,True)-11
  y=para(script,44,y,507,10.8)-12
  y=para('Delivery: '+cue+'  Next: '+transition,44,y,507,9.5,MUTED)-10
  y=para('Keep accurate: '+guard,44,y,507,9.2,PURPLE)-24

y=new('Explain the hub and sustainability','Use when asked how mixed organic waste stays suitable for processing')
for a,b in [
('The short answer','We accept both segregated and unsegregated household loads. Our proposed hubs separate mixed material promptly, inspect the organic fraction and direct suitable feedstock to controlled composting or a contracted processor. We track acceptance and rejection rather than assuming everything collected is recovered.'),
('Receiving and sorting','Plan separate receiving, segregation, composting and finished-product areas. Use covered, leak-resistant collection containers and keep hazardous materials away from ordinary organics. Visible sorting does not establish chemical or microbial safety.'),
('Time and process control','Propose short collection-to-sorting times and record arrival, segregation and processing timestamps. Set realistic operating targets with the hub operator; do not guarantee freshness or same-day processing before capacity is proven. Composting requires moisture, oxygen, temperature and feedstock-balance control [4].'),
('Compost versus biogas','Composting is aerobic processing that produces a stable soil amendment. Biogas comes from anaerobic digestion; digestate is not automatically finished compost. Keep the two routes distinct and follow the receiving process’s feedstock requirements [4].'),
('Impact measures','Measure processor-accepted kg, contamination and rejection rates, transport km per accepted kg, processing time, usable output and complaints. Do not quote carbon savings without a defined baseline and defensible calculation.'),
('Scaling answer','Repeat local clusters only when collection density, hub capacity, lawful operating arrangements, processor demand, helper earnings and contribution are acceptable. A scalable app cannot remove a physical hub bottleneck.')]:y=block(a,b,y)

y=new('Judge questions / AI and product','Answer directly, then give one supporting fact')
for a,b in [
('What is actually new?','Our proposed value is the connection between low-effort identification, resident correction, collection, hub sorting and accountable receipts. We have not completed a competitor study proving that no other service does this.'),
('Why use AI if people confirm it?','AI reduces the blank-page effort by suggesting what is visible. Resident and helper review address uncertainty that a photograph cannot resolve. The aim is assistance, not autonomous safety certification.'),
('What did you train?','A pretrained DeepLabV3 model with MobileNetV3-Large backbone, fine-tuned for organic/background/visible-contaminant segmentation on Google Colab with a T4 GPU. Split: 315 train, 68 validation, 67 test [5].'),
('What does 66.13% mean?','Foreground mean IoU is the average region-overlap score for organic waste and contaminants. Organic IoU was 70.30%; contaminant IoU was 61.97%. It is not a 66.13% correct-item rate. Do not call it general phone-camera accuracy [5].'),
('How independent was the test?','Capture days and duplicate clusters were grouped to reduce leakage, but all data came from one household and fixed camera. New-household and phone-camera evaluation are still needed. No formal A/B test has been completed [5].'),
('What if AI or the network fails?','The resident can describe the waste or correct a suggestion. A scan should not establish weight, freshness or chemical safety. The helper and hub still need physical checks. Explain the actual fallback rather than promising offline AI.')]:y=block(a,b,y)

y=new('Judge questions / money and workers','Explain the pool, the costs and the limits')
for a,b in [
('How do you make money at ₹10?','₹10 minus ₹8 base helper pay leaves ₹2 before other costs. Revenue also includes subscriptions and actual recovery proceeds. The pilot must establish whether route density and those revenues cover transport, hubs, sorting, processing, payments and overhead. We do not yet claim proven margins.'),
('Why would anyone buy a plan?','Gold and Platinum offer higher included weight, recurring pickups and included segregation. They are not necessarily cheaper per pickup than Basic. At full use, Gold costs ₹28.50 per included pickup; Platinum about ₹19.54. Explain service differences rather than claiming universal savings.'),
('How do you pay helpers fairly?','The pilot policy is ₹8 per completed pickup, plus 50% of sorting service value and 40% of positive net recovery. We must measure hours, route costs and work intensity before calling that fair hourly pay. Segregation at hubs also needs a separately costed staffing arrangement; do not automatically attribute hub labour to the collecting helper.'),
('How does extra weight work?','Basic/reward include 2 kg, Gold 8 kg and Platinum 10 kg per pickup. Additional measured weight costs ₹3/kg proportionally. A standard-hour 3 kg mixed Basic load costs ₹10 base + ₹15 sorting + ₹3 excess = ₹28. The resident approves the measured receipt [6].'),
('How are recovery proceeds divided?','Use the defined positive net pool after agreed direct costs: helper 40%, Gold resident 10% or Platinum resident 15%, with the remainder still subject to other business costs. Do not subtract helper pay twice or present gross material sales as net profit.'),
('What is the biggest business risk?','Insufficient collection density or costly hub handling could make low-priced pickups uneconomic. Start with one locality and use measured route contribution and helper take-home as expansion gates. Paid excess and sorting charges are revenue, not automatic margin.')]:y=block(a,b,y)

y=new('Judge questions / schemes and trust','Keep public programmes separate from awarded support')
for a,b in [
('Are you government-approved or a PPP?','We are pursuing suitable partnerships. No executed public agreement or award is documented. Scheme alignment does not establish PPP status, government ownership or endorsement. Do not substitute assumed approval for evidence.'),
('What is GOBARdhan’s role?','It is a potential framework for the biogas-partner and feedstock-aggregation route. Eligibility and the commercial arrangement need confirmation. Do not say the government pays our app for every kg of collected kitchen waste [1].'),
('Is the ₹25 lakh grant yours?','No. The deck references a historical 2022 Swachhata Startup Challenge. No Waste Right selection or current application call is verified. The front page intentionally shows only organic processing and safer collection work; the old award is not core revenue.'),
('Who receives the 50% benefit?','Our policy allocates 50% of attributable support actually received to the resident as a recorded credit after the relevant qualifying activity and records. This is a company policy, not a promised government entitlement. MDA concerns eligible fertiliser output, and continuation requires confirmation [2].'),
('Is the certificate linked to Aadhaar?','No. The downloadable participation record is independently issued by Waste Right using the account name and qualifying collection records. DigiLocker requester onboarding is not approved. Do not show or request a real Aadhaar number in the demo.'),
('What if waste is contaminated or a resident disputes it?','The resident can dispute the collection receipt. At the proposed hub, contamination requires re-sorting, rejection or specialist handling as appropriate. Record accepted and rejected fractions; do not promise all mixed waste can become safe compost.')]:y=block(a,b,y)

y=new('A focused two-minute demo','Use synthetic records and a known-good example')
for a,b in [
('Before starting','Open the app, sign in with a prepared demo account and confirm the role. Test HTTPS/localhost camera permission and network access. Have a clear image of fruit scraps plus a plastic container and a text-description fallback. Keep payment credentials and personal addresses off the projector.'),
('0:00-0:30 / Start and identify','Open Identify waste. Show the phone camera and Flip camera if available on the actual device. Frame the items, then scan deliberately. Say that camera permission is required; do not force a physical-phone demonstration that has not been checked.'),
('0:30-1:00 / Confirm and schedule','Correct or remove one suggestion, confirm the list and move directly to scheduling. Choose saved collection details and a valid time. Show the included allowance and ₹3/kg extra-weight disclosure. Explain that mixed material is sorted at the proposed hub.'),
('1:00-1:30 / Helper and receipt','Switch to a prepared helper record. Show collection details, net weighing and the receipt. Use a clearly synthetic completed example if the live status cannot be advanced naturally. Never impersonate an independent customer or pretend a bank transfer happened.'),
('1:30-2:00 / Close the loop','Show resident history, an itemised receipt and a qualifying participation certificate. State that payment integration and records are prototype functions; do not perform a live charge. End with the pilot ask.'),
('If anything fails','Allow one short retry. Switch to the prepared description or screenshot and explain the intended next step. Do not spend the judging slot debugging. A failed live call does not change the stated test results or prove the whole service works.')]:y=block(a,b,y)

y=new('Rehearse for clarity','The final check is whether someone can explain the model back to you')
for a,b in [
('Pass 1 / Accuracy','Read the guide beside the deck. Correct the spoken treatment of hubs, mixed collection, ₹3/kg excess, government status and the independent certificate. Check current plan prices in the app. Leave no unresolved conflict between what a slide shows and what you say.'),
('Pass 2 / Time','Record a full run with actual slide changes. Aim for 120-140 spoken words per minute, leaving room for numbers and pauses. If over time, cut a slide or example; do not rush every sentence. Use the short route appropriate to the event.'),
('Pass 3 / Challenge','Have a teammate ask: who pays whom, where sorting happens, what happens to rejected waste, why subscribe, what 66.13% means, and whether government money is secured. Each answer should start with a direct sentence, then one supporting detail.'),
('Numbers to memorise','₹10 / 2 kg Basic. ₹399 / 14 pickups / 8 kg Gold. ₹469 / 24 pickups / 10 kg Platinum. ₹3/kg excess. ₹5/kg mixed sorting for Basic/reward. Ten points per credit, at most two monthly. Model: 450 images, 67 test, 66.13% foreground mean IoU.'),
('Opening and closing','Opening: Waste Right makes household collection easier through AI-assisted identification and human verification. Closing: We are seeking a locality pilot to prove reliable pickups, worthwhile helper earnings and accountable processing at a sustainable cost.'),
('Language to keep','Say prototype, proposed hub, measured weight, accepted material, pilot target, actual support received and separate research model. Avoid guaranteed profit, fully accurate AI, government-issued certificate, zero waste and every kg becomes compost.')]:y=block(a,b,y)

y=new('Evidence and preparation references','Use these to verify answers; do not read this page aloud')
refs=[
('[1] GOBARdhan / MoPNG, 1 October 2026','https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=2317937&lang=2&reg=48'),
('[2] MDA / Department of Fertilizers, 10 March 2026','https://www.pib.gov.in/PressReleasePage.aspx?PRID=2237444&lang=2&reg=48'),
('[3] NAMASTE waste-picker component / MoSJE','https://www.pib.gov.in/PressReleasePage.aspx?PRID=2134303&lang=2&reg=48'),
('[4] Composting principles / US EPA','https://www.epa.gov/sustainable-management-food/composting'),
('[5] Model evaluation and dataset','model/training/HOUSEHOLD_V2.md; household-v2-results.json. Dataset attribution: Wolling and Pal, TU Wien, CC BY 4.0. https://doi.org/10.48436/27k90-dvw73'),
('[6] Current product policies','web-app/src/lib/catalog.ts; pickup-pricing.ts; helper-pay.ts; service.ts. docs/excess-weight.md; camera-switching.md; savings-participation.md; government-programmes.md.'),
('Deck used','docs/presentations/Waste-Right-Complete-Pitch-2026-10-24.pptx, 31 slides. This guide supplements later hub and pricing updates; it does not modify the deck.'),
('Evidence boundaries','Programme sources do not establish a Waste Right award. Prototype tests do not establish field outcomes. Scripts are suggested speaking language, not a record of customer traction. Review official terms again before making an application or financial commitment.'),
]
for a,b in refs:y=line(a,b,y,9.5)
assert page_no==26,page_no
c.save()
print(str(OUT));print('Pages:',page_no)
