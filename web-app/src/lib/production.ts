export function unverifiedSignupAllowed(env:Record<string,string|undefined>=process.env){
 return env.NODE_ENV!=='production'||env.ALLOW_UNVERIFIED_SIGNUP==='true';
}
