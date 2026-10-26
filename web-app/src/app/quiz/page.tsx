import WasteQuiz from '@/components/waste-quiz';
export const metadata={title:'EcoMitra · The waste sorting quiz',description:'Ten random photo questions. Learn to recognise everyday waste.'};
export default function QuizPage(){return <main style={{maxWidth:1100,margin:'0 auto',padding:'24px 22px'}}><nav style={{display:'flex',justifyContent:'space-between',fontSize:13,color:'#78906b'}}><a href="/quiz">EcoMitra.</a><a href="/assets/ecomitra-quiz-qr.png" download="EcoMitra-quiz-QR.png">Download quiz QR ↗</a></nav><WasteQuiz/></main>;}
