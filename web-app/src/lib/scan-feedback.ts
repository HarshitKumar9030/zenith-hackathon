import {z} from 'zod';
export const scanFeedbackSchema=z.object({stars:z.number().int().min(1).max(5),comment:z.string().trim().max(1000).default('')}).strict();
export function feedbackAvailable(user:Record<string,unknown>,submitted:boolean){return Boolean(user.scanFeedbackEligibleAt)&&!user.scanFeedbackDismissedAt&&!submitted;}
