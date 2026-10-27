import {z} from 'zod';
export const scanFeedbackSchema=z.object({stars:z.number().int().min(1).max(5),comment:z.string().trim().max(1000).default('')}).strict();
export function feedbackAvailable(user:Record<string,unknown>,submitted:boolean){return Boolean(user.scanFeedbackEligibleAt)&&!user.scanFeedbackDismissedAt&&!submitted;}
export const stationFeedbackSchema=scanFeedbackSchema.extend({
 ticket:z.string().regex(/^[a-f0-9]{64}$/),
 name:z.string().trim().min(1).max(80).refine(value=>!/[\u0000-\u001f\u007f]/.test(value),'Enter your name.'),
 contact:z.string().trim().max(254).default('').refine(value=>!value||z.email().safeParse(value).success||/^\+?\d{7,15}$/.test(value.replace(/[\s()-]/g,'')),'Enter a valid phone number or email, or leave it blank.'),
}).strict();
