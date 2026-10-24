export type CameraFacing = 'user'|'environment';
type CameraMedia = Pick<MediaDevices,'getUserMedia'>;

/** Release the old camera first (required on some phones), restore it on failure,
 * and close every stream that arrives after the caller cancels the request. */
export async function openCameraStream(media:CameraMedia,input:{facing:CameraFacing;previous:MediaStream|null;isCurrent:()=>boolean}){
 const {facing,previous,isCurrent}=input;
 const previousSettings=previous?.getVideoTracks()[0]?.getSettings();
 previous?.getTracks().forEach(track=>track.stop());
 const request=(video:MediaTrackConstraints)=>media.getUserMedia({audio:false,video:{width:{ideal:1280},height:{ideal:720},...video}});
 let next:MediaStream|null=null,restored=false;
 try{
  if(!isCurrent())return null;
  next=await request({facingMode:previous?{exact:facing}:{ideal:facing}});
  const settings=next.getVideoTracks()[0]?.getSettings();
  if(previous&&((settings?.facingMode&&settings.facingMode!==facing)||
   (previousSettings?.deviceId&&settings?.deviceId===previousSettings.deviceId)))
   throw new Error('The requested camera is unavailable.');
 }catch(error){
  next?.getTracks().forEach(track=>track.stop());next=null;
  if(!isCurrent())return null;
  if(!previous)throw error;
  restored=true;
  try{
   next=await request(previousSettings?.deviceId?{deviceId:{exact:previousSettings.deviceId}}:{facingMode:{ideal:previousSettings?.facingMode||'environment'}});
  }catch(restoreError){if(!isCurrent())return null;throw restoreError;}
 }
 if(!isCurrent()){next.getTracks().forEach(track=>track.stop());return null;}
 const actual=next.getVideoTracks()[0]?.getSettings().facingMode;
 const selected:CameraFacing=actual==='user'||actual==='environment'?actual:restored?(previousSettings?.facingMode==='user'?'user':'environment'):facing;
 return {stream:next,facing:selected,restored};
}
