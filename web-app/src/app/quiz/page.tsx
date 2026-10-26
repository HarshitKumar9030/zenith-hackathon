import WasteQuiz from '@/components/waste-quiz';
export const metadata={title:'Waste sorting quiz · Waste Right',description:'Ten random photo questions. Learn to recognise everyday waste.'};
export default function QuizPage(){return <main style={{maxWidth:1100,margin:'0 auto',padding:'24px 22px'}}><nav style={{display:'flex',justifyContent:'space-between',fontSize:13,color:'#78906b'}}><a href="/">Waste Right.</a><a href="/app?view=Discovery%20Points">Discovery Points ↗</a></nav><WasteQuiz/></main>;}
